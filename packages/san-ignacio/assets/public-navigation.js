const publicPaths=new Set(['/','/vida-liturgica','/sacramentos','/pastoral','/musica','/agenda','/nosotros','/agua-de-san-ignacio','/historia','/galeria','/contacto','/privacidad','/donativos','/comunidad','/espiritualidad','/index.html']);
export const publicURL=url=>publicPaths.has(url.pathname.replace(/\/$/,'')||'/')||/^\/agenda\/[a-z0-9-]+\/?$/.test(url.pathname);
export function internalLink(event,link,current){
 if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download')||link.target&&link.target!=='_self')return null;
 const url=new URL(link.href,current);return url.origin===new URL(current).origin&&publicURL(url)?url:null;
}

export function createNavigationController({win,load,render,anchor=()=>{},onBusy=()=>{},onError=()=>{}}){
 let serial=0,generation=0,pending,current=new URL(win.location.href),key='public-'+(++serial);const positions=new Map();
 const stateFor=entryKey=>({...win.history.state,sanIgnacioPublic:entryKey});
 win.history.replaceState(stateFor(key),'',current.href);win.history.scrollRestoration='manual';
 function remember(){positions.set(key,{x:win.scrollX||0,y:win.scrollY||0});}
 async function navigate(raw,{pop=false,state}={}){
  const requested=new URL(raw,current);if(requested.origin!==current.origin||!publicURL(requested))return false;
  remember();const token=++generation;pending?.abort();pending=new AbortController();onBusy(true);
  const oldKey=key,oldURL=current;
  try{
   const same=requested.pathname===current.pathname&&requested.search===current.search;
   const page=same?null:await load(requested,pending.signal);if(token!==generation)return false;
   const next=page?.url?new URL(page.url):requested;
   if(!next.hash&&requested.hash)next.hash=requested.hash;
   if(next.origin!==current.origin||!publicURL(next))throw Error('Destino no disponible.');
   if(page)render(page);
   key=pop?(state?.sanIgnacioPublic||'public-'+(++serial)):'public-'+(++serial);current=next;
   if(!pop)win.history.pushState(stateFor(key),'',next.href);
   else if(win.location.href!==next.href||!state?.sanIgnacioPublic)win.history.replaceState(stateFor(key),'',next.href);
   // Mount only after the address changes, so section-specific anchors see the new URL.
   page?.mount?.();anchor(next.hash);
   if(same)win.dispatchEvent(new win.Event('hashchange'));
   const position=pop?positions.get(key):null;
   if(position)win.scrollTo({left:position.x,top:position.y,behavior:'instant'});
   else if(!next.hash)win.scrollTo({left:0,top:0,behavior:'instant'});
   return true;
  }catch(error){
   if(token!==generation||error.name==='AbortError')return false;
   key=oldKey;current=oldURL;
   if(pop)win.history.replaceState(stateFor(key),'',current.href);
   onError(()=>navigate(requested.href));return false;
  }finally{if(token===generation){pending=null;onBusy(false);}}
 }
 win.addEventListener('scroll',remember,{passive:true});
 win.addEventListener('popstate',event=>{navigate(win.location.href,{pop:true,state:event.state});});
 return {navigate};
}

export function scrollToAnchor(hash,doc=document){
 if(!hash)return;let id;try{id=decodeURIComponent(hash.slice(1));}catch{return;}
 const target=doc.getElementById(id);if(!target)return;
 const details=target.matches('details')?target:target.closest('details');if(details)details.open=true;
 target.scrollIntoView({behavior:'instant',block:'start'});
}

export function setupPublicNavigation({doc=document,win=window,beforeSwap=()=>{},afterSwap=()=>{},onPlayerAdded=()=>{}}={}){
 if(!doc.body.hasAttribute('data-public-site'))return;
 const styles=new Map([...doc.querySelectorAll('link[rel="stylesheet"]')].map(link=>[link.href,Promise.resolve()]));
 const feedback=doc.createElement('div');feedback.className='public-navigation-status';feedback.hidden=true;feedback.setAttribute('role','status');
 const message=doc.createElement('span'),retry=doc.createElement('button');retry.type='button';retry.textContent='Volver a intentar';feedback.append(message,retry);doc.body.append(feedback);
 async function ensureStyles(next,url){
  await Promise.all([...next.querySelectorAll('link[rel="stylesheet"]')].map(source=>{
   const href=new URL(source.getAttribute('href'),url).href;if(styles.has(href))return styles.get(href);
   const promise=new Promise((resolve,reject)=>{const link=doc.createElement('link');link.rel='stylesheet';link.href=href;const timeout=win.setTimeout(()=>failed(),15000);
    function failed(){win.clearTimeout(timeout);link.remove();styles.delete(href);reject(Error('No se pudo cargar el estilo de la sección.'));}
    link.onload=()=>{win.clearTimeout(timeout);resolve();};link.onerror=failed;doc.head.append(link);
   });styles.set(href,promise);return promise;
  }));
 }
 function metadata(next){
  doc.title=next.title;
  for(const selector of ['link[rel="canonical"]','meta[name="description"]','meta[property="og:title"]','meta[property="og:description"]','meta[property="og:url"]','meta[property="og:image"]']){
   const old=doc.head.querySelector(selector),fresh=next.head.querySelector(selector);if(fresh){if(old)old.replaceWith(doc.importNode(fresh,true));else doc.head.append(doc.importNode(fresh,true));}else old?.remove();
  }
  const header=next.querySelector('.site-header');
  for(const link of doc.querySelectorAll('.site-header a[href]')){const selected=[...header.querySelectorAll('a[aria-current="page"]')].some(other=>other.getAttribute('href')===link.getAttribute('href'));if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  for(const button of doc.querySelectorAll('.site-header [data-nav-toggle]')){const fresh=[...header.querySelectorAll('[data-nav-toggle]')].find(other=>other.getAttribute('aria-controls')===button.getAttribute('aria-controls'));button.classList.toggle('is-current',!!fresh?.classList.contains('is-current'));}
 }
 const controller=createNavigationController({win,
  load:async(url,signal)=>{const response=await win.fetch(url.href,{signal,headers:{Accept:'text/html'}});if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('Página no disponible.');
   const destination=new URL(response.url||url.href);if(destination.origin!==url.origin||!publicURL(destination))throw Error('Página no disponible.');
   const next=new win.DOMParser().parseFromString(await response.text(),'text/html');
   if(!next.body.hasAttribute('data-public-site')||!next.querySelector('#contenido')||!next.querySelector('.site-header')||!next.querySelector('.site-footer'))throw Error('Página no disponible.');
   await ensureStyles(next,response.url||url.href);return {next,url:response.url||url.href,mount:afterSwap};
  },
  render:({next})=>{
   beforeSwap();
   // The header, introduction and music/audio nodes remain in this document.
   const main=doc.importNode(next.querySelector('#contenido'),true);main.querySelectorAll('script').forEach(script=>script.remove());
   doc.querySelector('#contenido').replaceWith(main);doc.querySelector('.site-footer').replaceWith(doc.importNode(next.querySelector('.site-footer'),true));
   for(const dialog of doc.querySelectorAll('body > dialog'))dialog.remove();
   for(const dialog of next.querySelectorAll('body > dialog'))doc.body.append(doc.importNode(dialog,true));
   if(!doc.querySelector('[data-music-player]')&&next.querySelector('[data-music-player]')){main.before(doc.importNode(next.querySelector('[data-music-player]'),true));onPlayerAdded();}
   metadata(next);main.classList.add('skip-page-entry');main.setAttribute('tabindex','-1');main.focus({preventScroll:true});
  },
  anchor:hash=>scrollToAnchor(hash,doc),
  onBusy:value=>{doc.querySelector('#contenido')?.setAttribute('aria-busy',String(value));if(value)feedback.hidden=true;},
  onError:again=>{message.textContent='No se pudo abrir la sección. La página actual y la música siguen disponibles. ';retry.onclick=again;feedback.hidden=false;}
 });
 doc.addEventListener('click',event=>{const link=event.target.closest?.('a[href]'),url=internalLink(event,link,win.location.href);if(!url)return;event.preventDefault();controller.navigate(url.href);});
 return controller;
}
