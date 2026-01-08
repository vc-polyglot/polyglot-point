import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const indexPath = path.join(ROOT, "server", "index.ts");
const enginePath = path.join(ROOT, "server", "clara", "runClaraEngine.ts");

function fail(msg) {
  console.error(`\n[FAIL] ${msg}\n`);
  process.exit(1);
}
function ok(msg) {
  console.log(`[OK] ${msg}`);
}

function stripComments(code) {
  return code
    .replace(/\/\/.*$/gm, "")              // // ...
    .replace(/\/\*[\s\S]*?\*\//g, "");     // /* ... */
}

function stripStrings(code) {
  // Reemplaza strings por comillas vacías (mantiene estructura, elimina contenido)
  return code
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}

if (!fs.existsSync(indexPath)) fail(`No existe el archivo esperado: ${indexPath}`);
if (!fs.existsSync(enginePath)) fail(`Motor Clara no encontrado en: ${enginePath}`);

const rawIndex = fs.readFileSync(indexPath, "utf8");

// Para evitar falsos positivos:
// - BANNED: sin comentarios + sin strings
// - REQUIRED import: sin comentarios (pero CON strings, para ver la ruta real del import)
const noComments = stripComments(rawIndex);
const scanIndex = stripStrings(noComments);

// Señales prohibidas: deben detectarse en CÓDIGO (no en comentarios/strings)
const BANNED = [
  { label: "OpenAI identifier (SDK/client)", re: /\bOpenAI\b/ },
  { label: "getOpenAI helper", re: /\bgetOpenAI\b/ },
  { label: "buildClaraPrompt builder", re: /\bbuildClaraPrompt\b/ },
  { label: "inferIntent logic", re: /\binferIntent\b/ },
  { label: "chat.completions.create call", re: /\bchat\.completions\.create\b/ },
  { label: "openaiClient instance", re: /\bopenaiClient\b/ },
  { label: "import from 'openai'", re: /from\s+["']openai["']/ },
  { label: "require('openai')", re: /require\(\s*["']openai["']\s*\)/ }
];

// Señales requeridas:
// - Uso: se verifica en scanIndex (sin strings) para asegurar que es uso real en código.
// - Import: se verifica en noComments (con strings) para capturar la ruta del módulo.
const REQUIRED_USE = [
  { label: "runClaraEngine usage", re: /\brunClaraEngine\b/ }
];

const REQUIRED_IMPORT = [
  { label: "import from ./clara/runClaraEngine", re: /from\s+["']\.\/clara\/runClaraEngine["']/ }
];

let bannedHits = [];
for (const rule of BANNED) if (rule.re.test(scanIndex)) bannedHits.push(rule.label);

if (bannedHits.length) {
  fail(
    `server/index.ts ya no es adapter-only. Señales prohibidas en CÓDIGO:\n- ${bannedHits.join("\n- ")}\n\nAcción: mueve esa lógica a server/clara/runClaraEngine.ts (o módulos internos del engine).`
  );
}

let requiredMissing = [];

for (const rule of REQUIRED_USE) {
  if (!rule.re.test(scanIndex)) requiredMissing.push(rule.label);
}
for (const rule of REQUIRED_IMPORT) {
  if (!rule.re.test(noComments)) requiredMissing.push(rule.label);
}

if (requiredMissing.length) {
  fail(
    `server/index.ts no cumple contrato adapter-only.\nFaltan:\n- ${requiredMissing.join("\n- ")}\n\nAcción: el adapter debe importar (./clara/runClaraEngine) y llamar runClaraEngine.`
  );
}

ok("Candado adapter-only OK: index.ts es adaptador puro y usa runClaraEngine.");
process.exit(0);
