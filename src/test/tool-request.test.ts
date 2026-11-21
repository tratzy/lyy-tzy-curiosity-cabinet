import { describe, expect, it } from "vitest";

import { buildUpstreamRequest, findMediaUrls } from "@/lib/tool-request";

describe("buildUpstreamRequest", () => {
  it("fills {placeholders} in the endpoint path and does not repeat them in the query", () => {
    const { url } = buildUpstreamRequest(
      { method: "GET", endpoint: "https://ipwho.is/{ip}", body_type: "json" },
      { ip: "8.8.8.8" },
    );
    expect(url).toBe("https://ipwho.is/8.8.8.8");
  });

  it("sends GET inputs as query parameters, keeping existing ones", () => {
    const { url, init } = buildUpstreamRequest(
      {
        method: "GET",
        endpoint: "https://api.example.com/brat?isAnimated=true",
        body_type: "json",
      },
      { text: "halo dunia" },
    );
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(new URL(url).searchParams.get("isAnimated")).toBe("true");
    expect(new URL(url).searchParams.get("text")).toBe("halo dunia");
  });

  it("sends POST inputs as a JSON body", () => {
    const { url, init } = buildUpstreamRequest(
      { method: "POST", endpoint: "https://api.example.com/run", body_type: "json" },
      { prompt: "hai", empty: "" },
    );
    expect(url).toBe("https://api.example.com/run");
    expect(init.body).toBe(JSON.stringify({ prompt: "hai" }));
  });

  it("sends POST inputs as form data when the tool uses form body", () => {
    const { init } = buildUpstreamRequest(
      { method: "POST", endpoint: "https://api.example.com/run", body_type: "form" },
      { a: "1", b: "x y" },
    );
    expect(init.body).toBe("a=1&b=x+y");
  });

  it("adds secret headers from the admin panel", () => {
    const { init } = buildUpstreamRequest(
      { method: "GET", endpoint: "https://api.example.com", body_type: "json" },
      {},
      { "x-api-key": "secret" },
    );
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("secret");
  });

  it("encodes placeholder values so they cannot change the host", () => {
    const { url } = buildUpstreamRequest(
      { method: "GET", endpoint: "https://api.example.com/{q}", body_type: "json" },
      { q: "../evil.com/x" },
    );
    expect(new URL(url).host).toBe("api.example.com");
  });

  it("rejects non-http endpoints", () => {
    expect(() =>
      buildUpstreamRequest(
        { method: "GET", endpoint: "file:///etc/passwd", body_type: "json" },
        {},
      ),
    ).toThrow();
  });
});

describe("findMediaUrls", () => {
  it("finds image and video links inside nested JSON", () => {
    const media = findMediaUrls({
      data: { result: "https://cdn.x.com/a.png", list: ["https://cdn.x.com/b.mp4"] },
    });
    expect(media).toEqual([
      { url: "https://cdn.x.com/a.png", kind: "image" },
      { url: "https://cdn.x.com/b.mp4", kind: "video" },
    ]);
  });
});
