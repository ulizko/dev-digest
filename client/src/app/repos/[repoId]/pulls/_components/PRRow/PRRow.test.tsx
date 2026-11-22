import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/prReview.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { PRRow } from "./PRRow";

afterEach(cleanup);

function pr(o: Partial<PrMeta>): PrMeta {
  return {
    number: 482,
    title: "Add rate limiting",
    author: "marisa.koch",
    branch: "feat/rate-limit",
    base: "main",
    head_sha: "sha",
    additions: 247,
    deletions: 38,
    files_count: 9,
    status: "reviewed",
    updated_at: new Date().toISOString(),
    score: 80,
    severity_counts: { critical: 0, warning: 0, suggestion: 0 },
    review_ids: ["rv1"],
    ...o,
  };
}

function renderRow(p: PrMeta) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <PRRow pr={p} repoId="repo-1" />
    </NextIntlClientProvider>,
  );
}

describe("PRRow — COST column", () => {
  it("shows the PR's summed run cost", () => {
    renderRow(pr({ cost_usd: 0.014 }));
    expect(screen.getByText("$0.014")).toBeInTheDocument();
  });

  it("shows — (not $0.00) when no run cost is known", () => {
    renderRow(pr({ cost_usd: null }));
    expect(screen.getAllByText("—")).toHaveLength(1);
  });
});

describe("PRRow — FINDINGS column", () => {
  it("shows a counter per non-empty severity of the latest review", () => {
    renderRow(pr({ severity_counts: { critical: 2, warning: 0, suggestion: 4 } }));
    expect(screen.getByRole("img", { name: "2 CRITICAL" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4 SUGGESTION" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /WARNING/ })).toBeNull();
  });

  it("shows 0 for a reviewed PR without findings", () => {
    renderRow(pr({ cost_usd: 0.01 }));
    expect(screen.queryByRole("img", { name: /CRITICAL|WARNING|SUGGESTION/ })).toBeNull();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows — for a PR that was never reviewed", () => {
    renderRow(pr({ score: null, severity_counts: null, review_ids: null, cost_usd: 0.01 }));
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
