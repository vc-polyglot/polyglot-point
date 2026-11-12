import {ui} from './i18n.js?v=3';
const players=new WeakMap();
export function setupMusicPlayer(doc=document,win=window){
 const root=doc.querySelector('[data-music-player]');if(!root)return;
 if(players.has(root))return players.get(root);
 const musicTracks=[...root.querySelectorAll('[data-music-track]')].map(node=>({src:node.dataset.src,title:node.dataset.title,detail:node.dataset.detail}));if(!musicTracks.length)return;
 const audio=root.querySelector('[data-music-audio]'),toggle=root.querySelector('[data-music-toggle]'),title=root.querySelector('[data-music-title]'),state=root.querySelector('[data-music-state]'),status=root.querySelector('[data-music-status]');
 const panel=root.querySelector('[data-music-panel]'),open=root.querySelector('[data-music-open]'),close=root.querySelector('[data-music-close]');
 const t=text=>ui(text,doc);let lastStatus='',unavailable=false;
 function report(text){lastStatus=text;status.textContent=t(text);}
 let index=0,wantsPlay=false,generation=0;
 function setExpanded(expanded,{focus=false}={}){
  root.dataset.collapsed=String(!expanded);panel.hidden=!expanded;open.hidden=expanded;open.setAttribute('aria-expanded',String(expanded));
  if(focus)(expanded?toggle:open).focus({preventScroll:true});
 }
 function labels(){for(const [button,text]of [[open,'Abrir controles de música'],[close,'Ocultar controles de música']]){button.setAttribute('aria-label',t(text));button.title=t(text);}}
 function display(){const track=musicTracks[index];title.textContent=track.title;title.title=[track.title,t(track.detail)].filter(Boolean).join(' · ');}
 function reflect(){const playing=!audio.paused&&!audio.ended;root.dataset.playing=String(playing);toggle.setAttribute('aria-pressed',String(playing));const label=t(playing?'Pausar música':'Reproducir música');toggle.setAttribute('aria-label',label);toggle.title=label;state.textContent=t(unavailable?'· no disponible':playing?'· sonando':'· apagada');}
 function stop(){wantsPlay=false;generation++;audio.pause();reflect();}
 async function play(){
  wantsPlay=true;const request=++generation;
  if(!audio.getAttribute('src'))audio.src=musicTracks[index].src;
  unavailable=false;report('');
  try{await audio.play();if(request===generation)reflect();}
  catch(error){if(request!==generation)return;wantsPlay=false;unavailable=error.name!=='AbortError';reflect();if(unavailable)report('No se pudo reproducir esta pista. Prueba la siguiente o vuelve a pulsar reproducir.');}
 }
 function select(step){const resume=wantsPlay;stop();unavailable=false;reflect();index=(index+step+musicTracks.length)%musicTracks.length;display();report('Pista '+(index+1)+' de '+musicTracks.length+': '+musicTracks[index].title);
  // Cambiar de pista estando apagado no descarga ni reproduce el archivo.
  audio.removeAttribute('src');audio.load();if(resume)play();
 }
 audio.volume=0.35;setExpanded(false);root.hidden=false;display();reflect();labels();
 open.addEventListener('click',()=>setExpanded(true,{focus:true}));
 close.addEventListener('click',()=>setExpanded(false,{focus:true}));
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();setExpanded(false,{focus:true});}});
 toggle.addEventListener('click',()=>{if(wantsPlay)stop();else play();});
 root.querySelector('[data-music-prev]').addEventListener('click',()=>select(-1));
 root.querySelector('[data-music-next]').addEventListener('click',()=>select(1));
 audio.addEventListener('play',reflect);audio.addEventListener('pause',()=>{if(audio.paused&&!audio.ended)wantsPlay=false;reflect();});
 audio.addEventListener('ended',()=>{if(wantsPlay)select(1);else reflect();});
 audio.addEventListener('error',()=>{if(!audio.getAttribute('src'))return;stop();unavailable=true;reflect();report('No se pudo cargar esta pista. Puedes pasar a la siguiente.');});
 win.addEventListener('site-languagechange',()=>{display();reflect();labels();report(lastStatus);});
 win.addEventListener('pagehide',stop);
 const controller={audio,select,stop};players.set(root,controller);return controller;
}
if(typeof document!=='undefined')setupMusicPlayer();
