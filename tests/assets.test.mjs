import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('HTML, CSS refresh and every module dependency share the release cache token',async()=>{
 const html=await readFile('index.html','utf8');const token=html.match(/src\/app\.js\?v=([^" ]+)/)[1];
 assert.ok(html.includes(`style.css?v=${token}`));
 for(const file of await readdir('src')){if(!file.endsWith('.js'))continue;const code=await readFile(`src/${file}`,'utf8');for(const [,path] of code.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g))assert.ok(path.endsWith(`?v=${token}`),`${file}: ${path}`);}
 const dom=await readFile('src/dom.js','utf8');assert.ok(dom.includes(`style.css?v=${token}`));
});
