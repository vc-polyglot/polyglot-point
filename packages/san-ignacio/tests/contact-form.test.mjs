import test from 'node:test';
import assert from 'node:assert/strict';
import {setupContactForm} from '../assets/contact-form.js';
test('La validación del formulario sigue el idioma público y se limpia al corregir un campo',()=>{
 const listeners={},form={addEventListener(type,callback){listeners[type]=callback;}},doc={documentElement:{lang:'fr'},querySelector:()=>form};setupContactForm(doc,{});
 const field={type:'email',validity:{valueMissing:true},setCustomValidity(value){this.message=value;}};listeners.invalid({target:field});assert.equal(field.message,'Veuillez remplir ce champ.');listeners.input({target:field});assert.equal(field.message,'');doc.documentElement.lang='en';field.validity.valueMissing=false;listeners.invalid({target:field});assert.equal(field.message,'Please enter a valid email address.');
});
