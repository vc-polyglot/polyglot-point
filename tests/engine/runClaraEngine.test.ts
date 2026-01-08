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

test("runClaraEngine: devuelve output válido y respeta language/engineVariant (sin red)", async () => {
  const fake = makeFakeOpenAI("Ciao! Si scrive l'italiano con l'apostrofo.");

  const out = await runClaraEngine(
    {
      input: "voglio praticare italiano",
      language: "it",
      history: [],
      engineVariant: "legacy",
    },
    { openaiClient: fake }
  );

  assert.equal(out.language, "it");
  assert.equal(out.engine, "legacy");
  assert.ok(out.raw.length > 0);
  assert.ok(out.cleaned.length > 0);
  assert.ok(out.response.length > 0);
});

test("runClaraEngine: input vacío => error", async () => {
  const fake = makeFakeOpenAI("ok");
  await assert.rejects(
    () =>
      runClaraEngine(
        { input: "   ", language: "es", history: [] },
        { openaiClient: fake }
      ),
    /Input vacío/
  );
});

test("runClaraEngine: raw inválido tipo JSON de otro contrato => error", async () => {
  const fake = makeFakeOpenAI('{"corrected":"x"}');
  await assert.rejects(
    () =>
      runClaraEngine(
        { input: "hola", language: "es", history: [] },
        { openaiClient: fake }
      ),
    /Respuesta OpenAI inválida/
  );
});
