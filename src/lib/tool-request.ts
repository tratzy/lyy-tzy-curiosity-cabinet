// Pure helpers that turn a tool definition + user input into the upstream HTTP request.
// Shared by the server proxy (/api/run) and tests.

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const BODY_TYPES = ["json", "form", "query"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const RESPONSE_TYPES = ["auto", "json", "image", "video", "audio", "text"] as const;
export type ResponseType = (typeof RESPONSE_TYPES)[number];

export const PARAM_TYPES = ["text", "textarea", "number", "url", "select"] as const;
export type ParamType = (typeof PARAM_TYPES)[number];

export type ToolParam = {
  key: string;
  label: string;
  type: ParamType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  default?: string;
};

export type RequestableTool = {
  method: string;
  endpoint: string | null;
  body_type: string;
};

const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

export function endpointPlaceholders(endpoint: string): string[] {
  return Array.from(endpoint.matchAll(PLACEHOLDER), (m) => m[1] ?? "").filter(Boolean);
}

export function buildUpstreamRequest(
  tool: RequestableTool,
  values: Record<string, string>,
  secretHeaders: Record<string, string> = {},
): { url: string; init: RequestInit } {
  if (!tool.endpoint) throw new Error("Tool ini belum punya endpoint");

  const used = new Set<string>();
  const substituted = tool.endpoint.replace(PLACEHOLDER, (_m, key: string) => {
    used.add(key);
    return encodeURIComponent(values[key] ?? "");
  });

  const url = new URL(substituted);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Endpoint harus http atau https");
  }

  const rest = Object.entries(values).filter(
    ([key, value]) => !used.has(key) && value !== undefined && value !== "",
  );

  const method = (tool.method || "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "*/*" };
  const init: RequestInit = { method, headers, redirect: "follow" };

  const sendAsQuery = method === "GET" || method === "DELETE" || tool.body_type === "query";
  if (sendAsQuery) {
    for (const [key, value] of rest) url.searchParams.set(key, value);
  } else if (tool.body_type === "form") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(rest).toString();
  } else {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(Object.fromEntries(rest));
  }

  for (const [key, value] of Object.entries(secretHeaders)) {
    if (key.trim()) headers[key.trim()] = value;
  }

  return { url: url.toString(), init };
}

const MEDIA_URL =
  /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|mp3|wav|ogg|m4a)(\?\S*)?$/i;

export type MediaKind = "image" | "video" | "audio";

export function mediaKindFromUrl(url: string): MediaKind | null {
  const match = url.match(MEDIA_URL);
  if (!match) return null;
  const ext = (match[1] ?? "").toLowerCase();
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
  return "image";
}

/** Finds media links anywhere inside a JSON response so they can be previewed. */
export function findMediaUrls(data: unknown, limit = 8): { url: string; kind: MediaKind }[] {
  const found: { url: string; kind: MediaKind }[] = [];
  const seen = new Set<string>();
  const walk = (value: unknown, depth: number) => {
    if (found.length >= limit || depth > 8) return;
    if (typeof value === "string") {
      const kind = mediaKindFromUrl(value.trim());
      if (kind && !seen.has(value)) {
        seen.add(value);
        found.push({ url: value.trim(), kind });
      }
    } else if (Array.isArray(value)) {
      value.forEach((v) => walk(v, depth + 1));
    } else if (value && typeof value === "object") {
      Object.values(value).forEach((v) => walk(v, depth + 1));
    }
  };
  walk(data, 0);
  return found;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
