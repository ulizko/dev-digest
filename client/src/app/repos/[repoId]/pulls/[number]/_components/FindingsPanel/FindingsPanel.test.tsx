import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { FindingRecord } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";

vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useFindingAction: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { FindingsPanel } from "./FindingsPanel";

afterEach(cleanup);

const FINDINGS: FindingRecord[] = [
  {
    id: "f1",
    severity: "CRITICAL",
    category: "security",
    title: "Hardcoded secret",
    file: "src/config.ts",
    start_line: 11,
    end_line: 11,
    rationale: "A secret is committed.",
    suggestion: null,
    confidence: 0.95,
    kind: "finding",
    trifecta_components: null,
    evidence: null,
    review_id: "r1",
    accepted_at: null,
    dismissed_at: null,
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FindingsPanel (smoke)", () => {
  it("renders the toolbar + a finding card", () => {
    renderWithIntl(<FindingsPanel findings={FINDINGS} prId="pr1" />);
    expect(screen.getByText("Hide low confidence")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded secret")).toBeInTheDocument();
  });

  it("shows the empty state when nothing matches", () => {
    renderWithIntl(<FindingsPanel findings={[]} prId="pr1" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });
});

describe("FindingsPanel severity filter", () => {
  const finding = (id: string, severity: FindingRecord["severity"], confidence = 0.9): FindingRecord => ({
    ...FINDINGS[0]!,
    id,
    severity,
    confidence,
    title: `${severity} ${id}`,
  });
  const MIXED = [
    finding("c1", "CRITICAL"),
    finding("w1", "WARNING"),
    finding("w2", "WARNING"),
    finding("w3", "WARNING", 0.3),
    finding("s1", "SUGGESTION"),
  ];
  const titles = () => screen.getAllByText(/^(CRITICAL|WARNING|SUGGESTION) \w+$/).map((el) => el.textContent);

  it("shows a counter per severity, including empty levels", () => {
    renderWithIntl(<FindingsPanel findings={[finding("w1", "WARNING")]} prId="pr1" />);
    const group = screen.getByRole("group", { name: "Filter by severity" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 CRITICAL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 WARNING" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 SUGGESTION" })).toBeInTheDocument();
  });

  it("filters the list to the clicked level and clears it on a second click", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    const warning = screen.getByRole("button", { name: "3 WARNING" });

    fireEvent.click(warning);
    expect(warning).toHaveAttribute("aria-pressed", "true");
    expect(titles()).toEqual(["WARNING w1", "WARNING w2", "WARNING w3"]);

    fireEvent.click(warning);
    expect(warning).toHaveAttribute("aria-pressed", "false");
    expect(titles()).toHaveLength(5);
  });

  it("clears the filter with Show all", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    expect(screen.queryByRole("button", { name: "Show all" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1 CRITICAL" }));
    expect(titles()).toEqual(["CRITICAL c1"]);

    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(titles()).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Show all" })).not.toBeInTheDocument();
  });

  it("keeps counters in sync with the list when low confidence is hidden", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("button", { name: "2 WARNING" })).toBeInTheDocument();
    expect(titles()).toHaveLength(4);
  });

  it("keeps only findings that pass both the severity filter and Hide low confidence", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "2 WARNING" }));
    expect(titles()).toEqual(["WARNING w1", "WARNING w2"]);
  });

  it("highlights only the active level, dims the others, and moves the highlight on another click", () => {
    renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    const critical = screen.getByRole("button", { name: "1 CRITICAL" });
    const warning = screen.getByRole("button", { name: "3 WARNING" });
    const suggestion = screen.getByRole("button", { name: "1 SUGGESTION" });

    fireEvent.click(warning);
    fireEvent.click(critical);
    expect(critical).toHaveAttribute("aria-pressed", "true");
    expect(warning).toHaveAttribute("aria-pressed", "false");
    expect(critical).toHaveStyle({ opacity: "1" });
    expect(warning).toHaveStyle({ opacity: "0.4" });
    expect(suggestion).toHaveStyle({ opacity: "0.4" });
    expect(titles()).toEqual(["CRITICAL c1"]);

    fireEvent.click(critical);
    for (const btn of [critical, warning, suggestion]) {
      expect(btn).toHaveAttribute("aria-pressed", "false");
      expect(btn).toHaveStyle({ opacity: "1" });
    }
  });

  it("shows the existing empty state when the filtered level has no findings", () => {
    renderWithIntl(<FindingsPanel findings={[finding("c1", "CRITICAL")]} prId="pr1" />);
    fireEvent.click(screen.getByRole("button", { name: "0 SUGGESTION" }));
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });

  it("keeps counters matching the list when findings are refetched after accept/dismiss", () => {
    const { rerender } = renderWithIntl(<FindingsPanel findings={MIXED} prId="pr1" />);
    fireEvent.click(screen.getByRole("button", { name: "3 WARNING" }));

    const refetched = MIXED.filter((f) => f.id !== "w2").map((f) =>
      f.id === "w1" ? { ...f, dismissed_at: "2026-11-22T00:00:00Z" } : f,
    );
    rerender(
      <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
        <FindingsPanel findings={refetched} prId="pr1" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: "2 WARNING" })).toHaveAttribute("aria-pressed", "true");
    expect(titles()).toEqual(["WARNING w1", "WARNING w3"]);
  });
});
