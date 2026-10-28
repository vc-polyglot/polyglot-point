import {esc} from './html.js';
export const navigationGroups=[
 ['Vida litúrgica','/vida-liturgica',[['Horarios de misa','/vida-liturgica#horarios-misa'],['Intenciones','/vida-liturgica#mass-intentions'],['Confesiones','/vida-liturgica#confesiones']]],
 ['Sacramentos','/sacramentos',[['Bautismo','/sacramentos#bautismo'],['Primera Comunión','/sacramentos#primera-comunion'],['Confirmación','/sacramentos#confirmacion'],['Matrimonio','/sacramentos#matrimonio']]],
 ['Pastoral','/pastoral',[['Catecismo','/pastoral#catecismo',[['Primera Comunión','/pastoral#catecismo-primera-comunion'],['Confirmación','/pastoral#catecismo-confirmacion']]],['Áreas pastorales','/pastoral#areas-pastorales'],['Música','/musica']]],
 ['Comunidad','/comunidad',[]],
 ['Nosotros','/nosotros',[]],
 ['Agua de San Ignacio','/agua-de-san-ignacio',[]],
 ['El templo','/historia',[['Galería','/galeria']]],
 ['Visítanos','/contacto',[]]
];
function item([label,url,children=[]],path,key,depth=0){
 const link=`<a href="${esc(url)}" class="${depth?'text-link nav-child-link':'nav-heading'}" ${depth?'':'data-primary-link'} ${path===url?'aria-current="page"':''}>${esc(label)}</a>`;
 if(!children.length)return link;
 return `<div class="nav-group ${depth?'nav-nested':''}" data-nav-group data-depth="${depth}"><div class="nav-entry">${link}<button type="button" class="nav-disclosure" data-nav-toggle aria-label="Opciones de ${esc(label)}" aria-expanded="false" aria-controls="nav-submenu-${key}"><span aria-hidden="true">⌄</span></button></div><div class="nav-submenu" id="nav-submenu-${key}" hidden>${children.map((child,index)=>item(child,path,key+'-'+index,depth+1)).join('')}</div></div>`;
}
export function navigation(path){return navigationGroups.map((group,index)=>item(group,path,String(index))).join('');}
