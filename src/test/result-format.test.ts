import { describe, expect, it } from "vitest";

import { primaryTextKey, toPlainText, unwrapPayload, withoutMeta } from "@/lib/result-format";

describe("unwrapPayload", () => {
  it("peels a { status, creator, result } envelope down to the answer", () => {
    expect(unwrapPayload({ status: true, creator: "x", result: { text: "halo" } })).toEqual({
      text: "halo",
    });
  });

  it("peels single-key wrappers like { slip: { … } }", () => {
    expect(unwrapPayload({ slip: { id: 3, advice: "Minum air" } })).toEqual({
      id: 3,
      advice: "Minum air",
    });
  });

  it("keeps objects that have real fields next to data", () => {
    const data = { name: "Rizky", data: [1, 2] };
    expect(unwrapPayload(data)).toBe(data);
  });
});

describe("result display", () => {
  it("picks the main text field", () => {
    expect(primaryTextKey({ fact: "Kucing tidur 16 jam", length: 19 })).toBe("fact");
  });

  it("hides API envelope fields", () => {
    expect(withoutMeta({ success: true, ip: "8.8.8.8" })).toEqual({ ip: "8.8.8.8" });
  });

  it("copies results as readable text, never JSON", () => {
    const text = toPlainText({ name: "Rizky", age: 34, is_eu: false });
    expect(text).toBe("Nama: Rizky\nUmur: 34\nUni Eropa: Tidak");
    expect(text).not.toContain("{");
  });
});
