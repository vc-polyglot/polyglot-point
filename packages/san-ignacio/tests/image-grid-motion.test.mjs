import test from 'node:test';
import assert from 'node:assert/strict';
import {updateImageGrid} from '../assets/image-grid-motion.js';

test('Una imagen movida se desvanece antes de reacomodar las restantes',async()=>{
 const events=[];
 const card=(id,left)=>({dataset:{imageCard:id},getBoundingClientRect:()=>({left,top:0}),animate(frames){events.push({id,frames});return {finished:Promise.resolve().then(()=>events.push('finished-'+id))};}});
 let cards=[card('moved',0),card('remaining',100)];const grid={inert:false,querySelectorAll:()=>cards};
 await updateImageGrid(grid,['moved'],()=>{assert.ok(events.includes('finished-moved'));events.push('render');cards=[card('remaining',0)];},{reducedMotion:false});
 assert.equal(events[0].id,'moved');assert.equal(events[0].frames[1].opacity,0);
 const reflow=events.find(event=>event?.id==='remaining');assert.equal(reflow.frames[0].transform,'translate(100px,0px)');assert.equal(grid.inert,false);
});

test('Movimiento reducido actualiza la cuadrícula sin animaciones',async()=>{
 let rendered=0,animated=0;const grid={inert:false,querySelectorAll:()=>[{dataset:{imageCard:'moved'},getBoundingClientRect:()=>({left:0,top:0}),animate(){animated++;}}]};
 await updateImageGrid(grid,['moved'],()=>rendered++,{reducedMotion:true});assert.equal(rendered,1);assert.equal(animated,0);assert.equal(grid.inert,false);
});
