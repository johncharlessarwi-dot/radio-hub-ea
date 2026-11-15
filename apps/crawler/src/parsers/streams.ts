import * as cheerio from "cheerio";

const EXTS = /\.(?:m3u8?|pls)(?:[?#]|$)/i;
const STREAM = /(?:\/stream(?:\/|[?#]|$)|\/listen(?:\/|[?#]|$)|\/live(?:\/|[?#]|$))/i;
const MEDIA = /\.(?:mp3|aac|ogg|opus)(?:[?#]|$)/i;
const MAX_PLAYLIST_LINES = 300;
export function safePublicHttpUrl(raw: string, base?: string): string | null {
  try {
    const url = new URL(raw.trim(), base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    if (!url.hostname || /^(localhost|.*\.localhost|.*\.local)$/i.test(url.hostname)) return null;
    if (/^(?:127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname)) return null;
    if (url.hostname === "[::1]" || url.hostname === "[::]") return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
function unique(urls: Array<string | null>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}
export function parsePublicStreams(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const found: Array<string | null> = [];
  $("audio[src], audio source[src], video source[src], a[href], link[href]").each((_, el) => {
    const attr = $(el).attr("src") ?? $(el).attr("href");
    if (!attr) return;
    const candidate = safePublicHttpUrl(attr, pageUrl);
    const isMediaTag = ["audio", "source"].includes(el.tagName.toLowerCase());
    if (candidate && (isMediaTag || EXTS.test(candidate) || MEDIA.test(candidate) || STREAM.test(candidate))) found.push(candidate);
  });
  // Extract URLs from public player configuration and inline markup; no JS execution.
  const textUrls = html.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? [];
  for (const raw of textUrls.slice(0, 500)) {
    const candidate = safePublicHttpUrl(raw.replace(/&amp;/g, "&"));
    if (candidate && (EXTS.test(candidate) || MEDIA.test(candidate) || STREAM.test(candidate))) found.push(candidate);
  }
  return unique(found);
}
export function parsePlaylist(content: string, playlistUrl: string): string[] {
  const lines = content.split(/\r?\n/).slice(0, MAX_PLAYLIST_LINES);
  const isPls = /\[playlist\]/i.test(content.slice(0, 200));
  const candidates = lines.flatMap(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return [];
    const value = isPls ? (/^File\d+\s*=\s*(.+)$/i.exec(clean)?.[1] ?? null) : clean;
    if (!value) return [];
    return [safePublicHttpUrl(value, playlistUrl)];
  });
  return unique(candidates);
}
