import { describe, it, expect } from "vitest";
import { parsePlaylist, parsePublicStreams, safePublicHttpUrl } from "./streams.js";

describe("public stream discovery", () => {
  it("extracts audio, source, M3U8, and Icecast links without duplicates", () => {
    const html = '<audio src="/live.mp3"></audio><audio><source src="https://radio.example/live.m3u8"></audio><a href="/listen">Tune in</a><a href="/live.mp3">Again</a>';
    expect(parsePublicStreams(html,"https://radio.example/")).toEqual([
      "https://radio.example/live.mp3",
      "https://radio.example/live.m3u8",
      "https://radio.example/listen",
    ]);
  });
  it("parses M3U and PLS playlists", () => {
    expect(parsePlaylist("#EXTM3U\n#EXTINF:-1,Station\nhttps://streams.example/live.mp3","https://radio.example/list.m3u")).toEqual(["https://streams.example/live.mp3"]);
    expect(parsePlaylist("[playlist]\nFile1=https://streams.example/live\nTitle1=Radio\n","https://radio.example/list.pls")).toEqual(["https://streams.example/live"]);
  });
  it("discards local hosts and unsafe schemes", () => {
    expect(safePublicHttpUrl("http://127.0.0.1/admin")).toBeNull();
    expect(safePublicHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicHttpUrl("http://localhost:8080")).toBeNull();
  });
  it("rejects URLs beyond the accepted 2048-byte limit",()=>{expect(safePublicHttpUrl("https://example.org/"+ "x".repeat(2200))).toBeNull();});
});
