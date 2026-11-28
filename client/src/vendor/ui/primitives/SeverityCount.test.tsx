import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SeverityCount } from "./Badge";

afterEach(cleanup);

describe("SeverityCount", () => {
  it("renders a non-interactive span named by the caller's label", () => {
    render(<SeverityCount severity="CRITICAL" count={3} label="3 CRITICAL" />);
    const el = screen.getByRole("img", { name: "3 CRITICAL" });
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveAttribute("title", "3 CRITICAL");
    expect(el.textContent).toBe("3");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a toggle button when clickable", () => {
    const onClick = vi.fn();
    render(<SeverityCount severity="WARNING" count={0} label="0 WARNING" active onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "0 WARNING" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("fades out when dimmed", () => {
    render(<SeverityCount severity="SUGGESTION" count={1} label="1 SUGGESTION" dimmed onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "1 SUGGESTION" })).toHaveStyle({ opacity: "0.4" });
  });
});
