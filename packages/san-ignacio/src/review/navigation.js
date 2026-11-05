import {esc} from './html.js';
export const navigationGroups=[
 ['Vida litúrgica','/vida-liturgica',[['Horarios de misa','/vida-liturgica#horarios-misa'],['Intenciones','/vida-liturgica#mass-intentions'],['Confesiones','/vida-liturgica#confesiones']]],
 ['Sacramentos','/sacramentos',[['Bautismo','/sacramentos#bautismo'],['Primera Comunión','/sacramentos#primera-comunion'],['Confirmación','/sacramentos#confirmacion'],['Matrimonio','/sacramentos#matrimonio'],['Confesiones','/sacramentos#confesiones']]],
 ['Pastoral','/pastoral',[['Catecismo','/pastoral#catecismo',[['Primera Comunión','/pastoral#catecismo-primera-comunion'],['Confirmación','/pastoral#catecismo-confirmacion']]],['Áreas pastorales','/pastoral#areas-pastorales'],['Grupos y comunidad','/pastoral#grupos-comunidad'],['Música','/musica']]],
 ['Nosotros','/nosotros',[]],
 ['Agua de San Ignacio','/agua-de-san-ignacio',[]],
 ['Historia','/historia',[]],
 ['Galería','/galeria',[]],
 ['Visítanos','/contacto',[]]
];
function item([label,url,children=[]],path,key,depth=0){
 if(!children.length)return `<a href="${esc(url)}" class="${depth?'text-link nav-child-link':'nav-heading'}" ${depth?'':'data-primary-link'} ${path===url?'aria-current="page"':''}>${esc(label)}</a>`;
 const current=path===url.split('#')[0];
 return `<div class="nav-group ${depth?'nav-nested':''}" data-nav-group data-depth="${depth}"><div class="nav-entry"><button type="button" class="${depth?'nav-child-link':'nav-heading'} nav-trigger${current?' is-current':''}" data-nav-toggle aria-expanded="false" aria-controls="nav-submenu-${key}"><span>${esc(label)}</span><span class="nav-trigger-arrow" aria-hidden="true">⌄</span></button></div><div class="nav-submenu" id="nav-submenu-${key}" hidden>${item([label,url],path,key+'-home',depth+1)}${children.map((child,index)=>item(child,path,key+'-'+index,depth+1)).join('')}</div></div>`;
}
export function navigation(path){return navigationGroups.map((group,index)=>item(group,path,String(index))).join('');}
