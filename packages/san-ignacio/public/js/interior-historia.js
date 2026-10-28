(() => {
  if ((location.pathname.replace(/\/+$/,"") || "/") !== "/historia") return;

  function build(){
    const source=document.querySelector("#historia");
    const main=document.querySelector("main");
    if(!source||!main||document.querySelector(".his-page")) return;

    document.body.classList.add("si-his-page");

    const page=document.createElement("section");
    page.className="his-page";
    page.innerHTML=`
      <header class="his-head">
        <p class="his-kicker">Patrimonio</p>
        <h1 class="his-title">Historia</h1>
      </header>
      <nav class="his-tabs" aria-label="Secciones de historia"></nav>
      <div class="his-content"></div>`;

    const tabs=page.querySelector(".his-tabs");
    const content=page.querySelector(".his-content");

    const sourcePanels=[...source.querySelectorAll(".history-panel")];
    const sourceTabs=[...source.querySelectorAll(".history-tab")];

    sourcePanels.forEach((panel,index)=>{
      const key=panel.dataset.historyPanel || `panel-${index}`;
      const label=sourceTabs[index]?.textContent.trim() || panel.querySelector("h3")?.textContent.trim() || `Sección ${index+1}`;

      const button=document.createElement("button");
      button.type="button";
      button.className="his-tab"+(index===0?" is-active":"");
      button.dataset.hisTab=key;
      button.textContent=label;
      tabs.appendChild(button);

      const rebuilt=document.createElement("article");
      rebuilt.className="his-panel"+(index===0?" is-active":"");
      rebuilt.dataset.hisPanel=key;

      const copy=document.createElement("div");
      copy.className="his-panel-copy";

      while(panel.firstChild) copy.appendChild(panel.firstChild);
      rebuilt.appendChild(copy);

      const media=document.createElement("div");
      media.className="his-media";

      if(index===1){
        const img=source.querySelector('.history-photo-grid img[src*="capilla"]');
        if(img) media.appendChild(img.closest("figure") || img);
      }
      if(index===2){
        const img=source.querySelector('.history-photo-grid img[src*="arquitectura"]');
        if(img) media.appendChild(img.closest("figure") || img);
      }

      rebuilt.appendChild(media);
      content.appendChild(rebuilt);
    });

    const rectors=source.querySelector(".si-history-rectors");
    if(rectors){
      rectors.classList.add("his-rectors");
      content.appendChild(rectors);
    }

    tabs.addEventListener("click",e=>{
      const b=e.target.closest(".his-tab"); if(!b) return;
      tabs.querySelectorAll(".his-tab").forEach(x=>x.classList.toggle("is-active",x===b));
      content.querySelectorAll(".his-panel").forEach(p=>p.classList.toggle("is-active",p.dataset.hisPanel===b.dataset.hisTab));
    });

    main.appendChild(page);
    page.hidden=false;
    window.scrollTo(0,0);
  }

  const run=()=>setTimeout(build,500);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",run,{once:true});
  else run();
})();
