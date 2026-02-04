import { z } from "zod";

export const ChatRequestSchema = z
  .object({
    message: z.string().min(1).max(2000),
    context: z
      .object({
        uiVersion: z.string().min(1).max(50).optional(),
        platform: z.enum(["web", "mobile", "desktop"]).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z
  .object({
    claraResponse: z.string(),
    corrected: z.string(),
    explanations: z.array(z.string()),
    tips: z.array(z.string()),

    // Backend decide el idioma; el frontend solo lo muestra.
    language: z.string(),

    // Estados reales del backend (contrato congelado).
    status: z.enum([
      "ok",
      "billing_degraded",
      "openai_error",
      "no_messages",
      "invalid_request",
      "no_text",
    ]),

    timestamp: z.string(),
    requestId: z.string(),

    // Opcionales (backend los puede incluir; frontend no decide nada con esto)
    remainingMessages: z.number().int().nonnegative().optional(),
    lowBalanceWarning: z.string().optional(),
    billingDegraded: z.boolean().optional(),
    responseTime: z.number().int().nonnegative().optional(),
    wasTrimmed: z.boolean().optional(),
  })
  .strict();

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
