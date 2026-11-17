import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent } from "undici";
import { safePublicHttpUrl } from "../parsers/streams.js";

/**
 * Check the IP at connection time, not just before the request.
 * Undici uses this lookup to establish its TCP connection: a DNS response
 * resolving to a private, reserved, or mixed-address set fails closed.
 */
export function isPublicAddress(address:string):boolean {
  if(address.startsWith("::ffff:"))return isPublicAddress(address.slice(7));
  if(isIP(address)===4){
    const p=address.split(".").map(Number);
    const [a,b,c]=p;
    if(a===0||a===10||a===127||a>=224)return false;
    if(a===100&&b>=64&&b<=127)return false;
    if(a===169&&b===254)return false;
    if(a===172&&b>=16&&b<=31)return false;
    if(a===192&&(b===168||b===0))return false;
    if(a===198&&(b===18||b===19))return false;
    if(a===192&&b===88&&c===99)return false;
    if(a===192&&b===0&&c===2)return false;
    if(a===198&&b===51&&c===100)return false;
    if(a===203&&b===0&&c===113)return false;
    return true;
  }
  if(isIP(address)===6){
    const normalized=address.toLowerCase();
    if(!/^[23][0-9a-f]{3}:/.test(normalized))return false;
    if(normalized.startsWith("2001:db8:"))return false;
    return true;
  }
  return false;
}
export function choosePublicDnsAddress(addresses:Array<{address:string;family:number}>){
  if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw Error("Unsafe DNS destination");
  return addresses[0];
}
const publicAgent=new Agent({
  connect:{
    lookup(hostname,_options,callback){
      lookup(hostname,{all:true,verbatim:true}).then(addresses=>{
        try{
          const chosen=choosePublicDnsAddress(addresses);
          callback(null,chosen.address,chosen.family);
        }catch(error){callback(error as Error,"",4);}
      }).catch(error=>callback(error as Error,"",4));
    }
  }
});
export async function fetchPublicUrl(url:string,init:RequestInit={}):Promise<Response>{
  const method=(init.method??"GET").toUpperCase();
  if(method!=="GET"&&method!=="HEAD")throw Error("Outbound method not permitted");
  const safe=safePublicHttpUrl(url);
  if(!safe)throw Error("Disallowed public URL");
  // Node's built-in fetch uses Undici Dispatcher; its custom lookup binds
  // the validated IP to the actual connection, preventing DNS rebinding.
  return fetch(safe,{...init,signal:init.signal??AbortSignal.timeout(9000),redirect:"error",dispatcher:publicAgent} as RequestInit & {dispatcher:Agent});
}
