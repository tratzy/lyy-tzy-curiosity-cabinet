import { describe, expect, it } from "vitest";

import { isValidUsername, usernameToEmail } from "@/lib/username";

describe("username login", () => {
  it("maps a username to the same synthetic email regardless of case", () => {
    expect(usernameToEmail("  LyyTzy ")).toBe(usernameToEmail("lyytzy"));
  });

  it("accepts 3-20 letters, numbers, dot or underscore", () => {
    expect(isValidUsername("lyy_tzy.01")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("nama dengan spasi")).toBe(false);
    expect(isValidUsername("a".repeat(21))).toBe(false);
  });
});
