import test from "node:test";
import assert from "node:assert/strict";
import { runClaraEngine } from "../../server/clara/runClaraEngine";

/**
 * Fake mínimo para OpenAI SDK v5:
 * client.chat.completions.create({ ... }) -> { choices: [{ message: { content: string } }] }
 */
function makeFakeOpenAI(returnContent: string) {
  return {
    chat: {
      completions: {
        create: async (_req: any) => ({
          choices: [{ message: { content: returnContent } }],
        }),
      },
    },
  } as any;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN TESTS POR IDIOMA
// Verifican invariantes semánticos: language correcto, campos no vacíos, límites
// ═══════════════════════════════════════════════════════════════════════════════

test("GOLDEN [es]: input español, output válido", async () => {
  const fake = makeFakeOpenAI("¡Hola! ¿Cómo puedo ayudarte hoy?");
  const out = await runClaraEngine(
    { input: "quiero practicar español", language: "es", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "es");
  assert.equal(out.engine, "legacy");
  assert.ok(out.raw.length > 0, "raw no vacío");
  assert.ok(out.cleaned.length > 0, "cleaned no vacío");
  assert.ok(out.cleaned.length <= 4000, "cleaned dentro de límite");
  assert.ok(out.response.length > 0, "response no vacío");
});

test("GOLDEN [en]: input inglés, output válido", async () => {
  const fake = makeFakeOpenAI("Hello! How can I help you practice today?");
  const out = await runClaraEngine(
    { input: "I want to practice English", language: "en", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "en");
  assert.equal(out.engine, "legacy");
  assert.ok(out.raw.length > 0);
  assert.ok(out.cleaned.length > 0);
  assert.ok(out.cleaned.length <= 4000);
  assert.ok(out.response.length > 0);
});

test("GOLDEN [it]: input italiano, output válido", async () => {
  const fake = makeFakeOpenAI("Ciao! Si scrive l'italiano con l'apostrofo.");
  const out = await runClaraEngine(
    { input: "voglio praticare italiano", language: "it", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "it");
  assert.equal(out.engine, "legacy");
  assert.ok(out.raw.length > 0);
  assert.ok(out.cleaned.length > 0);
  assert.ok(out.cleaned.length <= 4000);
  assert.ok(out.response.length > 0);
});

test("GOLDEN [fr]: input francés, output válido", async () => {
  const fake = makeFakeOpenAI("Bonjour! Comment puis-je vous aider aujourd'hui?");
  const out = await runClaraEngine(
    { input: "je veux pratiquer le français", language: "fr", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "fr");
  assert.equal(out.engine, "legacy");
  assert.ok(out.raw.length > 0);
  assert.ok(out.cleaned.length > 0);
  assert.ok(out.cleaned.length <= 4000);
  assert.ok(out.response.length > 0);
});

test("GOLDEN [de]: input alemán, output válido", async () => {
  const fake = makeFakeOpenAI("Hallo! Wie kann ich Ihnen heute helfen?");
  const out = await runClaraEngine(
    { input: "ich möchte Deutsch üben", language: "de", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "de");
  assert.equal(out.engine, "legacy");
  assert.ok(out.raw.length > 0);
  assert.ok(out.cleaned.length > 0);
  assert.ok(out.cleaned.length <= 4000);
  assert.ok(out.response.length > 0);
});

test("GOLDEN [pt]: input portugués, output válido", async () => {
  const fake = makeFakeOpenAI("Olá! Como posso ajudá-lo hoje?");
  const out = await runClaraEngine(
    { input: "quero praticar português", language: "pt", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "pt");
  assert.equal(out.engine, "legacy");
  assert.ok(out.raw.length > 0);
  assert.ok(out.cleaned.length > 0);
  assert.ok(out.cleaned.length <= 4000);
  assert.ok(out.response.length > 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOLDEN TESTS: ENGINE VARIANT
// Verifican que engineVariant se respeta
// ═══════════════════════════════════════════════════════════════════════════════

test("GOLDEN [engine]: modular variant respetado", async () => {
  const fake = makeFakeOpenAI("Respuesta modular.");
  const out = await runClaraEngine(
    { input: "test modular", language: "es", history: [], engineVariant: "modular" },
    { openaiClient: fake }
  );
  assert.equal(out.engine, "modular");
  assert.ok(out.cleaned.length <= 4000);
});

test("GOLDEN [engine]: legacy variant respetado", async () => {
  const fake = makeFakeOpenAI("Respuesta legacy.");
  const out = await runClaraEngine(
    { input: "test legacy", language: "es", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.engine, "legacy");
  assert.ok(out.cleaned.length <= 4000);
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESIÓN: INPUT VACÍO
// ═══════════════════════════════════════════════════════════════════════════════

test("REGRESIÓN: input solo espacios => error", async () => {
  const fake = makeFakeOpenAI("ok");
  await assert.rejects(
    () => runClaraEngine({ input: "   ", language: "es", history: [] }, { openaiClient: fake }),
    /Input vacío/
  );
});

test("REGRESIÓN: input string vacío => error", async () => {
  const fake = makeFakeOpenAI("ok");
  await assert.rejects(
    () => runClaraEngine({ input: "", language: "es", history: [] }, { openaiClient: fake }),
    /Input vacío/
  );
});

test("REGRESIÓN: input undefined (cast) => error", async () => {
  const fake = makeFakeOpenAI("ok");
  await assert.rejects(
    () => runClaraEngine({ input: undefined as any, language: "es", history: [] }, { openaiClient: fake }),
    /Input vacío/
  );
});

test("REGRESIÓN: input null (cast) => error", async () => {
  const fake = makeFakeOpenAI("ok");
  await assert.rejects(
    () => runClaraEngine({ input: null as any, language: "es", history: [] }, { openaiClient: fake }),
    /Input vacío/
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESIÓN: RESPUESTA VACÍA DEL LLM
// ═══════════════════════════════════════════════════════════════════════════════

test("REGRESIÓN: respuesta vacía del LLM => error", async () => {
  const fake = makeFakeOpenAI("");
  await assert.rejects(
    () => runClaraEngine({ input: "hola", language: "es", history: [] }, { openaiClient: fake }),
    /Respuesta OpenAI inválida/
  );
});

test("REGRESIÓN: respuesta solo espacios del LLM => error", async () => {
  const fake = makeFakeOpenAI("   \n\t  ");
  await assert.rejects(
    () => runClaraEngine({ input: "hola", language: "es", history: [] }, { openaiClient: fake }),
    /Respuesta OpenAI inválida/
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESIÓN: JSON MALFORMADO (CONTRATO AJENO)
// ═══════════════════════════════════════════════════════════════════════════════

test("REGRESIÓN: JSON corrected (otro contrato) => error", async () => {
  const fake = makeFakeOpenAI('{"corrected":"x"}');
  await assert.rejects(
    () => runClaraEngine({ input: "hola", language: "es", history: [] }, { openaiClient: fake }),
    /Respuesta OpenAI inválida/
  );
});

test("REGRESIÓN: JSON con wrapper markdown => error", async () => {
  const fake = makeFakeOpenAI('```json\n{"response":"test"}\n```');
  await assert.rejects(
    () => runClaraEngine({ input: "hola", language: "es", history: [] }, { openaiClient: fake }),
    /Respuesta OpenAI inválida/
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// BRECHA DOCUMENTADA: MEZCLA DE IDIOMA
// El motor NO valida contenido semántico, solo estructura.
// Este test documenta el comportamiento actual (by-design).
// ═══════════════════════════════════════════════════════════════════════════════

test("BRECHA DOCUMENTADA: idioma incorrecto en contenido NO es rechazado", async () => {
  // LLM responde en inglés aunque se pidió español
  const fake = makeFakeOpenAI("Hello! How are you today?");
  const out = await runClaraEngine(
    { input: "hola", language: "es", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  // El motor retorna language: "es" aunque el contenido está en inglés
  // Esto es by-design: no hay validación semántica del contenido
  assert.equal(out.language, "es");
  assert.equal(out.response, "Hello! How are you today?");
});

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZACIÓN DE IDIOMA
// ═══════════════════════════════════════════════════════════════════════════════

test("GOLDEN: idioma desconocido normaliza a 'es'", async () => {
  const fake = makeFakeOpenAI("Respuesta en español por defecto.");
  const out = await runClaraEngine(
    { input: "test", language: "xyz", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "es");
  assert.ok(out.cleaned.length <= 4000);
});

test("GOLDEN: idioma mayúsculas normalizado", async () => {
  const fake = makeFakeOpenAI("Bonjour!");
  const out = await runClaraEngine(
    { input: "test", language: "FR", history: [], engineVariant: "legacy" },
    { openaiClient: fake }
  );
  assert.equal(out.language, "fr");
  assert.ok(out.cleaned.length <= 4000);
});
