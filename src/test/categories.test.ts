import { describe, expect, it } from "vitest";

import { categoriesOf, toolsInCategory, type Tool } from "@/lib/tools-data";

const tool = (over: Partial<Tool>): Tool => ({ id: Math.random().toString(), parent_id: null, category: "Maker", ...over }) as Tool;

const tools = [
  tool({ id: "g", category: "Maker" }),
  tool({ category: "Utility" }),
  tool({ category: "Maker" }),
  tool({ category: "Maker", parent_id: "g" }), // child of a group: not listed separately
  tool({ category: " " }),
];

describe("menu categories", () => {
  it("lists each top-level category once with its tool count", () => {
    expect(categoriesOf(tools)).toEqual([
      { name: "Maker", count: 2 },
      { name: "Utility", count: 1 },
      { name: "Lainnya", count: 1 },
    ]);
  });

  it("returns only top-level tools of the chosen category", () => {
    expect(toolsInCategory(tools, "Maker")).toHaveLength(2);
    expect(toolsInCategory(tools, "Lainnya")).toHaveLength(1);
  });
});
