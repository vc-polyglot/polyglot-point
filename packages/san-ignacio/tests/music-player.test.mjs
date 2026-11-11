import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupMusicPlayer} from '../assets/music-player.js';
import {musicTracks} from '../assets/music-tracks.js';
import {renderPage,notFound} from '../src/review/pages.js';

function environment(){
 const node=()=>({listeners:{},attrs:{},dataset:{},hidden:true,textContent:'',addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},emit(type){for(const fn of this.listeners[type]||[])fn();},setAttribute(key,value){this.attrs[key]=String(value);},getAttribute(key){return this.attrs[key]??null;},removeAttribute(key){delete this.attrs[key];}});
 const root=node(),audio=node(),toggle=node(),title=node(),state=node(),status=node(),prev=node(),next=node(),win=node();
 Object.assign(audio,{paused:true,ended:false,plays:0,loads:0,play(){this.plays++;if(this.rejection)return Promise.reject(this.rejection);this.paused=false;this.ended=false;this.emit('play');return this.pending||Promise.resolve();},pause(){if(!this.paused){this.paused=true;this.emit('pause');}},load(){this.loads++;this.paused=true;this.ended=false;}});
 Object.defineProperty(audio,'src',{set(value){audio.setAttribute('src',value);}});
 const controls={'[data-music-audio]':audio,'[data-music-toggle]':toggle,'[data-music-title]':title,'[data-music-state]':state,'[data-music-status]':status,'[data-music-prev]':prev,'[data-music-next]':next};
 root.querySelector=key=>controls[key];const controller=setupMusicPlayer({querySelector:()=>root},win);
 return {root,audio,toggle,title,state,status,prev,next,win,controller};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};

test('El reproductor público arranca apagado, sin autoplay, descarga ni restauración automática',()=>{
 const e=environment();assert.equal(e.audio.plays,0);assert.equal(e.audio.loads,0);assert.equal(e.audio.getAttribute('src'),null);assert.equal(e.root.hidden,false);assert.equal(e.toggle.getAttribute('aria-pressed'),'false');
 for(const path of ['/','/musica','/historia']){const html=renderPage(path,[]);assert.equal((html.match(/data-music-player /g)||[]).length,1);assert.match(html,/<audio data-music-audio preload="none"><\/audio>/);assert.doesNotMatch(html,/\bautoplay\b/);assert.match(html,/music-player.css\?v=1/);}
 assert.doesNotMatch(renderPage('/musica',[],{preview:true}),/data-music-player|music-player.js/);
 assert.doesNotMatch(notFound([]),/data-music-player|music-player.js/);
 for(const track of musicTracks){assert.ok(fs.statSync('.'+track.src).size>100000);assert.match(track.src,/\.mp3$/);}
});

test('Reproducir y pausar responde a acciones explícitas y actualiza los controles accesibles',async()=>{
 const e=environment();e.toggle.emit('click');await settle();assert.equal(e.audio.getAttribute('src'),musicTracks[0].src);assert.equal(e.audio.paused,false);assert.equal(e.root.dataset.playing,'true');assert.equal(e.toggle.getAttribute('aria-label'),'Pausar música');
 e.toggle.emit('click');assert.equal(e.audio.paused,true);assert.equal(e.root.dataset.playing,'false');assert.equal(e.toggle.getAttribute('aria-label'),'Reproducir música');
 e.toggle.emit('click');await settle();e.win.emit('pagehide');assert.equal(e.audio.paused,true);
});

test('Anterior y siguiente recorren las tres pistas sin encender el audio apagado',()=>{
 const e=environment();e.prev.emit('click');assert.equal(e.title.textContent,musicTracks[2].title);e.next.emit('click');assert.equal(e.title.textContent,musicTracks[0].title);e.next.emit('click');assert.equal(e.title.textContent,musicTracks[1].title);assert.equal(e.audio.plays,0);assert.equal(e.audio.getAttribute('src'),null);assert.equal(e.root.dataset.playing,'false');
});

test('Al sonar, cambiar o terminar una pista continúa con la siguiente; una pausa impide continuar',async()=>{
 const e=environment();e.toggle.emit('click');await settle();e.next.emit('click');await settle();assert.equal(e.audio.getAttribute('src'),musicTracks[1].src);assert.equal(e.audio.paused,false);
 e.audio.ended=true;e.audio.paused=true;e.audio.emit('pause');e.audio.emit('ended');await settle();assert.equal(e.audio.getAttribute('src'),musicTracks[2].src);assert.equal(e.audio.paused,false);
 e.toggle.emit('click');const plays=e.audio.plays;e.audio.emit('ended');assert.equal(e.audio.plays,plays);
});

test('Una reproducción rechazada se puede reintentar y los fallos no reproducen otras pistas solos',async()=>{
 const e=environment();e.audio.rejection=new Error('Sin conexión');e.toggle.emit('click');await settle();assert.equal(e.root.dataset.playing,'false');assert.match(e.status.textContent,/No se pudo/);e.audio.rejection=null;e.toggle.emit('click');await settle();assert.equal(e.audio.paused,false);
 e.audio.emit('error');assert.equal(e.audio.paused,true);const plays=e.audio.plays;e.next.emit('click');assert.equal(e.audio.plays,plays);assert.equal(e.audio.getAttribute('src'),null);
});

test('Pausar durante la carga conserva apagado aunque una promesa anterior termine después',async()=>{
 const e=environment();let reject;e.audio.pending=new Promise((_,no)=>{reject=no;});e.toggle.emit('click');e.toggle.emit('click');reject(new Error('Carga cancelada'));await settle();assert.equal(e.audio.paused,true);assert.equal(e.root.dataset.playing,'false');assert.doesNotMatch(e.status.textContent,/No se pudo/);
});
