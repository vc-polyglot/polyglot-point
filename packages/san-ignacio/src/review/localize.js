import {translateText,normalizeLanguage} from '../../assets/i18n.js';
const encode=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const decode=value=>value.replace(/&#x([a-f0-9]+);/gi,(_,number)=>String.fromCodePoint(parseInt(number,16))).replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number))).replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&nbsp;','\u00a0').replaceAll('&amp;','&');
const voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
export function localizeHTML(html,language){
 if(!html)return html;const lang=normalizeLanguage(language);if(lang==='es')return html;
 const stack=[];const translated=value=>{const text=decode(value),result=translateText(text,lang);return result===text?value:encode(result);};
 return html.replace(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g,token=>{
  const parent=stack.at(-1);
  if(parent?.tag==='script'||parent?.tag==='style'){if(new RegExp('^<\\/'+parent.tag+'\\s*>$','i').test(token))stack.pop();return token;}
  if(token.startsWith('<!--')||token.startsWith('<!'))return token;
  if(token.startsWith('</')){const tag=token.match(/^<\/([\w-]+)/)?.[1]?.toLowerCase(),index=stack.findLastIndex(item=>item.tag===tag);if(index>=0)stack.splice(index);return token;}
  if(token.startsWith('<')){
   const tag=token.match(/^<([\w-]+)/)?.[1]?.toLowerCase();if(!tag)return token;
   const preserve=!!parent?.preserve||/\bdata-original-spanish\b/.test(token);
   if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push({tag,preserve});
   if(tag==='html')return token.replace(/\blang="[^"]*"/,'lang="'+lang+'"');
   if(preserve)return token;
   if(/\bdata-site-language="/.test(token)){const selected=token.match(/data-site-language="([^"]*)"/)?.[1];token=token.replace(/aria-pressed="[^"]*"/,'aria-pressed="'+String(selected===lang)+'"');}
   return token.replace(/\b(aria-label|aria-roledescription|title|alt|placeholder|data-caption|data-label|content)="([^"]*)"/g,(_all,name,value)=>name+'="'+translated(value)+'"');
  }
  return parent?.preserve?token:translated(token);
 });
}
