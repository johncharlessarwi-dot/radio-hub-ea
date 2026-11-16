import sharp from "sharp";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir=join(root,"public");
const icon=readFileSync(join(publicDir,"icon.svg"));
for(const size of [192,512]){
  await sharp(icon,{density:240}).resize(size,size).png().toFile(join(publicDir,`icon-${size}.png`));
}
console.log("Generated REDIO HUB EA 192px and 512px app icons");
