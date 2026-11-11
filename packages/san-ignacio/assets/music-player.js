import {musicTracks} from './music-tracks.js';

export function setupMusicPlayer(doc=document,win=window){
 const root=doc.querySelector('[data-music-player]');if(!root)return;
 const audio=root.querySelector('[data-music-audio]'),toggle=root.querySelector('[data-music-toggle]'),title=root.querySelector('[data-music-title]'),state=root.querySelector('[data-music-state]'),status=root.querySelector('[data-music-status]');
 let index=0,wantsPlay=false,generation=0;
 function display(){const track=musicTracks[index];title.textContent=track.title;title.title=track.title+' · '+track.detail;}
 function reflect(){const playing=!audio.paused&&!audio.ended;root.dataset.playing=String(playing);toggle.setAttribute('aria-pressed',String(playing));const label=playing?'Pausar música':'Reproducir música';toggle.setAttribute('aria-label',label);toggle.title=label;state.textContent=playing?'· sonando':'· apagada';}
 function stop(){wantsPlay=false;generation++;audio.pause();reflect();}
 async function play(){
  wantsPlay=true;const request=++generation;
  if(!audio.getAttribute('src'))audio.src=musicTracks[index].src;
  status.textContent='';
  try{await audio.play();if(request===generation)reflect();}
  catch(error){if(request!==generation)return;wantsPlay=false;reflect();if(error.name!=='AbortError'){state.textContent='· no disponible';status.textContent='No se pudo reproducir esta pista. Prueba la siguiente o vuelve a pulsar reproducir.';}}
 }
 function select(step){const resume=wantsPlay;stop();index=(index+step+musicTracks.length)%musicTracks.length;display();status.textContent='Pista '+(index+1)+' de '+musicTracks.length+': '+musicTracks[index].title;
  // Cambiar de pista estando apagado no descarga ni reproduce el archivo.
  audio.removeAttribute('src');audio.load();if(resume)play();
 }
 audio.volume=0.35;root.hidden=false;display();reflect();
 toggle.addEventListener('click',()=>{if(wantsPlay)stop();else play();});
 root.querySelector('[data-music-prev]').addEventListener('click',()=>select(-1));
 root.querySelector('[data-music-next]').addEventListener('click',()=>select(1));
 audio.addEventListener('play',reflect);audio.addEventListener('pause',()=>{if(audio.paused&&!audio.ended)wantsPlay=false;reflect();});
 audio.addEventListener('ended',()=>{if(wantsPlay)select(1);else reflect();});
 audio.addEventListener('error',()=>{if(!audio.getAttribute('src'))return;stop();state.textContent='· no disponible';status.textContent='No se pudo cargar esta pista. Puedes pasar a la siguiente.';});
 win.addEventListener('pagehide',stop);
 return {audio,select,stop};
}
if(typeof document!=='undefined')setupMusicPlayer();
