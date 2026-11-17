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
  it("rejects oversized playlists",()=>expect(parsePlaylist("A".repeat(131073),"https://radio.example/list.m3u")).toEqual([]));
  it("rejects oversized HTML",()=>expect(parsePublicStreams("x".repeat(524289),"https://radio.example/")).toEqual([]));
  it("deduplicates identical playlist sources",()=>expect(parsePlaylist("#EXTM3U\nhttps://radio.example/stream\nhttps://radio.example/stream","https://radio.example/list.m3u")).toEqual(["https://radio.example/stream"]));
  it("drops localhost playlist entries",()=>expect(parsePlaylist("#EXTM3U\nhttp://127.0.0.1/admin\nhttps://radio.example/stream","https://radio.example/list.m3u")).toEqual(["https://radio.example/stream"]));
  it("discards local hosts and unsafe schemes", () => {
    expect(safePublicHttpUrl("http://127.0.0.1/admin")).toBeNull();
    expect(safePublicHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicHttpUrl("http://localhost:8080")).toBeNull();
  });
  it("rejects URLs beyond the accepted 2048-byte limit",()=>{expect(safePublicHttpUrl("https://example.org/"+ "x".repeat(2200))).toBeNull();});
  it("blocks loopback hostname representations",()=>{expect(safePublicHttpUrl("http://127.0.0.1/private")).toBeNull();expect(safePublicHttpUrl("http://0x7f000001/")).toBeNull();});
  it("rejects credentials and management service ports",()=>{expect(safePublicHttpUrl("https://user:pass@radio.example/live")).toBeNull();expect(safePublicHttpUrl("http://radio.example:2375/live")).toBeNull();});
  it("rejects newline and control-character injection",()=>{expect(safePublicHttpUrl("https://radio.example/live\nX-Test: bad")).toBeNull();});
  it("rejects internal-only DNS names",()=>expect(safePublicHttpUrl("https://admin.internal/live")).toBeNull());
  it("rejects LAN DNS hostnames",()=>expect(safePublicHttpUrl("https://radio.lan/live")).toBeNull());
  it("rejects home.arpa network names",()=>expect(safePublicHttpUrl("http://gateway.home.arpa/live")).toBeNull());
  it("rejects trailing-dot localhost aliases",()=>expect(safePublicHttpUrl("http://localhost./admin")).toBeNull());
  it("rejects trailing-dot local network names",()=>expect(safePublicHttpUrl("https://printer.local./live")).toBeNull());
  it("rejects IPv6 unique-local addresses",()=>expect(safePublicHttpUrl("https://[fd00::1]/private")).toBeNull());
  it("rejects IPv6 link-local addresses",()=>expect(safePublicHttpUrl("https://[fe80::1]/private")).toBeNull());
  it("rejects IPv6 multicast addresses",()=>expect(safePublicHttpUrl("https://[ff02::1]/private")).toBeNull());
  it("rejects reserved 192.0.0.0/24 hosts",()=>expect(safePublicHttpUrl("http://192.0.0.8/live")).toBeNull());
});
