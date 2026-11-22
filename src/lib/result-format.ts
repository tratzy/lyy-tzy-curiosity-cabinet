// Pure helpers that turn whatever a tool returns into something people can read:
// strip API envelopes, find the main text, label fields in plain words, and copy as plain text.

import { mediaKindFromUrl, type MediaKind } from "@/lib/tool-request";

/** Envelope fields that describe the API call rather than the answer. */
const META_KEYS = new Set([
  "status",
  "success",
  "code",
  "statuscode",
  "status_code",
  "ok",
  "creator",
  "author",
  "owner",
  "developer",
  "dev",
  "api",
  "version",
  "timestamp",
  "took",
  "time",
  "responsetime",
  "response_time",
  "license",
  "sourceurls",
  "source_urls",
]);

const PAYLOAD_KEYS = ["result", "results", "data", "response", "output", "answer", "payload"];

/** Field names whose string value is the "main answer" of a tool. */
const PRIMARY_KEYS = [
  "translated",
  "translation",
  "translatedtext",
  "translated_text",
  "result",
  "text",
  "fact",
  "advice",
  "answer",
  "message",
  "content",
  "quote",
  "joke",
  "reply",
  "summary",
  "description",
];

export type PlainObject = Record<string, unknown>;

export function isPlainObject(v: unknown): v is PlainObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const isMetaKey = (key: string) => META_KEYS.has(key.toLowerCase());

/** Peels off `{ status, creator, result: … }` style wrappers and single-key objects. */
export function unwrapPayload(data: unknown): unknown {
  let current = data;
  for (let depth = 0; depth < 4; depth++) {
    if (!isPlainObject(current)) break;
    const keys = Object.keys(current);
    const payloadKey = keys.find(
      (k) => PAYLOAD_KEYS.includes(k.toLowerCase()) && current !== null && (current as PlainObject)[k] != null,
    );
    if (payloadKey) {
      const others = keys.filter((k) => k !== payloadKey);
      const onlyMeta = others.every((k) => isMetaKey(k) || k.toLowerCase() === "message");
      if (onlyMeta) {
        current = (current as PlainObject)[payloadKey];
        continue;
      }
    }
    const meaningful = keys.filter((k) => !isMetaKey(k));
    if (meaningful.length === 1 && keys.length >= 1) {
      const only = (current as PlainObject)[meaningful[0] as string];
      if (only !== null && typeof only === "object") {
        current = only;
        continue;
      }
    }
    break;
  }
  return current;
}

/** Drops envelope fields when there is something else to show. */
export function withoutMeta(obj: PlainObject): PlainObject {
  const entries = Object.entries(obj).filter(([, v]) => !isEmpty(v));
  const kept = entries.filter(([k]) => !isMetaKey(k));
  return Object.fromEntries(kept.length > 0 ? kept : entries);
}

export function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmpty);
  if (isPlainObject(v)) return Object.values(v).every(isEmpty);
  return false;
}

/** The field holding the main text answer, if any. */
export function primaryTextKey(obj: PlainObject): string | null {
  const keys = Object.keys(obj);
  for (const wanted of PRIMARY_KEYS) {
    const key = keys.find((k) => k.toLowerCase() === wanted);
    const value = key ? obj[key] : undefined;
    if (key && typeof value === "string" && value.trim() && !isUrl(value)) return key;
  }
  const fuzzy = keys.find((k) => /translat/i.test(k) && typeof obj[k] === "string");
  return fuzzy ?? null;
}

const LABELS: Record<string, string> = {
  name: "Nama",
  age: "Umur",
  count: "Jumlah data",
  total: "Total",
  country: "Negara",
  country_code: "Kode negara",
  city: "Kota",
  region: "Wilayah",
  continent: "Benua",
  postal: "Kode pos",
  capital: "Ibu kota",
  latitude: "Lintang",
  longitude: "Bujur",
  timezone: "Zona waktu",
  ip: "Alamat IP",
  type: "Tipe",
  text: "Teks",
  translated: "Terjemahan",
  translation: "Terjemahan",
  translatedtext: "Terjemahan",
  language: "Bahasa",
  lang: "Bahasa",
  source: "Sumber",
  target: "Tujuan",
  from: "Dari",
  to: "Ke",
  fact: "Fakta",
  length: "Panjang",
  advice: "Saran",
  word: "Kata",
  phonetic: "Pelafalan",
  phonetics: "Pelafalan",
  meanings: "Arti",
  definitions: "Definisi",
  definition: "Definisi",
  example: "Contoh",
  synonyms: "Sinonim",
  antonyms: "Antonim",
  partofspeech: "Jenis kata",
  audio: "Audio",
  title: "Judul",
  description: "Deskripsi",
  url: "Tautan",
  link: "Tautan",
  image: "Gambar",
  thumbnail: "Gambar kecil",
  video: "Video",
  date: "Tanggal",
  created_at: "Dibuat",
  updated_at: "Diperbarui",
  id: "ID",
  flag: "Bendera",
  connection: "Koneksi",
  org: "Organisasi",
  isp: "Penyedia internet",
  asn: "ASN",
  domain: "Domain",
  emoji: "Emoji",
  is_eu: "Uni Eropa",
  calling_code: "Kode telepon",
  borders: "Perbatasan",
  current_time: "Waktu sekarang",
  utc: "UTC",
  offset: "Selisih waktu",
  abbr: "Singkatan",
  is_dst: "Waktu musim panas",
  slip: "Saran",
  price: "Harga",
  views: "Dilihat",
  likes: "Suka",
  duration: "Durasi",
  size: "Ukuran",
  username: "Nama pengguna",
  email: "Email",
  phone: "Telepon",
  address: "Alamat",
  query: "Kata kunci",
  keyword: "Kata kunci",
  time_taken: "Waktu proses",
  data: "Hasil",
  results: "Hasil",
};

/** "partOfSpeech" → "Jenis kata", "country_code" → "Kode negara", "fooBar_baz" → "Foo bar baz". */
export function humanizeKey(key: string): string {
  const direct = LABELS[key.toLowerCase()] ?? LABELS[key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()];
  if (direct) return direct;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function isUrl(v: string): boolean {
  return /^https?:\/\/\S+$/i.test(v.trim());
}

/** Sites whose links open a page (watch page, profile, template editor), never a playable file. */
const PAGE_HOSTS = new Set([
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "vt.tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
  "twitter.com",
  "x.com",
  "capcut.com",
  "pinterest.com",
  "pin.it",
  "spotify.com",
  "open.spotify.com",
]);

function isPageHost(hostname: string): boolean {
  return PAGE_HOSTS.has(hostname.toLowerCase().replace(/^(www|m)\./, ""));
}

/**
 * What kind of media a value is, if any. Looks at the link itself (file extension anywhere in the
 * path, `mime_type=video_mp4` style hints) and, when given, the field name (`thumbnail`, `video_url`…).
 */
export function mediaOf(v: unknown, key?: string): MediaKind | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  const direct = mediaKindFromUrl(s);
  if (direct) return direct;
  if (!isUrl(s)) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const where = `${u.pathname}${u.search}`.toLowerCase();
  if (/mime_type=video|\.(mp4|webm|mov)(\/|$|[?&#])/.test(where)) return "video";
  if (/mime_type=audio|\.(mp3|m4a|wav|ogg|aac)(\/|$|[?&#])/.test(where)) return "audio";
  if (/mime_type=image|\.(png|jpe?g|webp|gif|avif)(\/|$|[?&#~])/.test(where)) return "image";
  if (!key || isPageHost(u.hostname)) return null;
  const k = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  if (/(thumb|cover|image|img|avatar|poster|photo|picture|banner|icon)/.test(k)) return "image";
  if (/(^|_)(mp4|nowm|nowatermark|no_watermark|wm|hd|sd|play|video)(_|$)/.test(k)) return "video";
  if (/(^|_)(mp3|audio|music|sound)(_|$)/.test(k)) return "audio";
  return null;
}

/* ------------------------------------------------------------------ *
 * Media cards: an item with a playable video plus its details (CapCut, TikTok, … search results)
 * ------------------------------------------------------------------ */

export type MediaCardLink = { key: string; label: string; url: string };
export type MediaCardStat = { key: string; label: string; value: number };
export type MediaCard = {
  video: string;
  poster: string | null;
  title: string | null;
  author: { name: string | null; avatar: string | null } | null;
  duration: number | null;
  stats: MediaCardStat[];
  links: MediaCardLink[];
};

const TITLE_KEYS = ["title", "caption", "desc", "description", "name", "text", "judul"];
const AUTHOR_KEYS = ["author", "user", "creator", "owner", "uploader", "channel", "profile"];
const ID_LIKE = /(^id$|_id$|Id$|^code$|^uid$|^cid$|^aweme_id$)/i;

const STAT_LABELS: Record<string, string> = {
  usage_amount: "Dipakai",
  usage: "Dipakai",
  use_count: "Dipakai",
  play_amount: "Diputar",
  play_count: "Diputar",
  plays: "Diputar",
  views: "Dilihat",
  view_count: "Dilihat",
  like_count: "Suka",
  likes: "Suka",
  digg_count: "Suka",
  comment_count: "Komentar",
  comments: "Komentar",
  share_count: "Dibagikan",
  shares: "Dibagikan",
  download_count: "Diunduh",
  favorite_count: "Disimpan",
  collect_count: "Disimpan",
};

/** Button text for a link field: `template_url` → "Pakai template", `download_url` → "Unduh". */
export function linkLabel(key: string): string {
  const k = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  if (k.includes("template")) return "Pakai template";
  if (k.includes("download") || k.includes("nowm") || k.includes("no_watermark")) return "Unduh";
  if (k.includes("share")) return "Bagikan";
  if (k.includes("music") || k.includes("audio") || k.includes("sound")) return "Audio";
  if (k.includes("source") || k.includes("original")) return "Sumber";
  if (k.includes("hd")) return "Versi HD";
  if (/^(url|link|href|web_?url|page_?url)$/.test(k)) return "Buka";
  const base = k.replace(/(^|_)(url|link|href)$/, "").replace(/_+$/, "");
  return base ? humanizeKey(base) : "Buka";
}

export function statLabel(key: string): string {
  const k = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  return STAT_LABELS[k] ?? humanizeKey(key);
}

/** Seconds as "0:10" / "1:02:03" (values that look like milliseconds are converted). */
export function formatDuration(value: number, key = ""): string {
  let sec = /ms|milli/i.test(key) || value > 60 * 60 * 6 ? value / 1000 : value;
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = String(sec % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** 9506013 → "9,5 jt", 214787 → "214,8 rb". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Reads an item with a playable video into a card; null when the item has no video. */
export function mediaCardOf(value: unknown): MediaCard | null {
  if (!isPlainObject(value)) return null;
  const entries = Object.entries(value).filter(([, v]) => !isEmpty(v));
  const videos = entries.filter(([k, v]) => mediaOf(v, k) === "video");
  if (videos.length === 0) return null;
  const preferred =
    videos.find(([k]) => /video|play|nowm|hd/i.test(k) && !/download/i.test(k)) ?? videos[0];
  const video = String(preferred?.[1] ?? "").trim();
  if (!video) return null;

  const images = entries.filter(([k, v]) => mediaOf(v, k) === "image");
  const posterEntry =
    images.find(([k]) => /thumb|cover|poster|image|img|preview/i.test(k) && !/avatar|icon/i.test(k)) ??
    images.find(([k]) => !/avatar|icon/i.test(k));
  const poster = posterEntry ? String(posterEntry[1]).trim() : null;

  const titleEntry = TITLE_KEYS.map((t) =>
    entries.find(([k, v]) => k.toLowerCase() === t && typeof v === "string" && !isUrl(v)),
  ).find(Boolean);
  const title = titleEntry ? String(titleEntry[1]).trim() : null;

  let author: MediaCard["author"] = null;
  const authorEntry = entries.find(([k]) => AUTHOR_KEYS.includes(k.toLowerCase()));
  if (authorEntry) {
    const a = authorEntry[1];
    if (typeof a === "string" && !isUrl(a)) author = { name: a.trim(), avatar: null };
    else if (isPlainObject(a)) {
      const name = ["name", "nickname", "nick_name", "username", "unique_id", "display_name"]
        .map((n) => a[n])
        .find((n) => typeof n === "string" && n.trim());
      const avatar = Object.entries(a).find(([k, v]) => mediaOf(v, k) === "image")?.[1];
      author = {
        name: typeof name === "string" ? name.trim() : null,
        avatar: typeof avatar === "string" ? avatar.trim() : null,
      };
    }
  }

  const durationEntry = entries.find(
    ([k, v]) => typeof v === "number" && /^(duration|dur|length|video_duration)(_?ms|_?sec)?$/i.test(k),
  );
  const duration = durationEntry ? (durationEntry[1] as number) : null;

  const stats = entries
    .filter(
      ([k, v]) => typeof v === "number" && !ID_LIKE.test(k) && k !== durationEntry?.[0],
    )
    .map(([k, v]) => ({ key: k, label: statLabel(k), value: v as number }));

  const skip = new Set([posterEntry?.[0], preferred?.[0]]);
  const seen = new Set<string>([video]);
  const links: MediaCardLink[] = [];
  for (const [k, v] of entries) {
    if (skip.has(k) || typeof v !== "string" || !isUrl(v)) continue;
    const url = v.trim();
    const kind = mediaOf(v, k);
    if (kind === "image") continue;
    // The same file as the preview only earns a button when it is meant for downloading.
    if (url === video && !/download|nowm|save/i.test(k)) continue;
    if (url !== video && seen.has(url)) continue;
    seen.add(url);
    links.push({ key: k, label: linkLabel(k), url });
  }

  return { video, poster, title, author, duration, stats, links };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Human text for a primitive value (booleans in Indonesian, numbers and dates localized). */
export function formatPrimitive(v: unknown): string {
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "number") return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 }).format(v);
  if (typeof v === "string") {
    const s = v.trim();
    if (ISO_DATE.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          ...(s.length > 10 ? { timeStyle: "short" as const } : {}),
        }).format(d);
      }
    }
    return s;
  }
  if (v === null || v === undefined) return "—";
  return String(v);
}

/** Plain-text version of a result for the copy button (never JSON). */
export function toPlainText(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    const items = value.filter((v) => !isEmpty(v));
    if (items.every((v) => !isPlainObject(v) && !Array.isArray(v))) {
      return items.map((v) => `${pad}• ${formatPrimitive(v)}`).join("\n");
    }
    return items.map((v, i) => `${pad}${i + 1}.\n${toPlainText(v, indent + 1)}`).join("\n");
  }
  if (isPlainObject(value)) {
    return Object.entries(withoutMeta(value))
      .map(([k, v]) =>
        v !== null && typeof v === "object"
          ? `${pad}${humanizeKey(k)}:\n${toPlainText(v, indent + 1)}`
          : `${pad}${humanizeKey(k)}: ${formatPrimitive(v)}`,
      )
      .join("\n");
  }
  return `${pad}${formatPrimitive(value)}`;
}
