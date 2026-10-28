import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const paths=['src/server.js','src/server-next.js',...fs.readdirSync('src/review').filter(f=>f.endsWith('.js')).map(f=>'src/review/'+f),...fs.readdirSync('assets').filter(f=>f.endsWith('.js')).map(f=>'assets/'+f)];
for(const file of paths){const check=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(check.status)process.exit(check.status);}console.log(`${paths.length} archivos activos: sintaxis válida.`);
