/* PRRow — one clickable row in the PR list table. Ported from screen_dashboard.jsx. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, Avatar, Badge, CircularScore, SeverityCount } from "@devdigest/ui";
import type { SeverityCounts } from "@devdigest/shared";
import type { PrMeta } from "@/lib/types";
import { SEVERITY_COUNT_KEYS, SIZE_COLOR, STATUS_META } from "../../constants";
import { relativeTime, sizeOf } from "../../helpers";
import { formatCost } from "@/lib/format-cost";
import { FindingsPopover } from "../FindingsPopover";
import { s } from "../../styles";

function FindingsCounts({ pr }: { pr: PrMeta }) {
  const counts: SeverityCounts | null | undefined = pr.severity_counts;
  if (!counts) return <span style={s.muted}>—</span>;
  const present = SEVERITY_COUNT_KEYS.filter(([, key]) => counts[key] > 0);
  if (present.length === 0) return <span style={s.muted}>0</span>;
  const badges = present.map(([sev, key]) => <SeverityCount key={sev} severity={sev} count={counts[key]} />);
  if (!pr.id || !pr.review_ids) return <>{badges}</>;
  return (
    <FindingsPopover
      prId={pr.id}
      reviewIds={pr.review_ids}
      count={present.reduce((sum, [, key]) => sum + counts[key], 0)}
    >
      {badges}
    </FindingsPopover>
  );
}

export function PRRow({ pr, repoId }: { pr: PrMeta; repoId: string }) {
  const t = useTranslations("prReview");
  const router = useRouter();
  const [h, setH] = React.useState(false);
  const st = STATUS_META[pr.status] ?? STATUS_META.needs_review!;
  const { size, lines } = sizeOf(pr);
  const reviewed = pr.score != null; // null score ⇒ PR has never been reviewed
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={() => router.push(`/repos/${repoId}/pulls/${pr.number}`)}
      style={s.row(h)}
    >
      <div style={s.rowTitleCell}>
        <Icon.GitPullRequest size={15} style={s.rowIcon(st.c)} />
        <div style={s.rowTitleWrap}>
          <div style={s.rowTitle(h)}>{pr.title}</div>
          <span className="mono" style={s.rowNumber}>
            #{pr.number}
          </span>
        </div>
      </div>
      <div style={s.authorCell}>
        <Avatar name={pr.author} size={18} />
        {pr.author}
      </div>
      <div>
        <Badge
          color={SIZE_COLOR[size]}
          bg="transparent"
          style={s.sizeBadgeBorder(SIZE_COLOR[size]!)}
        >
          {size} · {lines}
        </Badge>
      </div>
      <div style={s.scoreCell}>
        {reviewed ? (
          <CircularScore score={pr.score!} size={34} stroke={3} />
        ) : (
          <span style={s.muted}>—</span>
        )}
      </div>
      <div style={s.findingsCell}>
        <FindingsCounts pr={pr} />
      </div>
      <div>
        <Badge dot color={st.c} bg="transparent">
          {t(`list.status.${st.labelKey}`)}
        </Badge>
      </div>
      <div className="mono" style={s.muted}>
        {formatCost(pr.cost_usd)}
      </div>
      <div style={s.updatedCell}>{relativeTime(pr.updated_at)}</div>
    </div>
  );
}
