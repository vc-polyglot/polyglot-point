import {AdminNavigation} from './admin-navigation.js?v=1';

const navigation=new AdminNavigation({path:location.pathname,onBack:()=>{const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return true;}return false;},onNavigate:()=>location.replace('/admin')});
navigation.start({kind:'preview'});
for(const link of document.querySelectorAll('a[href]')) {
  const url=new URL(link.href,location.href);
  if(url.origin===location.origin&&(url.pathname==='/admin'||url.pathname===location.pathname&&url.hash))continue;
  link.target='_blank';link.rel='noopener noreferrer';
}

window.addEventListener('pagehide',()=>{document.body.hidden=true;});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
