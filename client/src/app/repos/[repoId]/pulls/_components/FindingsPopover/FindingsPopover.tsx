/* FindingsPopover — hover/focus preview of the findings behind a PR row's
   FINDINGS counters. Portaled to <body> because the list card clips overflow. */
"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Icon, SeverityBadge, CategoryTag, ConfidenceNum, type Category } from "@devdigest/ui";
import { usePrReviews } from "@/lib/hooks/reviews";
import { visibleFindings } from "../../[number]/_components/FindingsPanel/helpers";
import { lineLabel } from "../../[number]/_components/FindingCard/helpers";
import { s } from "./styles";

const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 120;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

export function FindingsPopover({
  prId,
  reviewIds,
  count,
  children,
}: {
  prId: string;
  reviewIds: string[];
  count: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("prReview");
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const refetched = React.useRef(false);

  const setOpenAfter = (next: boolean, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), ms);
  };
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const reviews = usePrReviews(open ? prId : null);
  const counted = (reviews.data ?? []).filter((r) => reviewIds.includes(r.id));
  const missing = !!reviews.data && counted.length < reviewIds.length;
  const findings = visibleFindings(counted.flatMap((r) => r.findings), false);

  React.useEffect(() => {
    if (!open) refetched.current = false;
    else if (missing && !reviews.isFetching && !refetched.current) {
      refetched.current = true;
      void reviews.refetch();
    }
  }, [open, missing, reviews]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    const onScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) hide();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  React.useLayoutEffect(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const popover = popoverRef.current;
    if (!open || !trigger || !popover) return setPos(null);
    const below = trigger.bottom + GAP;
    const fitsBelow = below + popover.offsetHeight <= window.innerHeight - VIEWPORT_MARGIN;
    setPos({
      top: fitsBelow ? below : Math.max(VIEWPORT_MARGIN, trigger.top - GAP - popover.offsetHeight),
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(trigger.left, window.innerWidth - popover.offsetWidth - VIEWPORT_MARGIN),
      ),
    });
  }, [open, reviews.data, reviews.isError]);

  let body: React.ReactNode;
  if (reviews.isError) body = <div style={s.state}>{t("list.findingsPopover.error")}</div>;
  else if (!reviews.data || (missing && reviews.isFetching))
    body = <div style={s.state}>{t("list.findingsPopover.loading")}</div>;
  else
    body = findings.map((f) => (
      <div key={f.id} style={s.item}>
        <div style={s.titleRow}>
          <SeverityBadge severity={f.severity} compact />
          <span style={s.title}>{f.title}</span>
          <CategoryTag category={f.category as Category} />
        </div>
        <div style={s.metaRow}>
          <span className="mono" style={s.file}>
            {f.file}:{lineLabel(f)}
          </span>
          <ConfidenceNum value={f.confidence} />
        </div>
        <div style={s.rationale}>{f.rationale}</div>
      </div>
    ));

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpenAfter(true, OPEN_DELAY_MS)}
        onMouseLeave={() => setOpenAfter(false, CLOSE_DELAY_MS)}
        onFocus={show}
        onBlur={hide}
        style={s.trigger}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            id={id}
            ref={popoverRef}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={() => setOpenAfter(false, CLOSE_DELAY_MS)}
            style={s.popover(pos)}
          >
            <div style={s.header}>
              <Icon.Info size={12} aria-hidden />
              {t("list.findingsPopover.title", { count })}
            </div>
            {body}
          </div>,
          document.body,
        )}
    </>
  );
}
