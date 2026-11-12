import test from 'node:test';
import assert from 'node:assert/strict';
import {createPageScope} from '../assets/page-scope.js';

test('Salir de una sección limpia escuchas, observadores y temporizadores sin tocar el audio global',()=>{
 const target=()=>({listeners:new Map(),addEventListener(type,fn){this.listeners.set(type,fn);},removeEventListener(type,fn){if(this.listeners.get(type)===fn)this.listeners.delete(type);}});
 const doc=target(),win=target(),media=target(),timers=new Map(),frames=new Map(),observers=[];let serial=0;
 Object.assign(win,{setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),matchMedia:()=>media,ResizeObserver:class{constructor(){observers.push(this);}disconnect(){this.disconnected=true;}},IntersectionObserver:class{constructor(){observers.push(this);}disconnect(){this.disconnected=true;}}});
 const musicListener=()=>{};win.addEventListener('pagehide',musicListener);
 const page=createPageScope(doc,win);page.doc.addEventListener('click',()=>{});page.win.addEventListener('resize',()=>{});page.win.matchMedia('test').addEventListener('change',()=>{});page.win.setTimeout(()=>assert.fail('No debe ejecutarse'),8000);page.win.requestAnimationFrame(()=>{});new page.win.ResizeObserver(()=>{});new page.win.IntersectionObserver(()=>{});
 page.destroy();assert.equal(doc.listeners.size,0);assert.equal(win.listeners.get('pagehide'),musicListener);assert.equal(win.listeners.has('resize'),false);assert.equal(media.listeners.size,0);assert.equal(timers.size,0);assert.equal(frames.size,0);assert.ok(observers.every(observer=>observer.disconnected));page.destroy();
 page.win.setTimeout(()=>{},1);page.win.requestAnimationFrame(()=>{});page.doc.addEventListener('click',()=>{});assert.equal(timers.size,0);assert.equal(frames.size,0);assert.equal(doc.listeners.size,0);
});
