const scope='san-ignacio-admin';

export class AdminNavigation {
  constructor({win=window,path='/admin',canLeave=()=>true,onNavigate=()=>{},onBack=()=>false,onError=()=>{}}={}) {
    Object.assign(this,{win,path,canLeave,onNavigate,onBack,onError,restoring:false,view:null});
    this.listener=event=>this.back(event);
  }
  state(view,guard=false){return {scope,view,guard};}
  start(view={kind:'panel',panel:'overview'}) {
    this.view=view;
    // A root entry keeps ordinary Back inside this administration tab.
    this.win.history.replaceState(this.state(view,true),'',this.path);
    this.win.history.pushState(this.state(view),'',this.path);
    this.win.addEventListener('popstate',this.listener);
  }
  visit(view,{replace=false}={}) {
    if(this.restoring)return;
    const same=JSON.stringify(this.view)===JSON.stringify(view);this.view=view;
    this.win.history[replace||same?'replaceState':'pushState'](this.state(view),'',this.path);
  }
  goBack(){this.win.history.back();}
  async back(event) {
    if(this.restoring||this.onBack()||!this.canLeave()){
      this.win.history.pushState(this.state(this.view),'',this.path);return;
    }
    const state=event.state;
    if(state?.scope!==scope){this.win.history.pushState(this.state(this.view),'',this.path);return;}
    this.view=state.view;
    if(state.guard)this.win.history.pushState(this.state(this.view),'',this.path);
    this.restoring=true;
    try{await this.onNavigate(this.view);}catch(error){this.onError(error);}finally{this.restoring=false;}
  }
}
