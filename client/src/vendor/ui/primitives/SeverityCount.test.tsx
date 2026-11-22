import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SeverityCount } from "./Badge";

afterEach(cleanup);

describe("SeverityCount", () => {
  it("renders a non-interactive span labelled with count + severity", () => {
    render(<SeverityCount severity="CRITICAL" count={3} />);
    const el = screen.getByRole("img", { name: "3 CRITICAL" });
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveAttribute("title", "3 CRITICAL");
    expect(el.textContent).toBe("3");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a toggle button when clickable", () => {
    const onClick = vi.fn();
    render(<SeverityCount severity="WARNING" count={0} active onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "0 WARNING" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
