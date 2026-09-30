import {mkdir,copyFile,readdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/src',{recursive:true});
for(const file of ['index.html','style.css','favicon.svg'])await copyFile(file,`dist/${file}`);
for(const file of await readdir('src'))if(file.endsWith('.js'))await copyFile(`src/${file}`,`dist/src/${file}`);
console.log('Static build ready: dist/ (no runtime dependencies)');
