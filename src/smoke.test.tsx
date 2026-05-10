import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

describe("environment smoke test", () => {
  it("vitest works correctly", () => {
    expect(1 + 1).toBe(2);
  });

  it("react-testing-library and jsdom work", () => {
    const { container } = render(<div>hello</div>);
    expect(container.textContent).toBe("hello");
  });
});
