// Page features keep their listeners, observers and timers only while their content exists.
export function createPageScope(doc=document,win=window){
 const cleanup=[],timers=new Set(),frames=new Set(),observers=new Set();let closed=false;
 const listen=target=>(type,callback,options)=>{if(closed)return;target.addEventListener(type,callback,options);cleanup.push(()=>target.removeEventListener(type,callback,options));};
 const bound=(target,key)=>{const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;};
 const pageDoc=new Proxy(doc,{get(target,key){return key==='addEventListener'?listen(target):bound(target,key);}});
 const pageWin=new Proxy(win,{get(target,key){
  if(key==='addEventListener')return listen(target);
  if(key==='setTimeout')return (fn,delay,...args)=>{if(closed)return 0;const id=target.setTimeout(()=>{timers.delete(id);if(!closed)fn(...args);},delay);timers.add(id);return id;};
  if(key==='clearTimeout')return id=>{timers.delete(id);target.clearTimeout(id);};
  if(key==='requestAnimationFrame')return fn=>{if(closed)return 0;const id=target.requestAnimationFrame(time=>{frames.delete(id);if(!closed)fn(time);});frames.add(id);return id;};
  if(key==='cancelAnimationFrame')return id=>{frames.delete(id);target.cancelAnimationFrame(id);};
  if(key==='matchMedia')return query=>{const media=target.matchMedia(query);return new Proxy(media,{get(item,property){return property==='addEventListener'?listen(item):bound(item,property);}});};
  if(['ResizeObserver','IntersectionObserver'].includes(key)&&typeof target[key]==='function')return function(...args){const observer=new target[key](...args);observers.add(observer);return observer;};
  return bound(target,key);
 }});
 return {doc:pageDoc,win:pageWin,destroy(){closed=true;cleanup.splice(0).forEach(remove=>remove());timers.forEach(id=>win.clearTimeout(id));frames.forEach(id=>win.cancelAnimationFrame(id));observers.forEach(observer=>observer.disconnect());timers.clear();frames.clear();observers.clear();}};
}
