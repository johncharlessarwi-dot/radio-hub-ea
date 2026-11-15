const prefix="redio-ea:";
export function readJson<T>(key:string,fallback:T):T {
  try {const value=localStorage.getItem(prefix+key);return value?JSON.parse(value) as T:fallback;}catch{return fallback;}
}
export function saveJson(key:string,value:unknown){try{localStorage.setItem(prefix+key,JSON.stringify(value));}catch{/* privacy mode or storage quota */}}
export function toggleId(ids:string[],id:string){return ids.includes(id)?ids.filter(x=>x!==id):[id,...ids].slice(0,200)}
export function pushRecent(ids:string[],id:string){return [id,...ids.filter(x=>x!==id)].slice(0,20)}
