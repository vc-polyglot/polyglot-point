import { useState, useEffect, useRef } from 'react';
import './MathExercise.css';

type Language = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it';
type Section   = 'aritmetica' | 'algebra' | 'funciones';
type Theme     = 'neutro' | 'oscuro' | 'rojo' | 'azul' | 'gris' | 'oro';

type ReflexId =
  | 'ARIT_SUMA' | 'ARIT_MULT' | 'ARIT_DIV'
  | 'ARIT_NEG'  | 'ARIT_MULTIPLOS'
  | 'ARIT_POTENCIAS' | 'ARIT_RAICES'
  | 'ARIT_FRACCIONES' | 'ARIT_PORCENTAJES' | 'ARIT_REGLA3'
  | 'ALG_EVAL'  | 'ALG_EC_SIMPLE' | 'ALG_EC_AVZ' | 'ALG_PRODUCTOS'
  | 'FUNC_LINEAL' | 'FUNC_CUAD';

interface Exercise {
  question: string;
  correctAnswer: number;
  reflexId: ReflexId;
  isEquation?: boolean;
}
interface ReflexProgress {
  reflexId: ReflexId; correct: number; total: number;
  lastAttempts: boolean[]; mastered: boolean; level: number;
}
interface Stats {
  currentReflex: ReflexId;
  reflexes: Map<ReflexId, ReflexProgress>;
  masteredReflexes: Set<ReflexId>;
  sessionExercises: number;
}
const SECTION_REFLEXES: Record<Section, ReflexId[]> = {
  aritmetica: ['ARIT_SUMA','ARIT_MULT','ARIT_DIV','ARIT_NEG','ARIT_MULTIPLOS','ARIT_POTENCIAS','ARIT_RAICES','ARIT_FRACCIONES','ARIT_PORCENTAJES','ARIT_REGLA3'],
  algebra:    ['ALG_EVAL','ALG_EC_SIMPLE','ALG_EC_AVZ','ALG_PRODUCTOS'],
  funciones:  ['FUNC_LINEAL','FUNC_CUAD'],
};

const REFLEX_NAMES: Record<ReflexId, Record<Language, string>> = {
  ARIT_SUMA:       { es:'Sumas y restas',      en:'Addition & subtraction', fr:'Additions/soustractions', de:'Addition & Subtraktion', pt:'Somas e subtrações',   it:'Addizioni e sottrazioni' },
  ARIT_MULT:       { es:'Multiplicación',       en:'Multiplication',         fr:'Multiplication',          de:'Multiplikation',         pt:'Multiplicação',         it:'Moltiplicazione' },
  ARIT_DIV:        { es:'División',             en:'Division',               fr:'Division',                de:'Division',               pt:'Divisão',               it:'Divisione' },
  ARIT_NEG:        { es:'Números negativos',    en:'Negative numbers',       fr:'Nombres négatifs',        de:'Negative Zahlen',        pt:'Números negativos',     it:'Numeri negativi' },
  ARIT_MULTIPLOS:  { es:'Múltiplos y primos',   en:'Multiples & primes',     fr:'Multiples et premiers',   de:'Vielfache & Primzahlen', pt:'Múltiplos e primos',    it:'Multipli e primi' },
  ARIT_POTENCIAS:  { es:'Potencias',            en:'Powers',                 fr:'Puissances',              de:'Potenzen',               pt:'Potências',             it:'Potenze' },
  ARIT_RAICES:     { es:'Raíces cuadradas',     en:'Square roots',           fr:'Racines carrées',         de:'Quadratwurzeln',         pt:'Raízes quadradas',      it:'Radici quadrate' },
  ARIT_FRACCIONES: { es:'Fracciones',           en:'Fractions',              fr:'Fractions',               de:'Brüche',                 pt:'Frações',               it:'Frazioni' },
  ARIT_PORCENTAJES:{ es:'Porcentajes',          en:'Percentages',            fr:'Pourcentages',            de:'Prozentrechnungen',      pt:'Porcentagens',          it:'Percentuali' },
  ARIT_REGLA3:     { es:'Regla de tres',        en:'Rule of three',          fr:'Règle de trois',          de:'Dreisatz',               pt:'Regra de três',         it:'Regola del tre' },
  ALG_EVAL:        { es:'Evaluar expresiones',  en:'Evaluate expressions',   fr:'Evaluer expressions',     de:'Ausdruecke auswerten',   pt:'Avaliar expressoes',    it:'Valutare espressioni' },
  ALG_EC_SIMPLE:   { es:'Ecuaciones simples',   en:'Simple equations',       fr:'Equations simples',       de:'Einfache Gleichungen',   pt:'Equacoes simples',      it:'Equazioni semplici' },
  ALG_EC_AVZ:      { es:'Ecuaciones avanzadas', en:'Advanced equations',     fr:'Equations avancees',      de:'Erweiterte Gleichungen', pt:'Equacoes avancadas',    it:'Equazioni avanzate' },
  ALG_PRODUCTOS:   { es:'Productos notables',   en:'Notable products',       fr:'Produits notables',       de:'Bemerkenswerte Produkte',pt:'Produtos notaveis',     it:'Prodotti notevoli' },
  FUNC_LINEAL:     { es:'Funcion lineal',       en:'Linear function',        fr:'Fonction lineaire',       de:'Lineare Funktion',       pt:'Funcao linear',         it:'Funzione lineare' },
  FUNC_CUAD:       { es:'Funcion cuadratica',   en:'Quadratic function',     fr:'Fonction quadratique',    de:'Quadratische Funktion',  pt:'Funcao quadratica',     it:'Funzione quadratica' },
};

const T = {
  es: { sections:{ aritmetica:'Aritmetica', algebra:'Algebra', funciones:'Funciones' }, ui:{ level:'Nivel', placeholder:'?', lexi:'Lexi:', help:'Ayuda', resultado:'R:', loading:'Analizando...' }, lexi:{ correct:'Correcto.', incorrect:'Incorrecto.', helpOffer:'¿Quieres una pista?' } },
  en: { sections:{ aritmetica:'Arithmetic', algebra:'Algebra', funciones:'Functions' }, ui:{ level:'Level', placeholder:'?', lexi:'Lexi:', help:'Help', resultado:'R:', loading:'Analyzing...' }, lexi:{ correct:'Correct.', incorrect:'Incorrect.', helpOffer:'Want a hint?' } },
  fr: { sections:{ aritmetica:'Arithmetique', algebra:'Algebre', funciones:'Fonctions' }, ui:{ level:'Niveau', placeholder:'?', lexi:'Lexi:', help:'Aide', resultado:'R:', loading:'Analyse...' }, lexi:{ correct:'Correct.', incorrect:'Incorrect.', helpOffer:'Voulez-vous un indice?' } },
  de: { sections:{ aritmetica:'Arithmetik', algebra:'Algebra', funciones:'Funktionen' }, ui:{ level:'Niveau', placeholder:'?', lexi:'Lexi:', help:'Hilfe', resultado:'R:', loading:'Analysiere...' }, lexi:{ correct:'Richtig.', incorrect:'Falsch.', helpOffer:'Mochten Sie einen Hinweis?' } },
  pt: { sections:{ aritmetica:'Aritmetica', algebra:'Algebra', funciones:'Funcoes' }, ui:{ level:'Nivel', placeholder:'?', lexi:'Lexi:', help:'Ajuda', resultado:'R:', loading:'Analisando...' }, lexi:{ correct:'Correto.', incorrect:'Incorreto.', helpOffer:'Quer uma dica?' } },
  it: { sections:{ aritmetica:'Aritmetica', algebra:'Algebra', funciones:'Funzioni' }, ui:{ level:'Livello', placeholder:'?', lexi:'Lexi:', help:'Aiuto', resultado:'R:', loading:'Analisi...' }, lexi:{ correct:'Corretto.', incorrect:'Non corretto.', helpOffer:'Vuoi un suggerimento?' } },
};

// ─── Temas ────────────────────────────────────────────────────────────────────
const THEME_VARS: Record<Theme, Record<string, string>> = {
  neutro: { '--bg-from':'#5DADE2','--bg-mid':'#85C1E9','--bg-to':'#AED6F1','--accent':'93,173,226','--surface':'255,255,255','--text':'27,58,82' },
  oscuro: { '--bg-from':'#1a1a2e','--bg-mid':'#16213e','--bg-to':'#0f3460','--accent':'100,149,237','--surface':'200,220,255','--text':'200,220,255' },
  rojo:   { '--bg-from':'#c0392b','--bg-mid':'#e74c3c','--bg-to':'#f1948a','--accent':'231,76,60','--surface':'255,255,255','--text':'70,5,5' },
  azul:   { '--bg-from':'#1B2631','--bg-mid':'#2E4057','--bg-to':'#4A6FA5','--accent':'74,111,165','--surface':'200,220,255','--text':'200,220,255' },
  gris:   { '--bg-from':'#2C3E50','--bg-mid':'#546E7A','--bg-to':'#90A4AE','--accent':'144,164,174','--surface':'255,255,255','--text':'25,35,45' },
  oro:    { '--bg-from':'#7D5A0A','--bg-mid':'#C49A27','--bg-to':'#F0D060','--accent':'196,154,39','--surface':'255,255,255','--text':'55,35,5' },
};
const THEME_ICONS: Record<Theme, string> = { neutro:'🔵', oscuro:'🌑', rojo:'🔴', azul:'🔷', gris:'⬜', oro:'🟡' };

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(THEME_VARS[theme]).forEach(([k, v]) => root.style.setProperty(k, v));
}

// ─── Unicode italic ───────────────────────────────────────────────────────────
const ITALIC_MAP: Record<string, string> = {
  a:'𝑎',b:'𝑏',c:'𝑐',d:'𝑑',e:'𝑒',f:'𝑓',g:'𝑔',h:'ℎ',i:'𝑖',j:'𝑗',
  k:'𝑘',l:'𝑙',m:'𝑚',n:'𝑛',o:'𝑜',p:'𝑝',q:'𝑞',r:'𝑟',s:'𝑠',t:'𝑡',
  u:'𝑢',v:'𝑣',w:'𝑤',x:'𝑥',y:'𝑦',z:'𝑧',
};
function italicizeVars(str: string): string {
  return str.replace(/\b([a-z])\b/gi, (_, l) => ITALIC_MAP[l.toLowerCase()] ?? l);
}

// ─── Help ─────────────────────────────────────────────────────────────────────
async function fetchHelpFromAPI(question: string, answer: number, lang: Language): Promise<string> {
  const res  = await fetch('/api/math/help', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question, answer, lang}) });
  const data = await res.json();
  return data.help || '-';
}
function sanitizeLatex(text: string): string {
  return text
    .replace(/\\\(|\\\)/g,'').replace(/\\\[|\\\]/g,'')
    .replace(/\$\$/g,'').replace(/\$/g,'')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,'$1/$2')
    .replace(/\\sqrt\{([^}]+)\}/g,'√($1)')
    .replace(/\\cdot/g,'·').replace(/\\times/g,'×').replace(/\\div/g,'÷')
    .replace(/\\pm/g,'±').replace(/\\text\{([^}]+)\}/g,'$1')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g,'$1')
    .replace(/\\[a-zA-Z]+/g,'').replace(/[{}]/g,'');
}
function renderHelp(text: string) {
  const html = sanitizeLatex(text)
    .replace(/^(M[eéè]todo\s+\d+[:.:]|Method\s+\d+[:.:]|M[eé]thode\s+\d+[:.:]|Metodo\s+\d+[:.:])/gm,'<strong>$1</strong>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`(.*?)`/g,'<code>$1</code>')
    .split('\n').map(line => {
      const withItalic = line.replace(/\b([a-z])\b/gi, (_, l) => ITALIC_MAP[l.toLowerCase()] ?? l);
      return `<p>${withItalic}</p>`;
    }).join('');
  return <div className="help-text" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Paywall ──────────────────────────────────────────────────────────────────
function Paywall({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:999999,
      background:'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px', fontFamily:"'Georgia', 'Times New Roman', serif",
    }}>
      {/* Glow ambiental */}
      <div style={{
        position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)',
        width:'600px', height:'600px', borderRadius:'50%',
        background:'radial-gradient(circle, rgba(93,173,226,0.08) 0%, transparent 70%)',
        pointerEvents:'none',
      }}/>

      <div style={{
        position:'relative', maxWidth:'420px', width:'100%',
        background:'rgba(255,255,255,0.03)',
        border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:'24px',
        backdropFilter:'blur(40px)',
        boxShadow:'0 0 0 1px rgba(93,173,226,0.15), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        padding:'48px 40px 40px',
        textAlign:'center',
      }}>
        {/* Logo */}
        <div style={{ marginBottom:'32px' }}>
          <img src="/lexipop-logo.png" alt="LexiPop Math" style={{ height:'80px', opacity:0.95 }} />
        </div>

        {/* Social proof */}
        <div style={{
          display:'inline-block',
          background:'rgba(93,173,226,0.1)',
          border:'1px solid rgba(93,173,226,0.25)',
          borderRadius:'100px', padding:'6px 16px',
          fontSize:'12px', fontFamily:"'Helvetica Neue', sans-serif",
          color:'#7EC8E3', letterSpacing:'0.08em', textTransform:'uppercase',
          marginBottom:'24px',
        }}>
          Eres del top 17% de usuarios nuevos
        </div>

        {/* Headline */}
        <h2 style={{
          fontSize:'28px', fontWeight:400, color:'#f0f4f8',
          lineHeight:1.3, margin:'0 0 12px',
          fontFamily:"'Georgia', serif",
          letterSpacing:'-0.02em',
        }}>
          Tu mente ya está<br/>
          <span style={{ fontStyle:'italic', color:'#5DADE2' }}>cambiando.</span>
        </h2>

        <p style={{
          fontSize:'16px', color:'rgba(255,255,255,0.5)',
          fontFamily:"'Helvetica Neue', sans-serif",
          fontWeight:300, margin:'0 0 36px', lineHeight:1.6,
        }}>
          No te detengas ahora.
        </p>

        {/* Features */}
        <div style={{
          textAlign:'left', marginBottom:'36px',
          display:'flex', flexDirection:'column', gap:'12px',
        }}>
          {[
            'Ejercicios ilimitados',
            'Adaptación inteligente a tus errores',
            'Métodos mentales explicados con IA',
            'Entrenamiento progresivo real',
          ].map((f, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:'12px',
              fontFamily:"'Helvetica Neue', sans-serif",
              fontSize:'14px', color:'rgba(255,255,255,0.75)',
            }}>
              <span style={{
                width:'20px', height:'20px', borderRadius:'50%',
                background:'rgba(93,173,226,0.15)',
                border:'1px solid rgba(93,173,226,0.3)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'10px', color:'#5DADE2', flexShrink:0,
              }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={onUpgrade} style={{
          width:'100%', padding:'16px',
          background:'linear-gradient(135deg, #5DADE2 0%, #3498DB 100%)',
          border:'none', borderRadius:'14px',
          fontSize:'16px', fontWeight:600,
          fontFamily:"'Helvetica Neue', sans-serif",
          color:'#fff', cursor:'pointer', marginBottom:'12px',
          boxShadow:'0 4px 24px rgba(93,173,226,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          letterSpacing:'0.01em',
        }}>
          Continuar — $9.90 USD / mes
        </button>

        <p style={{
          fontSize:'12px', color:'rgba(255,255,255,0.3)',
          fontFamily:"'Helvetica Neue', sans-serif",
          margin:'0 0 20px',
        }}>
          Cancela cuando quieras.
        </p>

        {/* Exit */}
        <a href="https://lexipopmath.com" style={{
          fontSize:'12px', color:'rgba(255,255,255,0.25)',
          fontFamily:"'Helvetica Neue', sans-serif",
          textDecoration:'none', letterSpacing:'0.05em',
        }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

// ─── Generadores ──────────────────────────────────────────────────────────────
const rnd  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
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
      if (level<=1){const a=rnd(1,9),b=rnd(1,9);return{question:`${a} + ${b}`,correctAnswer:a+b,reflexId};}
      if (level===2){const a=rnd(10,19),b=rnd(1,9);return{question:`${a} + ${b}`,correctAnswer:a+b,reflexId};}
      if (level===3){const a=rnd(14,19),b=rnd(3,9);return{question:`${a} + ${b}`,correctAnswer:a+b,reflexId};}
      if (level===4){const a=rnd(11,49),b=rnd(11,49);return{question:`${a} + ${b}`,correctAnswer:a+b,reflexId};}
      if (level===5){const a=rnd(25,79),b=rnd(25,79);return{question:`${a} + ${b}`,correctAnswer:a+b,reflexId};}
      if (level===6){const a=rnd(100,499),b=rnd(10,99);return{question:`${a} + ${b}`,correctAnswer:a+b,reflexId};}
      if (level===7){const a=rnd(100,799),b=rnd(100,799);return{question:`${a} + ${b}`,correctAnswer:a+b,reflexId};}
      if (level===8){const b=rnd(1,4),a=rnd(b+20,79);return{question:`${a} − ${b}`,correctAnswer:a-b,reflexId};}
      if (level===9){const b=rnd(11,29),a=rnd(b+10,79);return{question:`${a} − ${b}`,correctAnswer:a-b,reflexId};}
      if (level===10){const b=rnd(7,29),a=rnd(b+5,79);return{question:`${a} − ${b}`,correctAnswer:a-b,reflexId};}
      const a=rnd(100,999),b=rnd(10,a-10);return{question:`${a} − ${b}`,correctAnswer:a-b,reflexId};
    }
    case 'ARIT_MULT': {
      const tables:Record<number,number>={1:1,2:2,3:5,4:10,5:3,6:4,7:6,8:7,9:8,10:9};
      if (level>=1&&level<=10){const t=tables[level],b=rnd(2,12);return{question:`${t} × ${b}`,correctAnswer:t*b,reflexId};}
      if (level===11){const a=pick([1,2,3,4,5]),b=rnd(2,12);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      if (level===12){const a=pick([6,7,8,9]),b=rnd(2,12);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      if (level===13){const a=rnd(2,12),b=rnd(2,12);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      if (level===14){const a=rnd(2,99),f=pick([10,100,1000]);return{question:`${a} × ${f}`,correctAnswer:a*f,reflexId};}
      if (level===15){const a=rnd(12,39),b=rnd(2,9);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      if (level===16){const a=rnd(21,79),b=rnd(3,9);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      if (level===17){const a=rnd(100,399),b=rnd(2,9);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      if (level===18){const a=rnd(11,39),b=rnd(11,39);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      if (level===19){const a=rnd(23,79),b=rnd(23,79);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};}
      const a=rnd(100,999),b=rnd(2,9);return{question:`${a} × ${b}`,correctAnswer:a*b,reflexId};
    }
    case 'ARIT_DIV': {
      if (level<=2){const d=level===1?pick([1,2]):pick([5,10]),q=rnd(2,10);return{question:`${d*q} ÷ ${d}`,correctAnswer:q,reflexId};}
      if (level<=5){const d=pick([[3,4],[6,7],[8,9]][level-3]),q=rnd(2,10);return{question:`${d*q} ÷ ${d}`,correctAnswer:q,reflexId};}
      if (level===6){const d=rnd(2,9),q=rnd(2,9);return{question:`${d*q} ÷ ${d}`,correctAnswer:q,reflexId};}
      if (level===7){const d=rnd(2,9),q=rnd(2,9),r=rnd(1,d-1);return{question:`${d*q+r} ÷ ${d}`,correctAnswer:q,reflexId};}
      if (level===8){const a=rnd(1,99),f=pick([10,100,1000]);return{question:`${a*f} ÷ ${f}`,correctAnswer:a,reflexId};}
      const d=rnd(2,12),q=rnd(7,20);return{question:`${d*q} ÷ ${d}`,correctAnswer:q,reflexId};
    }
    case 'ARIT_NEG': {
      if (level===1){const a=rnd(3,9),b=rnd(1,a-1);return{question:`${a} + (−${b})`,correctAnswer:a-b,reflexId};}
      if (level===2){const b=rnd(3,9),a=rnd(1,b-1);return{question:`−${a} + ${b}`,correctAnswer:b-a,reflexId};}
      if (level===3){const a=rnd(2,9),b=rnd(2,9);return{question:`−${a} + (−${b})`,correctAnswer:-(a+b),reflexId};}
      if (level===4){const a=rnd(3,9),b=rnd(1,5);return{question:`${a} − (−${b})`,correctAnswer:a+b,reflexId};}
      if (level===5){const a=rnd(2,7),b=rnd(2,9);return{question:`−${a} − ${b}`,correctAnswer:-(a+b),reflexId};}
      if (level===6){const a=rnd(5,9),b=rnd(1,a-2);return{question:`−${a} − (−${b})`,correctAnswer:-(a-b),reflexId};}
      if (level===7){const a=rnd(2,9),b=rnd(2,9);return{question:`${a} × (−${b})`,correctAnswer:-(a*b),reflexId};}
      if (level===8){const a=rnd(2,9),b=rnd(2,9);return{question:`(−${a}) × ${b}`,correctAnswer:-(a*b),reflexId};}
      if (level===9){const a=rnd(2,9),b=rnd(2,9);return{question:`(−${a}) × (−${b})`,correctAnswer:a*b,reflexId};}
      if (level===10){const d=rnd(2,7),q=rnd(2,9);return{question:`(−${d*q}) ÷ ${d}`,correctAnswer:-q,reflexId};}
      if (level===11){const d=rnd(2,7),q=rnd(2,9);return{question:`(−${d*q}) ÷ (−${d})`,correctAnswer:q,reflexId};}
      const a=rnd(2,8),b=rnd(2,8),c=rnd(1,5);return{question:`−${a} + ${b} × ${c}`,correctAnswer:-a+b*c,reflexId};
    }
    case 'ARIT_MULTIPLOS': {
      if (level<=3){const base=[2,5,3][level-1],m=rnd(2,12);return{question:`¿${base*m} es múltiplo de ${base}?\n1 = Sí   0 = No`,correctAnswer:1,reflexId};}
      if (level===4){const n=pick([12,16,18,20,24,30,36]),d=pick([2,3,4,6]);return{question:`¿${n} es divisible entre ${d}?\n1 = Sí   0 = No`,correctAnswer:n%d===0?1:0,reflexId};}
      if (level<=6){const primes=[2,3,5,7,11,13,17,19],notP=[4,6,8,9,10,12,14,15];const isPrime=Math.random()>0.5,n=isPrime?pick(primes):pick(notP);return{question:`¿${n} es primo?\n1 = Sí   0 = No`,correctAnswer:isPrime?1:0,reflexId};}
      if (level===7){const pairs:Array<[number,number]>=[[4,6],[3,5],[4,10],[6,8]];const[a,b]=pick(pairs);return{question:`mcm(${a}, ${b})`,correctAnswer:(a*b)/gcd(a,b),reflexId};}
      if (level===8){const pairs:Array<[number,number]>=[[12,18],[8,12],[15,20],[6,9]];const[a,b]=pick(pairs);return{question:`mcd(${a}, ${b})`,correctAnswer:gcd(a,b),reflexId};}
      const n=rnd(30,100),f=smallestPrimeFactor(n);return{question:`Menor factor primo de ${n}`,correctAnswer:f,reflexId};
    }
    case 'ARIT_POTENCIAS': {
      if (level<=2){const b=rnd(2+level*2,4+level*3);return{question:`${b}²`,correctAnswer:b*b,reflexId};}
      if (level===3){const b=pick([2,3,4]);return{question:`${b}³`,correctAnswer:b*b*b,reflexId};}
      if (level===4){const e=rnd(2,6);return{question:`2^${e}`,correctAnswer:Math.pow(2,e),reflexId};}
      if (level===5){return{question:`5⁰`,correctAnswer:1,reflexId};}
      if (level===6){const b=pick([-2,-3]),e=pick([2,3]);return{question:`(${b})^${e}`,correctAnswer:Math.pow(b,e),reflexId};}
      if (level===7){const n=rnd(2,4),e=rnd(3,5);return{question:`${n}^${e}`,correctAnswer:Math.pow(n,e),reflexId};}
      const a=rnd(2,9);return{question:`${a} × 10³`,correctAnswer:a*1000,reflexId};
    }
    case 'ARIT_RAICES': {
      const groups=[[4,9,16],[25,36,49],[64,81,100],[121,144,169,196,225]];
      const g=groups[Math.min(level-1,groups.length-1)];
      const n=pick(g);return{question:`√${n}`,correctAnswer:Math.sqrt(n),reflexId};
    }
    case 'ARIT_FRACCIONES': {
      const configs:Array<[number,number,number]>=[[1,2,20],[1,4,16],[1,3,15],[2,3,12],[3,4,20],[1,5,25],[2,5,30],[3,5,25],[5,6,24],[7,8,32]];
      const[num,den,base]=configs[Math.min(level-1,configs.length-1)];
      const adj=Math.ceil(base/den)*den;return{question:`${num}/${den} de ${adj}`,correctAnswer:(num/den)*adj,reflexId};
    }
    case 'ARIT_PORCENTAJES': {
      const configs:Array<[number,number]>=[[50,80],[25,60],[10,90],[20,50],[30,70],[5,80],[15,60],[75,40],[1,450],[12,200]];
      const[pct,base]=configs[Math.min(level-1,configs.length-1)];
      return{question:`${pct}% de ${base}`,correctAnswer:Math.round(base*pct/100*100)/100,reflexId};
    }
    case 'ARIT_REGLA3': {
      if (level<=2){const u=rnd(2,5),ppu=rnd(2,8),qty=rnd(2,9);return{question:`Si ${u} kg cuestan ${u*ppu}€\n¿Cuánto cuestan ${qty} kg?`,correctAnswer:qty*ppu,reflexId};}
      const w=rnd(2,4),h=rnd(4,12),nw=w*rnd(2,3);
      return{question:`${w} obreros tardan ${h}h\n¿Cuánto tardan ${nw} obreros?`,correctAnswer:(w*h)/nw,reflexId};
    }
    case 'ALG_EVAL': {
      if (level===1){const c=rnd(1,9),x=rnd(1,8);return{question:`x = ${x}\nx + ${c}`,correctAnswer:x+c,reflexId,isEquation:true};}
      if (level===2){const a=rnd(2,5),c=rnd(1,8),x=rnd(2,8);return{question:`x = ${x}\n${a}x − ${c}`,correctAnswer:a*x-c,reflexId,isEquation:true};}
      if (level===3){const a=rnd(2,5),c=rnd(1,5),x=-rnd(1,4);return{question:`x = ${x}\n${a}x + ${c}`,correctAnswer:a*x+c,reflexId,isEquation:true};}
      if (level===4){const a=rnd(2,4),c=rnd(2,6),x=rnd(2,6);return{question:`x = ${x}\n${a}(x + ${c})`,correctAnswer:a*(x+c),reflexId,isEquation:true};}
      if (level===5){const x=rnd(2,9);return{question:`x = ${x}\nx²`,correctAnswer:x*x,reflexId,isEquation:true};}
      if (level===6){const a=rnd(2,4),c=rnd(1,5),x=rnd(2,6);return{question:`x = ${x}\n${a}x² − ${c}`,correctAnswer:a*x*x-c,reflexId,isEquation:true};}
      if (level===7){const x=rnd(2,7),c1=rnd(1,4),c2=rnd(1,4);return{question:`x = ${x}\n(x + ${c1})(x − ${c2})`,correctAnswer:(x+c1)*(x-c2),reflexId,isEquation:true};}
      const x=rnd(1,5),y=rnd(1,5),a=rnd(1,4),b=rnd(1,4);
      return{question:`x = ${x},  y = ${y}\n${a}x + ${b}y`,correctAnswer:a*x+b*y,reflexId,isEquation:true};
    }
    case 'ALG_EC_SIMPLE': {
      if (level===1){const c=rnd(1,9),x=rnd(1,9);return{question:`x + ${c} = ${x+c}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===2){const c=rnd(1,9),x=rnd(c+1,15);return{question:`x − ${c} = ${x-c}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===3){const c=rnd(1,8),x=rnd(1,8);return{question:`${c} − x = ${c-x}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===4){const a=rnd(2,9),x=rnd(1,9);return{question:`${a}x = ${a*x}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===5){const d=rnd(2,6),x=rnd(2,9);return{question:`x/${d} = ${x}`,correctAnswer:x*d,reflexId,isEquation:true};}
      if (level===6){const a=rnd(2,5),b=rnd(1,6),x=rnd(1,8);return{question:`${a}x + ${b} = ${a*x+b}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===7){const a=rnd(2,5),b=rnd(1,6),x=rnd(1,8);return{question:`${a}x − ${b} = ${a*x-b}`,correctAnswer:x,reflexId,isEquation:true};}
      const d=rnd(2,4),b=rnd(1,5),x=rnd(1,8);
      return{question:`x/${d} + ${b} = ${x+b}`,correctAnswer:x*d,reflexId,isEquation:true};
    }
    case 'ALG_EC_AVZ': {
      if (level===1){const a=rnd(2,5),b=rnd(1,9),x=rnd(2,8);return{question:`${a}x + ${b} = ${a*x+b}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===2){const a=rnd(2,5),b=rnd(1,9),x=rnd(2,8);return{question:`${a}x − ${b} = ${a*x-b}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===3){const a=rnd(2,5),b=rnd(1,5),x=rnd(1,5);return{question:`${b} − ${a}x = ${b-a*x}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===4){const a=rnd(2,5),b=rnd(1,5),x=rnd(2,8);return{question:`${a}x + ${b} = ${a-1}x + ${b+x}`,correctAnswer:x,reflexId,isEquation:true};}
      if (level===5){const a=rnd(2,4),b=rnd(2,6),x=rnd(2,8);return{question:`${a}(x − ${b}) = ${a*(x-b)}`,correctAnswer:x,reflexId,isEquation:true};}
      const a=rnd(3,6),b=rnd(1,9),x=rnd(2,10);
      return{question:`${a}x − ${b} = ${a-1}x + ${(a*x-b)-((a-1)*x)}`,correctAnswer:x,reflexId,isEquation:true};
    }
    case 'ALG_PRODUCTOS': {
      if (level<=2){const pairs=[[3,2],[5,2],[4,3],[6,1]];const[a,b]=pick(pairs);if(level===1)return{question:`(${a}+${b})²`,correctAnswer:(a+b)*(a+b),reflexId,isEquation:true};return{question:`(${a}−${b})²`,correctAnswer:(a-b)*(a-b),reflexId,isEquation:true};}
      if (level===3){const a=rnd(3,9),b=rnd(1,a-1);return{question:`(${a}+${b})(${a}−${b})`,correctAnswer:a*a-b*b,reflexId,isEquation:true};}
      if (level<=6){const a=rnd(3,8),b=rnd(1,a-1);return{question:`(${a}+${b})(${a}−${b})`,correctAnswer:a*a-b*b,reflexId,isEquation:true};}
      const b=rnd(1,4),x=rnd(2,5);
      return{question:`x = ${x}\n(x+${b})²`,correctAnswer:(x+b)*(x+b),reflexId,isEquation:true};
    }
    case 'FUNC_LINEAL': {
      const configs:Array<[number,number,number]>=[[2,1,3],[3,-4,2],[3,-4,-1],[1,2,6],[1,3,4],[-2,5,3],[-1,4,-2]];
      const[m,b,x]=configs[Math.min(level-1,configs.length-1)]??[rnd(1,5),rnd(-5,5),rnd(-4,6)];
      const bStr=b>=0?`+ ${b}`:`− ${Math.abs(b)}`;
      return{question:`f(x) = ${m}x ${bStr}\nf(${x}) = ?`,correctAnswer:Math.round((m*x+b)*100)/100,reflexId,isEquation:true};
    }
    case 'FUNC_CUAD': {
      if (level===1){const x=rnd(2,7);return{question:`f(x) = x²\nf(${x}) = ?`,correctAnswer:x*x,reflexId,isEquation:true};}
      if (level===2){const x=-rnd(1,5);return{question:`f(x) = x²\nf(${x}) = ?`,correctAnswer:x*x,reflexId,isEquation:true};}
      if (level===3){const a=rnd(2,4),x=rnd(2,5);return{question:`f(x) = ${a}x²\nf(${x}) = ?`,correctAnswer:a*x*x,reflexId,isEquation:true};}
      if (level===4){const c=rnd(1,9),x=rnd(2,6);return{question:`f(x) = x² + ${c}\nf(${x}) = ?`,correctAnswer:x*x+c,reflexId,isEquation:true};}
      if (level===5){const a=rnd(1,3),x=rnd(2,5);return{question:`f(x) = x² + ${a}x\nf(${x}) = ?`,correctAnswer:x*x+a*x,reflexId,isEquation:true};}
      if (level===6){const c=rnd(2,5),x=rnd(c+1,c+4);return{question:`f(x) = (x − ${c})²\nf(${x}) = ?`,correctAnswer:(x-c)*(x-c),reflexId,isEquation:true};}
      const a=rnd(1,3),b=rnd(1,5),c=rnd(-4,4),x=rnd(1,5);
      const cStr=c>=0?`+ ${c}`:`− ${Math.abs(c)}`;
      return{question:`f(x) = ${a}x² + ${b}x ${cStr}\nf(${x}) = ?`,correctAnswer:a*x*x+b*x+c,reflexId,isEquation:true};
    }
  }
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
interface DropdownMenuProps {
  open: boolean;
  align: 'left' | 'right';
  children: React.ReactNode;
}
function DropdownMenu({ open, align, children }: DropdownMenuProps) {
  if (!open) return null;
  return (
    <div className={`dropdown-menu dropdown-menu--${align}`}>
      {children}
    </div>
  );
}

// ─── Numeric Keypad ───────────────────────────────────────────────────────────
interface NumericKeypadProps {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onToggleSign: () => void;
  onSymbol: (s: string) => void;
}
function NumericKeypad({ onDigit, onBackspace, onSubmit, onToggleSign, onSymbol }: NumericKeypadProps) {
  const [showSymbols, setShowSymbols] = useState(false);
  return (
    <div className="numeric-keypad">
      <div className="keypad-grid">
        {['7','8','9','4','5','6','1','2','3'].map(d => (
          <button key={d} className="key-btn" onClick={() => onDigit(d)}>{d}</button>
        ))}
        <button className="key-btn" onClick={onToggleSign}>±</button>
        <button className="key-btn" onClick={() => onDigit('0')}>0</button>
        <button className="key-btn" onClick={onBackspace}>⌫</button>
      </div>
      {showSymbols && (
        <div className="symbol-panel">
          <div className="symbol-row">
            {['√','²','³','^'].map(s => (
              <button key={s} className="key-btn" onClick={() => onSymbol(s)}>{s}</button>
            ))}
          </div>
          <div className="symbol-row">
            {['(',')','.','/'].map(s => (
              <button key={s} className="key-btn" onClick={() => onSymbol(s)}>{s}</button>
            ))}
          </div>
          <div className="symbol-row">
            {['x','a','y','b'].map(s => (
              <button key={s} className="key-btn key-var" onClick={() => onSymbol(ITALIC_MAP[s] ?? s)}>
                {ITALIC_MAP[s] ?? s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="keypad-bottom">
        <button
          className={`key-btn key-sym-toggle ${showSymbols ? 'open' : ''}`}
          onClick={() => setShowSymbols(p => !p)}
        >
          𝑥√^
        </button>
        <button className="key-btn key-submit" onClick={onSubmit}>↵</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MathExercise() {
  const [lang, setLang]                     = useState<Language>('es');
  const [langOpen, setLangOpen]             = useState(false);
  const [theme, setTheme]                   = useState<Theme>(() => (localStorage.getItem('lexipop-theme') as Theme) || 'neutro');
  const [themeOpen, setThemeOpen]           = useState(false);
  const [activeSection, setActiveSection]   = useState<Section>('aritmetica');
  const [showReflexList, setShowReflexList] = useState(false);
  const [exercise, setExercise]             = useState<Exercise | null>(null);
  const [input, setInput]                   = useState('');
  const [wrongCount, setWrongCount]         = useState(0);
  const [lexiMsg, setLexiMsg]               = useState<string | null>(null);
  const [helpContent, setHelpContent]       = useState<string | null>(null);
  const [helpLoading, setHelpLoading]       = useState(false);
  const [blocked, setBlocked]               = useState(false);

  const langWrapRef  = useRef<HTMLDivElement>(null);
  const themeWrapRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<Stats>(() => {
    try {
      const s = localStorage.getItem('lexipop-v4');
      if (s) { const p=JSON.parse(s); return {...p, reflexes:new Map(p.reflexes||[]), masteredReflexes:new Set(p.masteredReflexes||[])}; }
    } catch {}
    return { currentReflex:'ARIT_SUMA' as ReflexId, reflexes:new Map(), masteredReflexes:new Set(), sessionExercises:0 };
  });

  const t = T[lang];

  useEffect(() => { applyTheme(theme); localStorage.setItem('lexipop-theme', theme); }, [theme]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langWrapRef.current  && !langWrapRef.current.contains(target))  setLangOpen(false);
      if (themeWrapRef.current && !themeWrapRef.current.contains(target)) setThemeOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const d = { currentReflex:stats.currentReflex, reflexes:Array.from(stats.reflexes.entries()), masteredReflexes:Array.from(stats.masteredReflexes), sessionExercises:stats.sessionExercises };
    localStorage.setItem('lexipop-v4', JSON.stringify(d));
  }, [stats]);

  const getLevel    = (id: ReflexId) => stats.reflexes.get(id)?.level || 1;
  const getProgress = (id: ReflexId) => { const p=stats.reflexes.get(id); return p ? {correct:p.correct, total:p.total} : {correct:0, total:0}; };

  const generateNext = (reflexId?: ReflexId) => {
    const id    = reflexId ?? stats.currentReflex;
    const level = getLevel(id);
    setExercise(gen(id, level));
    setWrongCount(0); setLexiMsg(null); setHelpContent(null); setHelpLoading(false); setInput('');
  };

  useEffect(() => { generateNext(); }, [stats.currentReflex]);

  useEffect(() => {
    for (const [sec, refs] of Object.entries(SECTION_REFLEXES)) {
      if ((refs as ReflexId[]).includes(stats.currentReflex)) { setActiveSection(sec as Section); break; }
    }
  }, [stats.currentReflex]);

  const selectReflex = (id: ReflexId) => {
    setStats(prev => ({...prev, currentReflex:id}));
    setShowReflexList(false);
  };

  const handleSectionChange = (section: Section) => {
    if (activeSection === section) { setShowReflexList(prev => !prev); }
    else {
      setActiveSection(section); setShowReflexList(true);
      const first = SECTION_REFLEXES[section][0];
      if (stats.currentReflex !== first) setStats(prev => ({...prev, currentReflex:first}));
      else generateNext(first);
    }
  };

  const updateProgress = (id: ReflexId, correct: boolean) => {
    setStats(prev => {
      const reflexes   = new Map(prev.reflexes);
      const cur        = reflexes.get(id) || {reflexId:id, correct:0, total:0, lastAttempts:[], mastered:false, level:1};
      const attempts   = [...cur.lastAttempts, correct].slice(-20);
      const newCorrect = cur.correct + (correct ? 1 : 0);
      const level      = Math.floor(newCorrect / 10) + 1;
      const mastered   = attempts.filter(Boolean).length >= 16 && attempts.length >= 20;
      reflexes.set(id, {reflexId:id, correct:newCorrect, total:cur.total+1, lastAttempts:attempts, mastered, level});
      const masteredReflexes = new Set(prev.masteredReflexes);
      if (mastered) masteredReflexes.add(id);
      return {...prev, reflexes, masteredReflexes, sessionExercises:prev.sessionExercises+1};
    });
  };

  const notifyCorrect = async () => {
    try {
      const res  = await fetch('/api/math/exercise/complete', { method:'POST', credentials:'include' });
      const data = await res.json();
      if (data.blocked) setBlocked(true);
    } catch {
      // silencioso — no bloqueamos el juego si falla la red
    }
  };

  const handleHelp = async () => {
    if (!exercise || helpLoading) return;
    if (helpContent) { setHelpContent(null); return; }
    setHelpLoading(true);
    try { const text = await fetchHelpFromAPI(exercise.question, exercise.correctAnswer, lang); setHelpContent(text); }
    catch { setHelpContent('Error al cargar la ayuda.'); }
    finally { setHelpLoading(false); }
  };

  const handleSubmit = () => {
    if (!input.trim() || !exercise) return;
    const num     = parseFloat(input.replace(',','.'));
    if (isNaN(num)) { setLexiMsg(t.lexi.incorrect); setInput(''); return; }
    const correct = Math.abs(num - exercise.correctAnswer) < 0.001;
    updateProgress(exercise.reflexId, correct);
    if (correct) {
      setLexiMsg(t.lexi.correct);
      notifyCorrect();
      setTimeout(() => { generateNext(); }, 900);
    } else {
      const nw = wrongCount + 1; setWrongCount(nw);
      setLexiMsg(nw >= 3 ? `${t.lexi.incorrect} ${t.lexi.helpOffer}` : t.lexi.incorrect);
      setTimeout(() => { setInput(''); }, 800);
    }
  };

  const handleUpgrade = async () => {
    try {
      const res  = await fetch('/api/math/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: import.meta.env.VITE_STRIPE_PRICE_ID || '' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert('Error al conectar con el servidor de pagos.');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (blocked) return;
      if (e.key >= '0' && e.key <= '9') setInput(p => p + e.key);
      else if (e.key === '-') setInput(p => p.startsWith('-') ? p.slice(1) : '-' + p);
      else if (e.key === '.') setInput(p => p.includes('.') ? p : p + '.');
      else if (e.key === 'Backspace') setInput(p => p.slice(0,-1));
      else if (e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [input, exercise, blocked]);

  if (!exercise) return <div className="loading">Cargando...</div>;

  const reflexName     = REFLEX_NAMES[stats.currentReflex]?.[lang] || stats.currentReflex;
  const progress       = getProgress(stats.currentReflex);
  const level          = getLevel(stats.currentReflex);
  const displayQ       = italicizeVars(exercise.question);
  const isCorrectState = lexiMsg === t.lexi.correct;
  const isWrongState   = !!lexiMsg && !isCorrectState;

  return (
    <div className="lexipop-container">

      {blocked && <Paywall onUpgrade={handleUpgrade} />}

      <header className="app-header">
        <div ref={themeWrapRef} style={{position:'relative', zIndex:99999}}>
          <button className="theme-toggle" onClick={() => setThemeOpen(o => !o)}>
            {THEME_ICONS[theme]} <span className="chevron-sm">{themeOpen?'▲':'▼'}</span>
          </button>
          <DropdownMenu open={themeOpen} align="left">
            {(Object.keys(THEME_ICONS) as Theme[]).map(th => (
              <button key={th} className={`dropdown-option ${theme===th?'active':''}`}
                onClick={() => { setTheme(th); setThemeOpen(false); }}>
                {THEME_ICONS[th]} {th.charAt(0).toUpperCase()+th.slice(1)}
              </button>
            ))}
          </DropdownMenu>
        </div>

        <img src="/lexipop-logo.png" alt="LexiPop Math" className="app-logo" />

        <div ref={langWrapRef} style={{position:'relative', zIndex:99999}}>
          <button className="lang-toggle" onClick={() => setLangOpen(o => !o)}>
            🌐 {lang.toUpperCase()} <span className="chevron-sm">{langOpen?'▲':'▼'}</span>
          </button>
          <DropdownMenu open={langOpen} align="right">
            {(['es','en','fr','de','pt','it'] as Language[]).map(l => (
              <button key={l} className={`dropdown-option ${lang===l?'active':''}`}
                onClick={() => { setLang(l); setLangOpen(false); }}>
                {l.toUpperCase()}
              </button>
            ))}
          </DropdownMenu>
        </div>
      </header>

      <div className="section-tabs">
        {(Object.keys(SECTION_REFLEXES) as Section[]).map(sec => (
          <button key={sec} className={`section-tab ${activeSection===sec?'active':''}`}
            onClick={() => handleSectionChange(sec)}>
            {t.sections[sec]}
            {activeSection===sec && <span className="chevron">{showReflexList?' ▲':' ▼'}</span>}
          </button>
        ))}
      </div>

      <div className={`reflex-list ${showReflexList?'open':'closed'}`}>
        {SECTION_REFLEXES[activeSection].map(id => {
          const p=getProgress(id),lv=getLevel(id),isA=stats.currentReflex===id,isM=stats.masteredReflexes.has(id);
          return (
            <button key={id} className={`reflex-item ${isA?'active':''} ${isM?'mastered':''}`} onClick={() => selectReflex(id)}>
              <span className="reflex-item-name">{REFLEX_NAMES[id]?.[lang]}</span>
              <span className="reflex-item-stats">{t.ui.level} {lv} · {p.correct}/{p.total}{isM?' ✓':''}</span>
            </button>
          );
        })}
      </div>

      <div className="challenge-card">
        <div className="challenge-reflex-label">{reflexName} — {t.ui.level} {level} · {progress.correct}/{progress.total}</div>
        <div className="challenge-equation">{displayQ}</div>

        <div className="answer-display-wrapper">
          <span className="answer-label">{t.ui.resultado}</span>
          <div className={`answer-display ${input?'has-value':''} ${isCorrectState?'correct':''} ${isWrongState?'incorrect':''}`}>
            {input || <span className="answer-placeholder">{t.ui.placeholder}</span>}
          </div>
          <button className="submit-inline" onClick={handleSubmit}>↵</button>
        </div>

        <div className="card-footer">
          {lexiMsg && (
            <div className="lexi-feedback">
              <span className="lexi-name">{t.ui.lexi}</span> {lexiMsg}
            </div>
          )}
          <button className={`help-btn ${helpLoading?'loading':''} ${helpContent?'active':''}`}
            onClick={handleHelp} disabled={helpLoading}>
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

      <NumericKeypad
        onDigit={d => setInput(p => p + d)}
        onBackspace={() => setInput(p => p.slice(0,-1))}
        onSubmit={handleSubmit}
        onToggleSign={() => setInput(p => p.startsWith('-') ? p.slice(1) : p ? '-'+p : '-')}
        onSymbol={s => setInput(p => p + s)}
      />

    </div>
  );
}