import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord, ReviewRecord } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/prReview.json";

const usePrReviews = vi.fn();
vi.mock("@/lib/hooks/reviews", () => ({ usePrReviews: (prId: string | null) => usePrReviews(prId) }));

import { FindingsPopover } from "./FindingsPopover";

const finding = (id: string, severity: FindingRecord["severity"], review_id: string): FindingRecord => ({
  id,
  severity,
  category: "security",
  title: `${severity} ${id}`,
  file: "src/config.ts",
  start_line: 12,
  end_line: 14,
  rationale: `why ${id}`,
  suggestion: null,
  confidence: 0.98,
  kind: "finding",
  trifecta_components: null,
  evidence: null,
  review_id,
  accepted_at: null,
  dismissed_at: null,
});

const review = (id: string, findings: FindingRecord[]) => ({ id, findings }) as unknown as ReviewRecord;

const REVIEWS = [
  review("rv1", [finding("s1", "SUGGESTION", "rv1"), finding("c1", "CRITICAL", "rv1")]),
  review("rv2", [finding("w1", "WARNING", "rv2")]),
  review("old", [finding("x1", "CRITICAL", "old")]),
];

function renderPopover() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <FindingsPopover prId="pr1" reviewIds={["rv1", "rv2"]} count={3}>
        <span>counts</span>
      </FindingsPopover>
    </NextIntlClientProvider>,
  );
}

const trigger = () => screen.getByText("counts").parentElement!;

beforeEach(() => {
  usePrReviews.mockReturnValue({ data: REVIEWS, isError: false, isFetching: false, refetch: vi.fn() });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  usePrReviews.mockReset();
});

describe("FindingsPopover", () => {
  it("does not fetch until opened", () => {
    renderPopover();
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(usePrReviews).toHaveBeenLastCalledWith(null);
  });

  it("opens on focus with the findings of the counted reviews only, sorted by severity", () => {
    renderPopover();
    fireEvent.focus(trigger());

    const tooltip = screen.getByRole("tooltip");
    expect(trigger()).toHaveAttribute("aria-describedby", tooltip.id);
    expect(usePrReviews).toHaveBeenLastCalledWith("pr1");
    expect(tooltip).toHaveTextContent("3 findings");
    const titles = screen.getAllByText(/^(CRITICAL|WARNING|SUGGESTION) \w+$/).map((el) => el.textContent);
    expect(titles).toEqual(["CRITICAL c1", "WARNING w1", "SUGGESTION s1"]);
    expect(screen.queryByText("CRITICAL x1")).toBeNull();
    expect(tooltip).toHaveTextContent("src/config.ts:12-14");
    expect(tooltip).toHaveTextContent("98% conf");
    expect(tooltip).toHaveTextContent("why c1");
  });

  it("closes on Escape and on blur", () => {
    renderPopover();
    fireEvent.focus(trigger());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.focus(trigger());
    fireEvent.blur(trigger());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("stays open while its own list scrolls, closes when the page scrolls", () => {
    renderPopover();
    fireEvent.focus(trigger());
    fireEvent.scroll(screen.getByRole("tooltip"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.scroll(document);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on hover only after a short delay", () => {
    vi.useFakeTimers();
    renderPopover();
    fireEvent.mouseEnter(trigger());
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("shows loading, then refetches once when a counted review is missing from the cache", () => {
    const refetch = vi.fn();
    usePrReviews.mockReturnValue({ data: undefined, isError: false, isFetching: true, refetch });
    const { rerender } = renderPopover();
    fireEvent.focus(trigger());
    expect(screen.getByRole("tooltip")).toHaveTextContent("Loading findings…");

    usePrReviews.mockReturnValue({ data: [REVIEWS[0]], isError: false, isFetching: false, refetch });
    rerender(
      <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
        <FindingsPopover prId="pr1" reviewIds={["rv1", "rv2"]} count={3}>
          <span>counts</span>
        </FindingsPopover>
      </NextIntlClientProvider>,
    );
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows an error when the reviews fail to load", () => {
    usePrReviews.mockReturnValue({ data: undefined, isError: true, isFetching: false, refetch: vi.fn() });
    renderPopover();
    fireEvent.focus(trigger());
    expect(screen.getByRole("tooltip")).toHaveTextContent("Couldn’t load findings");
  });
});
