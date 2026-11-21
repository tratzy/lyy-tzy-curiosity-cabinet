import { describe, expect, it } from "vitest";

import { GRID_PAGE_SIZE, pageCountFor, paginate } from "@/lib/pagination";

const list = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("pagination", () => {
  it("fills a 3x3 page with nine tools", () => {
    expect(GRID_PAGE_SIZE).toBe(9);
    expect(paginate(list(20), 0).items).toHaveLength(9);
  });

  it("puts the remainder on the last page", () => {
    const last = paginate(list(20), 2);
    expect(last.items).toEqual([18, 19]);
    expect(last.pageCount).toBe(3);
  });

  it("clamps an out-of-range page", () => {
    expect(paginate(list(5), 7).page).toBe(0);
    expect(paginate(list(20), -3).page).toBe(0);
    expect(paginate(list(20), 99).page).toBe(2);
  });

  it("always reports at least one page", () => {
    expect(pageCountFor(0)).toBe(1);
    expect(paginate([], 0).items).toEqual([]);
  });
});
