import { runContentAgent, ContentOutput } from "../agents/contentAgent";

export interface PipelineResult {
  input: string;
  type: string;
  timestamp: string;
  output: ContentOutput;
}

export async function processInput(input: string, type: string): Promise<PipelineResult> {
  console.log("[asistente-vc] Procesando input tipo:", type);
  const output = await runContentAgent(input);
  return { input, type, timestamp: new Date().toISOString(), output };
}
