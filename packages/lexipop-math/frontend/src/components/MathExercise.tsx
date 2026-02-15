import { useState, useEffect, useRef } from 'react';
import './MathExercise.css';

type Language = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it';
type Mode = 'operacion' | 'problema';
type Section = 'aritmetica' | 'algebra' | 'funciones';

type ReflexId =
  | 'ARIT_SUMA' | 'ARIT_MULT' | 'ARIT_DIV'
  | 'ARIT_NEG' | 'ARIT_MULTIPLOS'
  | 'ARIT_POTENCIAS' | 'ARIT_RAICES'
  | 'ARIT_FRACCIONES' | 'ARIT_PORCENTAJES' | 'ARIT_REGLA3'
  | 'ALG_EVAL' | 'ALG_EC_SIMPLE' | 'ALG_EC_AVZ' | 'ALG_PRODUCTOS'
  | 'FUNC_LINEAL' | 'FUNC_CUAD';

interface Exercise {
  question: string;
  correctAnswer: number;
  reflexId: ReflexId;
  problema?: string;
  isEquation?: boolean;
}

interface ReflexProgress {
  reflexId: ReflexId;
  correct: number;
  total: number;
  lastAttempts: boolean[];
  mastered: boolean;
  level: number;
}

interface Stats {
  currentReflex: ReflexId;
  reflexes: Map<ReflexId, ReflexProgress>;
  masteredReflexes: Set<ReflexId>;
  sessionExercises: number;
}

const SECTION_REFLEXES: Record<Section, ReflexId[]> = {
  aritmetica: [
    'ARIT_SUMA', 'ARIT_MULT', 'ARIT_DIV',
    'ARIT_NEG', 'ARIT_MULTIPLOS',
    'ARIT_POTENCIAS', 'ARIT_RAICES',
    'ARIT_FRACCIONES', 'ARIT_PORCENTAJES', 'ARIT_REGLA3'
  ],
  algebra: ['ALG_EVAL', 'ALG_EC_SIMPLE', 'ALG_EC_AVZ', 'ALG_PRODUCTOS'],
  funciones: ['FUNC_LINEAL', 'FUNC_CUAD'],
};

const REFLEX_NAMES: Record<ReflexId, Record<Language, string>> = {
  ARIT_SUMA:       { es:'Sumas y restas',        en:'Addition & subtraction', fr:'Additions/soustractions', de:'Addition & Subtraktion', pt:'Somas e subtrações',    it:'Addizioni e sottrazioni' },
  ARIT_MULT:       { es:'Multiplicación',         en:'Multiplication',         fr:'Multiplication',          de:'Multiplikation',         pt:'Multiplicação',          it:'Moltiplicazione' },
  ARIT_DIV:        { es:'División',               en:'Division',               fr:'Division',                de:'Division',               pt:'Divisão',                it:'Divisione' },
  ARIT_NEG:        { es:'Números negativos',      en:'Negative numbers',       fr:'Nombres négatifs',        de:'Negative Zahlen',        pt:'Números negativos',      it:'Numeri negativi' },
  ARIT_MULTIPLOS:  { es:'Múltiplos y primos',     en:'Multiples & primes',     fr:'Multiples et premiers',   de:'Vielfache & Primzahlen', pt:'Múltiplos e primos',     it:'Multipli e primi' },
  ARIT_POTENCIAS:  { es:'Potencias',              en:'Powers',                 fr:'Puissances',              de:'Potenzen',               pt:'Potências',              it:'Potenze' },
  ARIT_RAICES:     { es:'Raíces cuadradas',       en:'Square roots',           fr:'Racines carrées',         de:'Quadratwurzeln',         pt:'Raízes quadradas',       it:'Radici quadrate' },
  ARIT_FRACCIONES: { es:'Fracciones',             en:'Fractions',              fr:'Fractions',               de:'Brüche',                 pt:'Frações',                it:'Frazioni' },
  ARIT_PORCENTAJES:{ es:'Porcentajes',            en:'Percentages',            fr:'Pourcentages',            de:'Prozentrechnungen',      pt:'Porcentagens',           it:'Percentuali' },
  ARIT_REGLA3:     { es:'Regla de tres',          en:'Rule of three',          fr:'Règle de trois',          de:'Dreisatz',               pt:'Regra de três',          it:'Regola del tre' },
  ALG_EVAL:        { es:'Evaluar expresiones',    en:'Evaluate expressions',   fr:'Evaluer expressions',     de:'Ausdruecke auswerten',   pt:'Avaliar expressoes',     it:'Valutare espressioni' },
  ALG_EC_SIMPLE:   { es:'Ecuaciones simples',     en:'Simple equations',       fr:'Equations simples',       de:'Einfache Gleichungen',   pt:'Equacoes simples',       it:'Equazioni semplici' },
  ALG_EC_AVZ:      { es:'Ecuaciones avanzadas',   en:'Advanced equations',     fr:'Equations avancees',      de:'Erweiterte Gleichungen', pt:'Equacoes avancadas',     it:'Equazioni avanzate' },
  ALG_PRODUCTOS:   { es:'Productos notables',     en:'Notable products',       fr:'Produits notables',       de:'Bemerkenswerte Produkte',pt:'Produtos notaveis',      it:'Prodotti notevoli' },
  FUNC_LINEAL:     { es:'Funcion lineal',         en:'Linear function',        fr:'Fonction lineaire',       de:'Lineare Funktion',       pt:'Funcao linear',          it:'Funzione lineare' },
  FUNC_CUAD:       { es:'Funcion cuadratica',     en:'Quadratic function',     fr:'Fonction quadratique',    de:'Quadratische Funktion',  pt:'Funcao quadratica',      it:'Funzione quadratica' },
};

const T = {
  es: {
    sections: { aritmetica: 'Aritmetica', algebra: 'Algebra', funciones: 'Funciones' },
    ui: { operacion: 'Operacion', problema: 'Problema', level: 'Nivel', send: 'Enviar', placeholder: '?', lexi: 'Lexi:', menu: 'Menu', help: 'Ayuda', resultado: 'Resultado', loading: 'Analizando...' },
    lexi: { correct: 'Correcto.', incorrect: 'Incorrecto.', helpOffer: 'Quieres una pista?' }
  },
  en: {
    sections: { aritmetica: 'Arithmetic', algebra: 'Algebra', funciones: 'Functions' },
    ui: { operacion: 'Operation', problema: 'Problem', level: 'Level', send: 'Send', placeholder: '?', lexi: 'Lexi:', menu: 'Menu', help: 'Help', resultado: 'Result', loading: 'Analyzing...' },
    lexi: { correct: 'Correct.', incorrect: 'Incorrect.', helpOffer: 'Want a hint?' }
  },
  fr: {
    sections: { aritmetica: 'Arithmetique', algebra: 'Algebre', funciones: 'Fonctions' },
    ui: { operacion: 'Operation', problema: 'Probleme', level: 'Niveau', send: 'Envoyer', placeholder: '?', lexi: 'Lexi:', menu: 'Menu', help: 'Aide', resultado: 'Resultat', loading: 'Analyse...' },
    lexi: { correct: 'Correct.', incorrect: 'Incorrect.', helpOffer: 'Voulez-vous un indice?' }
  },
  de: {
    sections: { aritmetica: 'Arithmetik', algebra: 'Algebra', funciones: 'Funktionen' },
    ui: { operacion: 'Operation', problema: 'Problem', level: 'Niveau', send: 'Senden', placeholder: '?', lexi: 'Lexi:', menu: 'Menu', help: 'Hilfe', resultado: 'Ergebnis', loading: 'Analysiere...' },
    lexi: { correct: 'Richtig.', incorrect: 'Falsch.', helpOffer: 'Mochten Sie einen Hinweis?' }
  },
  pt: {
    sections: { aritmetica: 'Aritmetica', algebra: 'Algebra', funciones: 'Funcoes' },
    ui: { operacion: 'Operacao', problema: 'Problema', level: 'Nivel', send: 'Enviar', placeholder: '?', lexi: 'Lexi:', menu: 'Menu', help: 'Ajuda', resultado: 'Resultado', loading: 'Analisando...' },
    lexi: { correct: 'Correto.', incorrect: 'Incorreto.', helpOffer: 'Quer uma dica?' }
  },
  it: {
    sections: { aritmetica: 'Aritmetica', algebra: 'Algebra', funciones: 'Funzioni' },
    ui: { operacion: 'Operazione', problema: 'Problema', level: 'Livello', send: 'Invia', placeholder: '?', lexi: 'Lexi:', menu: 'Menu', help: 'Aiuto', resultado: 'Risultato', loading: 'Analisi...' },
    lexi: { correct: 'Corretto.', incorrect: 'Non corretto.', helpOffer: 'Vuoi un suggerimento?' }
  }
};

const HELP_SYSTEM_PROMPT = `You are a mental math strategy engine.
Given a mathematical operation, you must:
1. Analyze the structure of the numbers.
2. Select EXACTLY two solution methods that are:
   - Mentally efficient
   - Structurally appropriate for the specific numbers
   - Low cognitive load
3. Do not list more than two methods.
4. Do not mention discarded methods.
5. Do not include filler explanations.
6. Show each method clearly named.
7. Execute both methods step by step using the actual numbers.
8. Keep explanations concise and structural, not pedagogical fluff.
If a method is suboptimal for the given operation, do not include it.
Respond in the same language as instructed.`;

async function fetchHelpFromAPI(question: string, answer: number, lang: Language): Promise<string> {
  const response = await fetch('/api/help', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, lang })
  });
  const data = await response.json();
  return data.help || '-';
}

function renderHelp(text: string) {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .split('\n').map(line => `<p>${line}</p>`).join('');
  return <div className="help-text" dangerouslySetInnerHTML={{ __html: html }} />;
}

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function smallestPrimeFactor(n: number): number {
  if (n <= 1) return n;
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return i;
  return n;
}

function gen(reflexId: ReflexId, level: number): Exercise {
  switch (reflexId) {
    case 'ARIT_SUMA': {
      if (level <= 1) { const a=rnd(1,9),b=rnd(1,9); return {question:`${a} + ${b}`,correctAnswer:a+b,reflexId,problema:`Tienes ${a} canicas y encuentras ${b} mas. Cuantas tienes?`}; }
      if (level===2)  { const a=rnd(10,19),b=rnd(1,9); return {question:`${a} + ${b}`,correctAnswer:a+b,reflexId}; }
      if (level===3)  { const a=rnd(14,19),b=rnd(3,9); return {question:`${a} + ${b}`,correctAnswer:a+b,reflexId}; }
      if (level===4)  { const a=rnd(11,49),b=rnd(11,49); return {question:`${a} + ${b}`,correctAnswer:a+b,reflexId,problema:`Una tienda vende ${a} articulos en la manana y ${b} en la tarde. Total?`}; }
      if (level===5)  { const a=rnd(25,79),b=rnd(25,79); return {question:`${a} + ${b}`,correctAnswer:a+b,reflexId}; }
      if (level===6)  { const a=rnd(100,499),b=rnd(10,99); return {question:`${a} + ${b}`,correctAnswer:a+b,reflexId}; }
      if (level===7)  { const a=rnd(100,799),b=rnd(100,799); return {question:`${a} + ${b}`,correctAnswer:a+b,reflexId}; }
      if (level===8)  { const b=rnd(1,4),a=rnd(b+20,79); return {question:`${a} - ${b}`,correctAnswer:a-b,reflexId,problema:`Tenias ${a} puntos y perdiste ${b}. Cuantos te quedan?`}; }
      if (level===9)  { const b=rnd(11,29),a=rnd(b+10,79); return {question:`${a} - ${b}`,correctAnswer:a-b,reflexId}; }
      if (level===10) { const b=rnd(7,29),a=rnd(b+5,79); return {question:`${a} - ${b}`,correctAnswer:a-b,reflexId}; }
      const a=rnd(100,999),b=rnd(10,a-10); return {question:`${a} - ${b}`,correctAnswer:a-b,reflexId};
    }
    case 'ARIT_MULT': {
      const tables:Record<number,number>={1:1,2:2,3:5,4:10,5:3,6:4,7:6,8:7,9:8,10:9};
      if (level>=1&&level<=10){ const t=tables[level],b=rnd(2,12); return {question:`${t} x ${b}`,correctAnswer:t*b,reflexId,problema:`${b} cajas con ${t} articulos cada una. Total?`}; }
      if (level===11){ const a=pick([1,2,3,4,5]),b=rnd(2,12); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId}; }
      if (level===12){ const a=pick([6,7,8,9]),b=rnd(2,12); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId}; }
      if (level===13){ const a=rnd(2,12),b=rnd(2,12); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId}; }
      if (level===14){ const a=rnd(2,99),f=pick([10,100,1000]); return {question:`${a} x ${f}`,correctAnswer:a*f,reflexId}; }
      if (level===15){ const a=rnd(12,39),b=rnd(2,9); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId,problema:`${b} cajones con ${a} botellas cada uno. Total?`}; }
      if (level===16){ const a=rnd(21,79),b=rnd(3,9); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId}; }
      if (level===17){ const a=rnd(100,399),b=rnd(2,9); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId}; }
      if (level===18){ const a=rnd(11,39),b=rnd(11,39); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId}; }
      if (level===19){ const a=rnd(23,79),b=rnd(23,79); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId}; }
      const a=rnd(100,999),b=rnd(2,9); return {question:`${a} x ${b}`,correctAnswer:a*b,reflexId};
    }
    case 'ARIT_DIV': {
      if (level<=2){ const d=level===1?pick([1,2]):pick([5,10]),q=rnd(2,10); return {question:`${d*q} / ${d}`,correctAnswer:q,reflexId,problema:`${d*q} naranjas en ${d} bolsas iguales. Cuantas por bolsa?`}; }
      if (level<=5){ const d=pick([[3,4],[6,7],[8,9]][level-3]),q=rnd(2,10); return {question:`${d*q} / ${d}`,correctAnswer:q,reflexId}; }
      if (level===6){ const d=rnd(2,9),q=rnd(2,9); return {question:`${d*q} / ${d}`,correctAnswer:q,reflexId}; }
      if (level===7){ const d=rnd(2,9),q=rnd(2,9),r=rnd(1,d-1); return {question:`${d*q+r} / ${d}`,correctAnswer:q,reflexId}; }
      if (level===8){ const a=rnd(1,99),f=pick([10,100,1000]); return {question:`${a*f} / ${f}`,correctAnswer:a,reflexId}; }
      const d=rnd(2,12),q=rnd(7,20); return {question:`${d*q} / ${d}`,correctAnswer:q,reflexId,problema:`${d*q} estudiantes en ${d} grupos iguales. Cuantos por grupo?`};
    }
    case 'ARIT_NEG': {
      if (level===1){ const a=rnd(3,9),b=rnd(1,a-1); return {question:`${a} + (-${b})`,correctAnswer:a-b,reflexId}; }
      if (level===2){ const b=rnd(3,9),a=rnd(1,b-1); return {question:`-${a} + ${b}`,correctAnswer:b-a,reflexId}; }
      if (level===3){ const a=rnd(2,9),b=rnd(2,9); return {question:`-${a} + (-${b})`,correctAnswer:-(a+b),reflexId}; }
      if (level===4){ const a=rnd(3,9),b=rnd(1,5); return {question:`${a} - (-${b})`,correctAnswer:a+b,reflexId}; }
      if (level===5){ const a=rnd(2,7),b=rnd(2,9); return {question:`-${a} - ${b}`,correctAnswer:-(a+b),reflexId}; }
      if (level===6){ const a=rnd(5,9),b=rnd(1,a-2); return {question:`-${a} - (-${b})`,correctAnswer:-(a-b),reflexId}; }
      if (level===7){ const a=rnd(2,9),b=rnd(2,9); return {question:`${a} x (-${b})`,correctAnswer:-(a*b),reflexId}; }
      if (level===8){ const a=rnd(2,9),b=rnd(2,9); return {question:`(-${a}) x ${b}`,correctAnswer:-(a*b),reflexId}; }
      if (level===9){ const a=rnd(2,9),b=rnd(2,9); return {question:`(-${a}) x (-${b})`,correctAnswer:a*b,reflexId}; }
      if (level===10){ const d=rnd(2,7),q=rnd(2,9); return {question:`(-${d*q}) / ${d}`,correctAnswer:-q,reflexId}; }
      if (level===11){ const d=rnd(2,7),q=rnd(2,9); return {question:`(-${d*q}) / (-${d})`,correctAnswer:q,reflexId}; }
      const a=rnd(2,8),b=rnd(2,8),c=rnd(1,5);
      return {question:`-${a} + ${b} x ${c}`,correctAnswer:-a+b*c,reflexId};
    }
    case 'ARIT_MULTIPLOS': {
      if (level<=3){ const base=[2,5,3][level-1],m=rnd(2,12); return {question:`Es ${base*m} multiplo de ${base}?\n1=Si  0=No`,correctAnswer:1,reflexId}; }
      if (level===4){ const n=pick([12,16,18,20,24,30,36]),d=pick([2,3,4,6]); return {question:`Es ${n} divisible entre ${d}?\n1=Si  0=No`,correctAnswer:n%d===0?1:0,reflexId}; }
      if (level<=6){ const primes=[2,3,5,7,11,13,17,19],notP=[4,6,8,9,10,12,14,15]; const isPrime=Math.random()>0.5,n=isPrime?pick(primes):pick(notP); return {question:`Es ${n} primo?\n1=Si  0=No`,correctAnswer:isPrime?1:0,reflexId}; }
      if (level===7){ const pairs:Array<[number,number]>=[[4,6],[3,5],[4,10],[6,8]]; const [a,b]=pick(pairs); return {question:`mcm(${a}, ${b})`,correctAnswer:(a*b)/gcd(a,b),reflexId}; }
      if (level===8){ const pairs:Array<[number,number]>=[[12,18],[8,12],[15,20],[6,9]]; const [a,b]=pick(pairs); return {question:`mcd(${a}, ${b})`,correctAnswer:gcd(a,b),reflexId}; }
      const n=rnd(30,100),f=smallestPrimeFactor(n);
      return {question:`Menor factor primo de ${n}`,correctAnswer:f,reflexId};
    }
    case 'ARIT_POTENCIAS': {
      if (level<=2){ const b=rnd(2+level*2,4+level*3); return {question:`${b}^2`,correctAnswer:b*b,reflexId}; }
      if (level===3){ const b=pick([2,3,4]); return {question:`${b}^3`,correctAnswer:b*b*b,reflexId}; }
      if (level===4){ const e=rnd(2,6); return {question:`2^${e}`,correctAnswer:Math.pow(2,e),reflexId}; }
      if (level===5){ return {question:`5^0`,correctAnswer:1,reflexId}; }
      if (level===6){ const b=pick([-2,-3]),e=pick([2,3]); return {question:`(${b})^${e}`,correctAnswer:Math.pow(b,e),reflexId}; }
      if (level===7){ const n=rnd(2,4),e=rnd(3,5); return {question:`${n}^${e}`,correctAnswer:Math.pow(n,e),reflexId}; }
      const a=rnd(2,9); return {question:`${a} x 10^3`,correctAnswer:a*1000,reflexId};
    }
    case 'ARIT_RAICES': {
      const groups=[[4,9,16],[25,36,49],[64,81,100],[121,144,169,196,225]];
      const g=groups[Math.min(level-1,groups.length-1)];
      const n=pick(g);
      return {question:`raiz(${n})`,correctAnswer:Math.sqrt(n),reflexId};
    }
    case 'ARIT_FRACCIONES': {
      const configs:Array<[number,number,number]>=[[1,2,20],[1,4,16],[1,3,15],[2,3,12],[3,4,20],[1,5,25],[2,5,30],[3,5,25],[5,6,24],[7,8,32]];
      const [num,den,base]=configs[Math.min(level-1,configs.length-1)];
      const adj=Math.ceil(base/den)*den;
      return {question:`${num}/${den} de ${adj}`,correctAnswer:(num/den)*adj,reflexId,problema:`De ${adj} estudiantes, ${num}/${den} aprueban. Cuantos aprueban?`};
    }
    case 'ARIT_PORCENTAJES': {
      const configs:Array<[number,number]>=[[50,80],[25,60],[10,90],[20,50],[30,70],[5,80],[15,60],[75,40],[1,450],[12,200]];
      const [pct,base]=configs[Math.min(level-1,configs.length-1)];
      return {question:`${pct}% de ${base}`,correctAnswer:Math.round(base*pct/100*100)/100,reflexId,problema:`Un producto cuesta $${base}. Descuento del ${pct}%. Cuanto ahorras?`};
    }
    case 'ARIT_REGLA3': {
      if (level<=2){ const u=rnd(2,5),ppu=rnd(2,8),qty=rnd(2,9); return {question:`Si ${u} kg cuestan ${u*ppu}€\nCuanto cuestan ${qty} kg?`,correctAnswer:qty*ppu,reflexId,problema:`En el mercado, ${u} kg de manzanas cuestan ${u*ppu}€. Cuanto pagas por ${qty} kg?`}; }
      const w=rnd(2,4),h=rnd(4,12),nw=w*rnd(2,3);
      return {question:`${w} obreros tardan ${h}h\nCuanto tardan ${nw} obreros?`,correctAnswer:(w*h)/nw,reflexId,problema:`${w} obreros tardan ${h} horas en pintar una pared. Cuanto tardan ${nw} obreros?`};
    }
    case 'ALG_EVAL': {
      if (level===1){ const c=rnd(1,9),x=rnd(1,8); return {question:`x + ${c}  (x = ${x})`,correctAnswer:x+c,reflexId,isEquation:true}; }
      if (level===2){ const a=rnd(2,5),c=rnd(1,8),x=rnd(2,8); return {question:`${a}x - ${c}  (x = ${x})`,correctAnswer:a*x-c,reflexId,isEquation:true}; }
      if (level===3){ const a=rnd(2,5),c=rnd(1,5),x=-rnd(1,4); return {question:`${a}x + ${c}  (x = ${x})`,correctAnswer:a*x+c,reflexId,isEquation:true}; }
      if (level===4){ const a=rnd(2,4),c=rnd(2,6),x=rnd(2,6); return {question:`${a}(x + ${c})  (x = ${x})`,correctAnswer:a*(x+c),reflexId,isEquation:true}; }
      if (level===5){ const x=rnd(2,9); return {question:`x^2  (x = ${x})`,correctAnswer:x*x,reflexId,isEquation:true}; }
      if (level===6){ const a=rnd(2,4),c=rnd(1,5),x=rnd(2,6); return {question:`${a}x^2 - ${c}  (x = ${x})`,correctAnswer:a*x*x-c,reflexId,isEquation:true}; }
      if (level===7){ const x=rnd(2,7),c1=rnd(1,4),c2=rnd(1,4); return {question:`(x + ${c1})(x - ${c2})  (x = ${x})`,correctAnswer:(x+c1)*(x-c2),reflexId,isEquation:true}; }
      const x=rnd(1,5),y=rnd(1,5),a=rnd(1,4),b=rnd(1,4);
      return {question:`${a}x + ${b}y  (x=${x}, y=${y})`,correctAnswer:a*x+b*y,reflexId,isEquation:true};
    }
    case 'ALG_EC_SIMPLE': {
      if (level===1){ const c=rnd(1,9),x=rnd(1,9); return {question:`x + ${c} = ${x+c}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===2){ const c=rnd(1,9),x=rnd(c+1,15); return {question:`x - ${c} = ${x-c}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===3){ const c=rnd(1,8),x=rnd(1,8); return {question:`${c} - x = ${c-x}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===4){ const a=rnd(2,9),x=rnd(1,9); return {question:`${a}x = ${a*x}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===5){ const d=rnd(2,6),x=rnd(2,9); return {question:`x/${d} = ${x}`,correctAnswer:x*d,reflexId,isEquation:true}; }
      if (level===6){ const a=rnd(2,5),b=rnd(1,6),x=rnd(1,8); return {question:`${a}x + ${b} = ${a*x+b}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===7){ const a=rnd(2,5),b=rnd(1,6),x=rnd(1,8); return {question:`${a}x - ${b} = ${a*x-b}`,correctAnswer:x,reflexId,isEquation:true}; }
      const d=rnd(2,4),b=rnd(1,5),x=rnd(1,8);
      return {question:`x/${d} + ${b} = ${x+b}`,correctAnswer:x*d,reflexId,isEquation:true};
    }
    case 'ALG_EC_AVZ': {
      if (level===1){ const a=rnd(2,5),b=rnd(1,9),x=rnd(2,8); return {question:`${a}x + ${b} = ${a*x+b}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===2){ const a=rnd(2,5),b=rnd(1,9),x=rnd(2,8); return {question:`${a}x - ${b} = ${a*x-b}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===3){ const a=rnd(2,5),b=rnd(1,5),x=rnd(1,5); return {question:`${b} - ${a}x = ${b-a*x}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===4){ const a=rnd(2,5),b=rnd(1,5),x=rnd(2,8); return {question:`${a}x + ${b} = ${a-1}x + ${b+x}`,correctAnswer:x,reflexId,isEquation:true}; }
      if (level===5){ const a=rnd(2,4),b=rnd(2,6),x=rnd(2,8); return {question:`${a}(x - ${b}) = ${a*(x-b)}`,correctAnswer:x,reflexId,isEquation:true}; }
      const a=rnd(3,6),b=rnd(1,9),x=rnd(2,10);
      return {question:`${a}x - ${b} = ${a-1}x + ${(a*x-b)-((a-1)*x)}`,correctAnswer:x,reflexId,isEquation:true};
    }
    case 'ALG_PRODUCTOS': {
      if (level<=2){ const pairs=[[3,2],[5,2],[4,3],[6,1]]; const [a,b]=pick(pairs); if(level===1) return {question:`(${a}+${b})^2`,correctAnswer:(a+b)*(a+b),reflexId,isEquation:true}; return {question:`(${a}-${b})^2`,correctAnswer:(a-b)*(a-b),reflexId,isEquation:true}; }
      if (level===3){ const a=rnd(3,9),b=rnd(1,a-1); return {question:`(${a}+${b})(${a}-${b})`,correctAnswer:a*a-b*b,reflexId,isEquation:true}; }
      if (level<=6){ const a=rnd(3,8),b=rnd(1,a-1); return {question:`(${a}+${b})(${a}-${b})`,correctAnswer:a*a-b*b,reflexId,isEquation:true}; }
      const b=rnd(1,4),x=rnd(2,5);
      return {question:`(x+${b})^2  (x=${x})`,correctAnswer:(x+b)*(x+b),reflexId,isEquation:true};
    }
    case 'FUNC_LINEAL': {
      const configs:Array<[number,number,number]>=[[2,1,3],[3,-4,2],[3,-4,-1],[1,2,6],[1,3,4],[-2,5,3],[-1,4,-2]];
      const [m,b,x]=configs[Math.min(level-1,configs.length-1)]??[rnd(1,5),rnd(-5,5),rnd(-4,6)];
      const bStr=b>=0?`+ ${b}`:`- ${Math.abs(b)}`;
      const result=Math.round((m*x+b)*100)/100;
      return {question:`f(x) = ${m}x ${bStr}  ->  f(${x})`,correctAnswer:result,reflexId,isEquation:true,problema:`Una empresa cobra $${Math.abs(m)} por hora. Base fija $${Math.abs(b)}. Cuanto cobra en ${x} horas?`};
    }
    case 'FUNC_CUAD': {
      if (level===1){ const x=rnd(2,7); return {question:`f(x) = x^2  ->  f(${x})`,correctAnswer:x*x,reflexId,isEquation:true}; }
      if (level===2){ const x=-rnd(1,5); return {question:`f(x) = x^2  ->  f(${x})`,correctAnswer:x*x,reflexId,isEquation:true}; }
      if (level===3){ const a=rnd(2,4),x=rnd(2,5); return {question:`f(x) = ${a}x^2  ->  f(${x})`,correctAnswer:a*x*x,reflexId,isEquation:true}; }
      if (level===4){ const c=rnd(1,9),x=rnd(2,6); return {question:`f(x) = x^2 + ${c}  ->  f(${x})`,correctAnswer:x*x+c,reflexId,isEquation:true}; }
      if (level===5){ const a=rnd(1,3),x=rnd(2,5); return {question:`f(x) = x^2 + ${a}x  ->  f(${x})`,correctAnswer:x*x+a*x,reflexId,isEquation:true}; }
      if (level===6){ const c=rnd(2,5),x=rnd(c+1,c+4); return {question:`f(x) = (x - ${c})^2  ->  f(${x})`,correctAnswer:(x-c)*(x-c),reflexId,isEquation:true}; }
      const a=rnd(1,3),b=rnd(1,5),c=rnd(-4,4),x=rnd(1,5);
      const cStr=c>=0?`+ ${c}`:`- ${Math.abs(c)}`;
      return {question:`f(x) = ${a}x^2 + ${b}x ${cStr}  ->  f(${x})`,correctAnswer:a*x*x+b*x+c,reflexId,isEquation:true};
    }
  }
}

// ─── Numeric Keypad Component ────────────────────────────────────────────────
interface NumericKeypadProps {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onToggleSign: () => void;
}

function NumericKeypad({ onDigit, onBackspace, onSubmit, onToggleSign }: NumericKeypadProps) {
  return (
    <div className="numeric-keypad">
      <div className="keypad-grid">
        {['7','8','9','4','5','6','1','2','3'].map(d => (
          <button key={d} className="key-btn key-digit" onClick={() => onDigit(d)}>{d}</button>
        ))}
        <button className="key-btn key-sign" onClick={onToggleSign}>±</button>
        <button className="key-btn key-digit" onClick={() => onDigit('0')}>0</button>
        <button className="key-btn key-backspace" onClick={onBackspace}>⌫</button>
      </div>
      <button className="key-btn key-submit" onClick={onSubmit}>✓</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MathExercise() {
  const [lang, setLang] = useState<Language>('es');
  const [langOpen, setLangOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('operacion');
  const [activeSection, setActiveSection] = useState<Section>('aritmetica');
  const [showReflexList, setShowReflexList] = useState(false);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [input, setInput] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [lexiMsg, setLexiMsg] = useState<string | null>(null);
  const [helpContent, setHelpContent] = useState<string | null>(null);
  const [helpLoading, setHelpLoading] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<Stats>(() => {
    try {
      const s = localStorage.getItem('lexipop-v4');
      if (s) { const p=JSON.parse(s); return {...p,reflexes:new Map(p.reflexes||[]),masteredReflexes:new Set(p.masteredReflexes||[])}; }
    } catch {}
    return {currentReflex:'ARIT_SUMA' as ReflexId, reflexes:new Map(), masteredReflexes:new Set(), sessionExercises:0};
  });

  const t = T[lang];

  // Cerrar dropdown de idioma al click afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const d={currentReflex:stats.currentReflex,reflexes:Array.from(stats.reflexes.entries()),masteredReflexes:Array.from(stats.masteredReflexes),sessionExercises:stats.sessionExercises};
    localStorage.setItem('lexipop-v4',JSON.stringify(d));
  },[stats]);

  const getLevel = (id:ReflexId) => stats.reflexes.get(id)?.level||1;
  const getProgress = (id:ReflexId) => { const p=stats.reflexes.get(id); return p?{correct:p.correct,total:p.total}:{correct:0,total:0}; };

  const generateNext = (reflexId?:ReflexId) => {
    const id = reflexId ?? stats.currentReflex;
    const level = getLevel(id);
    setExercise(gen(id, level));
    setWrongCount(0);
    setLexiMsg(null);
    setHelpContent(null);
    setHelpLoading(false);
    setInput('');
  };

  useEffect(() => { generateNext(); }, [stats.currentReflex]);

  useEffect(() => {
    for (const [sec,refs] of Object.entries(SECTION_REFLEXES)) {
      if ((refs as ReflexId[]).includes(stats.currentReflex)) {
        setActiveSection(sec as Section); break;
      }
    }
  },[stats.currentReflex]);

  const selectReflex = (id:ReflexId) => {
    setStats(prev=>({...prev,currentReflex:id}));
    setShowReflexList(false);
  };

  const handleSectionChange = (section:Section) => {
    if (activeSection === section) {
      setShowReflexList(prev => !prev);
    } else {
      setActiveSection(section);
      setShowReflexList(true);
      const first = SECTION_REFLEXES[section][0];
      if (stats.currentReflex !== first) {
        setStats(prev=>({...prev,currentReflex:first}));
      } else {
        generateNext(first);
      }
    }
  };

  const updateProgress = (id:ReflexId, correct:boolean) => {
    setStats(prev => {
      const reflexes=new Map(prev.reflexes);
      const cur=reflexes.get(id)||{reflexId:id,correct:0,total:0,lastAttempts:[],mastered:false,level:1};
      const attempts=[...cur.lastAttempts,correct].slice(-20);
      const newCorrect=cur.correct+(correct?1:0);
      const level=Math.floor(newCorrect/10)+1;
      const mastered=attempts.filter(Boolean).length>=16&&attempts.length>=20;
      reflexes.set(id,{reflexId:id,correct:newCorrect,total:cur.total+1,lastAttempts:attempts,mastered,level});
      const masteredReflexes=new Set(prev.masteredReflexes);
      if(mastered) masteredReflexes.add(id);
      return {...prev,reflexes,masteredReflexes,sessionExercises:prev.sessionExercises+1};
    });
  };

  const handleHelp = async () => {
    if (!exercise || helpLoading) return;
    if (helpContent) { setHelpContent(null); return; }
    setHelpLoading(true);
    try {
      const text = await fetchHelpFromAPI(exercise.question, exercise.correctAnswer, lang);
      setHelpContent(text);
    } catch {
      setHelpContent('Error al cargar la ayuda. Intenta de nuevo.');
    } finally {
      setHelpLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()||!exercise) return;
    const num = parseFloat(input.replace(',','.'));
    if (isNaN(num)) { setLexiMsg(t.lexi.incorrect); setInput(''); return; }
    const correct = Math.abs(num - exercise.correctAnswer) < 0.001;
    updateProgress(exercise.reflexId, correct);
    if (correct) {
      setLexiMsg(t.lexi.correct);
      setTimeout(() => { generateNext(); }, 900);
    } else {
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      setLexiMsg(newWrong >= 3 ? `${t.lexi.incorrect} ${t.lexi.helpOffer}` : t.lexi.incorrect);
      setTimeout(() => { setInput(''); }, 800);
    }
  };

  // Teclado físico (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') setInput(prev => prev + e.key);
      else if (e.key === '-') setInput(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
      else if (e.key === 'Backspace') setInput(prev => prev.slice(0, -1));
      else if (e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [input, exercise]);

  if (!exercise) return <div className="loading">Cargando...</div>;

  const reflexName = REFLEX_NAMES[stats.currentReflex]?.[lang] || stats.currentReflex;
  const progress = getProgress(stats.currentReflex);
  const level = getLevel(stats.currentReflex);
  const displayQuestion = exercise.isEquation ? exercise.question : `${exercise.question} =`;
  const displayProblema = mode === 'problema' && exercise.problema;

  return (
    <div className="lexipop-container">

      {/* HEADER */}
      <header className="app-header">
        <img src="/lexipop-logo.png" alt="LexiPop Math" className="app-logo" />

        {/* Dropdown de idioma */}
        <div className="lang-dropdown" ref={langRef}>
          <button className="lang-toggle" onClick={() => setLangOpen(o => !o)}>
            🌐 {lang.toUpperCase()} <span className="lang-chevron">{langOpen ? '▲' : '▼'}</span>
          </button>
          {langOpen && (
            <div className="lang-menu">
              {(['es','en','fr','de','pt','it'] as Language[]).map(l => (
                <button
                  key={l}
                  className={`lang-option ${lang === l ? 'active' : ''}`}
                  onClick={() => { setLang(l); setLangOpen(false); }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* TABS DE SECCIÓN */}
      <div className="section-tabs">
        {(Object.keys(SECTION_REFLEXES) as Section[]).map(sec => (
          <button
            key={sec}
            className={`section-tab ${activeSection===sec?'active':''}`}
            onClick={()=>handleSectionChange(sec)}
          >
            {t.sections[sec]}
            {activeSection===sec && <span className="chevron">{showReflexList ? ' ▲' : ' ▼'}</span>}
          </button>
        ))}
      </div>

      {/* MODO: Operación / Problema */}
      <div className="mode-selector">
        <button className={mode==='operacion'?'active':''} onClick={()=>setMode('operacion')}>{t.ui.operacion}</button>
        <button className={mode==='problema'?'active':''} onClick={()=>setMode('problema')}>{t.ui.problema}</button>
      </div>

      {/* LISTA DE REFLEJOS */}
      <div className={`reflex-list ${showReflexList ? 'open' : 'closed'}`}>
        {SECTION_REFLEXES[activeSection].map(id => {
          const p=getProgress(id),lv=getLevel(id),isA=stats.currentReflex===id,isM=stats.masteredReflexes.has(id);
          return (
            <button key={id} className={`reflex-item ${isA?'active':''} ${isM?'mastered':''}`} onClick={()=>selectReflex(id)}>
              <span className="reflex-item-name">{REFLEX_NAMES[id]?.[lang]}</span>
              <span className="reflex-item-stats">{t.ui.level} {lv} · {p.correct}/{p.total}{isM?' ✓':''}</span>
            </button>
          );
        })}
      </div>

      {/* TARJETA DE EJERCICIO */}
      <div className="challenge-card">
        <div className="challenge-reflex-label">
          {reflexName} — {t.ui.level} {level} · {progress.correct}/{progress.total}
        </div>

        {displayProblema && (
          <div className="challenge-context">{exercise.problema}</div>
        )}

        <div className="challenge-equation">{displayQuestion}</div>

        {/* Display de respuesta (sin input nativo) */}
        <div className="answer-display-wrapper">
          <span className="answer-label">{t.ui.resultado}:</span>
          <div className={`answer-display ${input ? 'has-value' : ''} ${lexiMsg === t.lexi.correct ? 'correct' : ''} ${lexiMsg && lexiMsg !== t.lexi.correct ? 'incorrect' : ''}`}>
            {input || <span className="answer-placeholder">{t.ui.placeholder}</span>}
          </div>
        </div>

        {/* Feedback + Ayuda */}
        <div className="card-footer">
          {lexiMsg && (
            <div className="lexi-feedback">
              <span className="lexi-name">{t.ui.lexi}</span> {lexiMsg}
            </div>
          )}
          <button
            className={`help-btn ${helpLoading?'loading':''} ${helpContent?'active':''}`}
            onClick={handleHelp}
            disabled={helpLoading}
          >
            {helpLoading ? t.ui.loading : t.ui.help}
          </button>
        </div>

        {(helpContent || helpLoading) && (
          <div className="help-box">
            {helpLoading
              ? <div className="help-loading-dots"><span/><span/><span/></div>
              : renderHelp(helpContent!)
            }
          </div>
        )}
      </div>

      {/* TECLADO NUMÉRICO */}
      <NumericKeypad
        onDigit={d => setInput(prev => prev + d)}
        onBackspace={() => setInput(prev => prev.slice(0, -1))}
        onSubmit={handleSubmit}
        onToggleSign={() => setInput(prev => prev.startsWith('-') ? prev.slice(1) : prev ? '-' + prev : '-')}
      />

    </div>
  );
}