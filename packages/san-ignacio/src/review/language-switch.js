export function languageSwitch(){
 return '<div class="language-switch" role="group" aria-label="Idioma del sitio">'+[['es','ES','español'],['en','EN','inglés'],['fr','FR','francés']].map(([language,label,name])=>'<button type="button" lang="'+language+'" data-site-language="'+language+'" aria-label="Leer el sitio en '+name+'" aria-pressed="'+String(language==='es')+'">'+label+'</button>').join('')+'</div>';
}
