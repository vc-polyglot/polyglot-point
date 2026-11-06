import {setupPublicationReader} from './publication-reader.js?v=1';
export function setupHistoryChapters(doc,win){
 const timeline=doc.querySelector('[data-history-chapters]');
 if(!timeline)return;
 function openChapter(){
  let id;try{id=decodeURIComponent(win.location.hash.slice(1));}catch{return;}
  const target=doc.getElementById(id);
  if(!target||!timeline.contains(target))return;
  const chapter=target.matches('details')?target:target.closest('details');
  if(chapter)chapter.open=true;
 }
 openChapter();win.addEventListener('hashchange',openChapter);
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){setupHistoryChapters(document,window);setupPublicationReader(document,window);}
