export interface ChatResponse {
  claraResponse: string
  corrected?: string | null
  explanations?: string[] | null
  tips?: string[] | null
  language: string
  status: "ok" | "billing_degraded" | "openai_error" | "no_messages" | "invalid_request" | "no_text"
  tokensUsed?: number
  model?: string
  wasTrimmed?: boolean
}
