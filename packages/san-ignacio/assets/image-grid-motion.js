// Animate only successful moves, then let the remaining cards settle in their new positions.
export async function updateImageGrid(grid, removedUrls, render, {reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}={}) {
  if (!grid?.querySelectorAll) {render();return;}
  const cards=[...grid.querySelectorAll('[data-image-card]')];
  const removed=new Set(removedUrls);
  const positions=new Map(cards.filter(card=>!removed.has(card.dataset.imageCard)).map(card=>[card.dataset.imageCard,card.getBoundingClientRect()]));
  const animate=async(element,frames,options)=>{try{await element.animate?.(frames,options)?.finished;}catch{}};
  const previousInert=grid.inert;
  grid.inert=true;
  try{
    if(!reducedMotion)await Promise.all(cards.filter(card=>removed.has(card.dataset.imageCard)).map(card=>animate(card,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.97)'}],{duration:180,easing:'ease-out',fill:'forwards'})));
    render();
    if(!reducedMotion)await Promise.all([...grid.querySelectorAll('[data-image-card]')].map(card=>{
      const before=positions.get(card.dataset.imageCard);if(!before)return;
      const after=card.getBoundingClientRect(),x=before.left-after.left,y=before.top-after.top;
      if(x||y)return animate(card,[{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'});
    }));
  }finally{grid.inert=previousInert;}
}
