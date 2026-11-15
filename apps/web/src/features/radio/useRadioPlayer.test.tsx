// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRadioPlayer } from "./useRadioPlayer";
import type { Station } from "./types";

class MockAudio extends EventTarget {
  src="";
  volume=0.8;
  preload="none";
  paused=true;
  canPlayType(){return "";}
  play=vi.fn(async()=>{this.paused=false;this.dispatchEvent(new Event("playing"));});
  pause=vi.fn(()=>{this.paused=true;});
  load=vi.fn();
  removeAttribute=vi.fn((name:string)=>{if(name==="src")this.src="";});
}
const station:Station={id:"test-radio",name:"Test Radio",country:"TZ",city:"Moshi",genre:["Music"],streamUrls:["https://stream.example/audio.mp3"]};
describe("radio player hook",()=>{
  beforeEach(()=>{vi.stubGlobal("Audio",MockAudio);});
  afterEach(()=>{vi.unstubAllGlobals();});
  it("plays and pauses a verified radio stream",async()=>{
    const {result,unmount}=renderHook(()=>useRadioPlayer());
    act(()=>result.current.play(station));
    await waitFor(()=>expect(result.current.status).toBe("playing"));
    expect(result.current.station?.id).toBe(station.id);
    act(()=>result.current.pause());
    expect(result.current.status).toBe("paused");
    act(()=>result.current.stop());
    expect(result.current.status).toBe("idle");
    unmount();
  });
  it("marks a station unavailable without any source",()=>{
    const {result,unmount}=renderHook(()=>useRadioPlayer());
    act(()=>result.current.play({...station,streamUrls:[]}));
    expect(result.current.status).toBe("unavailable");
    unmount();
  });
  it("clamps volume to valid media bounds",()=>{
    const {result,unmount}=renderHook(()=>useRadioPlayer());
    act(()=>result.current.setPlayerVolume(9));
    expect(result.current.volume).toBe(1);
    act(()=>result.current.setPlayerVolume(-2));
    expect(result.current.volume).toBe(0);
    unmount();
  });
});
