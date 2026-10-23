/* SAN IGNACIO ROUTER V9 — navegación documental */
(() => {
  "use strict";
  const meta = {
    "/": ["San Ignacio de Loyola · Polanco","Iglesia de San Ignacio de Loyola, Polanco, Ciudad de México."],
    "/vida-liturgica":["Vida litúrgica · San Ignacio de Loyola","Horarios de misa, intenciones y celebraciones."],
    "/sacramentos":["Sacramentos · San Ignacio de Loyola","Información para preparar y celebrar los sacramentos."],
    "/pastoral":["Pastoral · San Ignacio de Loyola","Vida pastoral y formación de la comunidad."],
    "/agenda":["Agenda y eventos · San Ignacio de Loyola","Actividades y eventos de San Ignacio de Loyola."],
    "/nosotros":["Nosotros · San Ignacio de Loyola","Comunidad y equipo de San Ignacio de Loyola."],
    "/agua-de-san-ignacio":["Agua de San Ignacio · San Ignacio de Loyola","Información sobre el Agua de San Ignacio."],
    "/historia":["Historia · San Ignacio de Loyola","Historia, capilla, arquitectura y rectores."],
    "/galeria":["Galería · San Ignacio de Loyola","Galería fotográfica de San Ignacio de Loyola."],
    "/contacto":["Contacto · San Ignacio de Loyola","Datos de contacto de San Ignacio de Loyola."]
  };
  const path=(location.pathname||"/").replace(/\/+$/,"")||"/";
  const item=meta[path]||meta["/"];
  document.title=item[0];
  document.querySelector('meta[name="description"]')?.setAttribute("content",item[1]);
  let c=document.querySelector('link[rel="canonical"]');
  if(!c){c=document.createElement("link");c.rel="canonical";document.head.appendChild(c);}
  c.href=`${location.origin}${path}`;
  document.querySelector(".brand")?.setAttribute("href","/");
})();
