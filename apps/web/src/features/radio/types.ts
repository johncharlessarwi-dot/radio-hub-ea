export interface Station { id:string; name:string; country:string; city:string|null; frequency?:string|null; genre:string[]; language?:string[]; logo?:string|null; streamUrls:string[]; source?:string }
export type PlaybackStatus="idle"|"loading"|"playing"|"paused"|"reconnecting"|"unavailable";
