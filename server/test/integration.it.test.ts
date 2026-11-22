import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { startPg, dockerAvailable, type PgFixture } from './helpers/pg.js';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { seed } from '../src/db/seed.js';
import * as t from '../src/db/schema.js';
import { MockGitClient, MockGitHubClient } from '../src/adapters/mocks.js';

const pr = (number: number) => ({
  number,
  title: `PR ${number}`,
  author: 'a',
  branch: `b${number}`,
  base: 'main',
  head_sha: `sha${number}`,
  additions: 1,
  deletions: 0,
  files_count: 1,
  status: 'open' as const,
});

const hasDocker = await dockerAvailable();
const d = hasDocker ? describe : describe.skip;

if (!hasDocker) {
  // eslint-disable-next-line no-console
  console.warn(
    '[integration] Docker not available — skipping Testcontainers integration tests.',
  );
}

d('Testcontainers: pg + pgvector', () => {
  let pg: PgFixture;

  beforeAll(async () => {
    pg = await startPg();
  });
  afterAll(async () => {
    await pg?.stop();
  });

  it('migrations applied: every table exists', async () => {
    const rows = await pg.handle.sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM information_schema.tables
      WHERE table_schema = 'public'`;
    // 35 domain tables + drizzle migration bookkeeping
    expect(rows[0]!.count).toBeGreaterThanOrEqual(35);
  });

  it('pgvector extension is enabled', async () => {
    const rows = await pg.handle.sql<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'`;
    expect(rows).toHaveLength(1);
  });

  it('vector insert + similarity query round-trips', async () => {
    const { db } = pg.handle;
    const { workspaceId } = await seed(db);
    const [repo] = await db
      .insert(t.repos)
      .values({ workspaceId, owner: 'v', name: 'vec', fullName: 'v/vec' })
      .returning();
    const vec = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));
    await db.insert(t.codeChunks).values({
      workspaceId,
      repoId: repo!.id,
      path: 'a.ts',
      content: 'hello',
      embedding: vec,
      source: 'code',
    });
    // cosine distance query against the same vector → distance ~0
    const literal = `[${vec.join(',')}]`;
    const rows = await pg.handle.sql<{ dist: number }[]>`
      SELECT embedding <=> ${literal}::vector AS dist
      FROM code_chunks WHERE repo_id = ${repo!.id}`;
    expect(rows[0]!.dist).toBeLessThan(0.0001);
  });

  it('seed is idempotent (re-run does not duplicate workspace)', async () => {
    await seed(pg.handle.db);
    await seed(pg.handle.db);
    const ws = await pg.handle.db.select().from(t.workspaces);
    expect(ws.filter((w) => w.name === 'default')).toHaveLength(1);
  });
});

d('Testcontainers: DB-backed routes via app.inject', () => {
  let pg: PgFixture;

  beforeAll(async () => {
    pg = await startPg();
    await seed(pg.handle.db);
  });
  afterAll(async () => {
    await pg?.stop();
  });

  it('POST /repos persists + enqueues a clone (mock git) and GET /repos lists it', async () => {
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    const git = new MockGitClient();
    const app = await buildApp({
      config,
      db: pg.handle.db,
      overrides: { git, github: new MockGitHubClient() },
    });

    const create = await app.inject({
      method: 'POST',
      url: '/repos',
      payload: { url: 'https://github.com/acme/widgets' },
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().full_name).toBe('acme/widgets');

    await app.container.jobs.onIdle();
    expect(git.cloned.some((c) => c.repo.name === 'widgets')).toBe(true);

    const list = await app.inject({ method: 'GET', url: '/repos' });
    expect(list.json().some((r: { full_name: string }) => r.full_name === 'acme/widgets')).toBe(
      true,
    );
    await app.close();
  });

  it('GET /repos/:id/pulls imports PRs (mock GitHub) idempotently', async () => {
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    const app = await buildApp({
      config,
      db: pg.handle.db,
      overrides: { git: new MockGitClient(), github: new MockGitHubClient() },
    });
    const repos = await app.inject({ method: 'GET', url: '/repos' });
    const repoId = repos.json()[0]!.id;

    const first = await app.inject({ method: 'GET', url: `/repos/${repoId}/pulls` });
    expect(first.statusCode).toBe(200);
    expect(first.json().length).toBeGreaterThan(0);
    // import again → still idempotent (unique repo_id+number)
    const second = await app.inject({ method: 'GET', url: `/repos/${repoId}/pulls` });
    expect(second.json().length).toBe(first.json().length);
    await app.close();
  });

  it('PR list: cost_usd = sum of run costs, null when none known', async () => {
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    const app = await buildApp({
      config,
      db: pg.handle.db,
      overrides: {
        git: new MockGitClient(),
        github: new MockGitHubClient({ pulls: [pr(901), pr(902)] }),
      },
    });
    const repoId = (await app.inject({ method: 'GET', url: '/repos' })).json()[0]!.id;
    const imported = (await app.inject({ method: 'GET', url: `/repos/${repoId}/pulls` })).json();
    const paid = imported.find((p: { number: number }) => p.number === 901)!;
    const unpaid = imported.find((p: { number: number }) => p.number === 902)!;
    const [{ workspaceId }] = await pg.handle.db
      .select({ workspaceId: t.pullRequests.workspaceId })
      .from(t.pullRequests)
      .where(eq(t.pullRequests.id, paid.id));

    await pg.handle.db.insert(t.agentRuns).values([
      { workspaceId, prId: paid.id, status: 'done', costUsd: 0.001 },
      { workspaceId, prId: paid.id, status: 'done', costUsd: 0.0023 },
      { workspaceId, prId: paid.id, status: 'failed', costUsd: null },
      { workspaceId, prId: unpaid.id, status: 'failed', costUsd: null },
    ]);

    const list = (await app.inject({ method: 'GET', url: `/repos/${repoId}/pulls` })).json();
    const paidRow = list.find((p: { number: number }) => p.number === 901)!;
    const unpaidRow = list.find((p: { number: number }) => p.number === 902)!;
    expect(typeof paidRow.cost_usd).toBe('number');
    expect(paidRow.cost_usd).toBeCloseTo(0.0033, 10);
    expect(unpaidRow.cost_usd).toBeNull();
    await app.close();
  });

  it('PR list: severity_counts + latest_review_id from the latest review only', async () => {
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    const app = await buildApp({
      config,
      db: pg.handle.db,
      overrides: {
        git: new MockGitClient(),
        github: new MockGitHubClient({ pulls: [pr(911), pr(912), pr(913)] }),
      },
    });
    const repoId = (await app.inject({ method: 'GET', url: '/repos' })).json()[0]!.id;
    const imported = (await app.inject({ method: 'GET', url: `/repos/${repoId}/pulls` })).json();
    const byNumber = (rows: { number: number }[], n: number) => rows.find((p) => p.number === n)!;
    const reviewed = byNumber(imported, 911) as { id: string };
    const clean = byNumber(imported, 912) as { id: string };
    const [{ workspaceId }] = await pg.handle.db
      .select({ workspaceId: t.pullRequests.workspaceId })
      .from(t.pullRequests)
      .where(eq(t.pullRequests.id, reviewed.id));

    const at = (iso: string) => new Date(iso);
    const [older, latest] = await pg.handle.db
      .insert(t.reviews)
      .values([
        { workspaceId, prId: reviewed.id, kind: 'review', createdAt: at('2026-01-01T00:00:00Z') },
        { workspaceId, prId: reviewed.id, kind: 'review', createdAt: at('2026-01-02T00:00:00Z') },
        { workspaceId, prId: reviewed.id, kind: 'summary', createdAt: at('2026-01-03T00:00:00Z') },
        { workspaceId, prId: clean.id, kind: 'review', createdAt: at('2026-01-02T00:00:00Z') },
      ])
      .returning();
    const finding = (reviewId: string, severity: string, extra: Partial<typeof t.findings.$inferInsert> = {}) => ({
      reviewId,
      severity,
      file: 'a.ts',
      startLine: 1,
      endLine: 1,
      category: 'bug',
      title: 'x',
      rationale: 'y',
      confidence: 0.9,
      ...extra,
    });
    await pg.handle.db.insert(t.findings).values([
      finding(older!.id, 'CRITICAL'),
      finding(older!.id, 'CRITICAL'),
      finding(latest!.id, 'CRITICAL', { kind: 'secret_leak' }),
      finding(latest!.id, 'WARNING', { dismissedAt: new Date() }),
      finding(latest!.id, 'WARNING'),
    ]);

    const list = (await app.inject({ method: 'GET', url: `/repos/${repoId}/pulls` })).json();
    const reviewedRow = byNumber(list, 911) as Record<string, unknown>;
    expect(reviewedRow.severity_counts).toEqual({ critical: 1, warning: 2, suggestion: 0 });
    expect(reviewedRow.latest_review_id).toBe(latest!.id);
    expect(byNumber(list, 912)).toMatchObject({
      severity_counts: { critical: 0, warning: 0, suggestion: 0 },
    });
    expect(byNumber(list, 913)).toMatchObject({ severity_counts: null, latest_review_id: null });
    await app.close();
  });

  it('POST /repos/:id/poll syncs PR list and does NOT trigger a review', async () => {
    const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    const app = await buildApp({
      config,
      db: pg.handle.db,
      overrides: { git: new MockGitClient(), github: new MockGitHubClient() },
    });
    const repoId = (await app.inject({ method: 'GET', url: '/repos' })).json()[0]!.id;
    const poll = await app.inject({ method: 'POST', url: `/repos/${repoId}/poll` });
    expect(poll.json().reviewTriggered).toBe(false);
    expect(poll.json().synced).toBeGreaterThan(0);
    await app.close();
  });
});
