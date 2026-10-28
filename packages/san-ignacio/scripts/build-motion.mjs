import fs from 'node:fs';
const marker='/* Pointer, menus and entrance effects; transform/opacity drive the motion. */';const base=fs.readFileSync('assets/site.css','utf8').split(marker)[0].trimEnd();const motion=fs.readFileSync('assets/motion-r3.css','utf8');fs.writeFileSync('assets/site.css',base+'\n\n'+motion+'\n');console.log('Estilos de interacción incorporados a la hoja pública.');
