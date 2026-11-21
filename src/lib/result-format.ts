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

export function mediaOf(v: unknown): MediaKind | null {
  return typeof v === "string" ? mediaKindFromUrl(v.trim()) : null;
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
