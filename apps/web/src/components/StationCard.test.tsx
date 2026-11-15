// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StationCard } from "./StationCard";
import { t } from "../i18n/translations";
import type { Station } from "../features/radio/types";

const station:Station={id:"test-radio",name:"Test Radio",country:"TZ",city:"Moshi",genre:["Music"],streamUrls:["https://streams.example/live.mp3"]};
describe("StationCard component",()=>{
  it("starts the selected station when Listen is clicked",()=>{
    const onListen=vi.fn();
    render(<StationCard station={station} selected={false} playing={false} favourite={false} tr={key=>t("sw",key)} onListen={onListen} onToggle={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Sikiliza Test Radio"}));
    expect(onListen).toHaveBeenCalledWith(station);
  });
  it("disables playback for unverified stations",()=>{
    const onListen=vi.fn();
    render(<StationCard station={{...station,streamUrls:[]}} selected={false} playing={false} favourite={false} tr={key=>t("sw",key)} onListen={onListen} onToggle={vi.fn()}/>);
    const control=screen.getByRole("button",{name:"Haijathibitishwa"});
    expect((control as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(control);
    expect(onListen).not.toHaveBeenCalled();
  });
  it("toggles favourite without starting playback",()=>{
    const onListen=vi.fn(),onToggle=vi.fn();
    render(<StationCard station={station} selected={false} playing={false} favourite={false} tr={key=>t("sw",key)} onListen={onListen} onToggle={onToggle}/>);
    fireEvent.click(screen.getByRole("button",{name:"Ongeza kwenye vipendwa"}));
    expect(onToggle).toHaveBeenCalledWith("test-radio");
    expect(onListen).not.toHaveBeenCalled();
  });
});
