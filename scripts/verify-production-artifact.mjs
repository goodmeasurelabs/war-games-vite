import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, relative} from 'node:path';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('cloudflare/deployment-manifest.json','utf8'));
async function walk(path) {
 const entries=await readdir(path,{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(join(path,entry.name)):[join(path,entry.name)]))).flat();
}
const files=(await walk('dist')).map(file=>relative('dist',file).replaceAll('\\','/')).sort();
assert.deepEqual(files,Object.keys(manifest.files).sort(),'Publish directory differs from the reviewed manifest');
for(const file of files) {
 const actual=createHash('sha256').update(await readFile(join('dist',file))).digest('hex');
 assert.equal(actual,manifest.files[file],`Artifact drift: ${file}`);
}
console.log(`All ${files.length} publish files match the reviewed production artifact manifest.`);
