export class MessageCounter{
 constructor({api,doc=document,win=window,interval=15000}){Object.assign(this,{api,doc,win,interval,count:null,revision:0,active:false});this.onVisible=()=>{if(this.doc.visibilityState!=='hidden')void this.refresh();};}
 render(){const badge=this.doc.querySelector('[data-message-count]');if(!badge)return;badge.textContent=this.count===null?'…':String(this.count);badge.setAttribute('aria-label',this.count===null?'Consultando mensajes':this.count+(this.count===1?' mensaje en la bandeja':' mensajes en la bandeja'));}
 set(count){if(!Number.isSafeInteger(count)||count<0)return;this.revision++;this.count=count;this.render();}
 async refresh(){
  if(!this.active||this.doc.visibilityState==='hidden')return;const revision=++this.revision;
  try{const {count}=await this.api('/api/admin/messages/count');if(this.active&&revision===this.revision)this.set(count);}catch{/* Keep the last confirmed count when the connection fails. */}
 }
 removed(){if(this.count!==null)this.set(Math.max(0,this.count-1));else this.revision++;void this.refresh();}
 start(){if(this.active)return;this.active=true;this.doc.addEventListener('visibilitychange',this.onVisible);this.win.addEventListener('focus',this.onVisible);this.timer=this.win.setInterval(this.onVisible,this.interval);this.onVisible();}
 stop(){this.active=false;this.revision++;this.win.clearInterval(this.timer);this.doc.removeEventListener('visibilitychange',this.onVisible);this.win.removeEventListener('focus',this.onVisible);}
}
