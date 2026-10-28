import fs from 'node:fs';
const metadata=JSON.parse(fs.readFileSync(new URL('../../assets/image-metadata.json',import.meta.url),'utf8'));
export const esc = (value='') => String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const paragraphs = value => String(value||'').split(/\n\s*\n/).filter(Boolean).map(block=>`<p>${esc(block).replaceAll('\n','<br>')}</p>`).join('');
export const arrow = '<span aria-hidden="true">↗</span>';
export function photo(src,alt,{className='',eager=false,sizes='(max-width: 720px) 100vw, 60vw'}={}) {
  if(!src) return '';
  const info=metadata[src.split('/').at(-1)];
  const responsive=/^\/assets\/images\/.+-1280\.jpg$/.test(src)&&info?.width>640;
  return `<span class="photo-frame"><img class="${esc(className)}" src="${esc(src)}" ${responsive?`srcset="${esc(src.replace('-1280.jpg','-640.jpg'))} 640w, ${esc(src)} ${info.width}w" sizes="${esc(sizes)}"`:''} alt="${esc(alt)}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" ${info?`width="${info.width}" height="${info.height}"`:''}></span>`;
}
export function formatDate(date,compact=false) { return new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',...(compact?{day:'2-digit',month:'short'}:{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}).format(new Date(date)); }
