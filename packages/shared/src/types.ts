export type StreamStatus="alive"|"dead"|"unknown"|"restricted";
export interface RadioStation {id:string;name:string;country:string;city:string|null;frequency:string|null;language:string[];genre:string[];logo:string|null;website:string|null;streamUrls:string[];source:"official"|"community"}
export interface StreamHealth {url:string;status:StreamStatus;latencyMs:number|null;checkedAt:string|null;consecutiveFailures:number}
