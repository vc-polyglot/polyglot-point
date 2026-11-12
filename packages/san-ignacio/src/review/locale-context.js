import {AsyncLocalStorage} from 'node:async_hooks';
import {normalizeLanguage} from '../../assets/i18n.js';
const context=new AsyncLocalStorage();
export const currentLanguage=()=>context.getStore()||'es';
export const withLanguage=(language,callback)=>context.run(normalizeLanguage(language),callback);
