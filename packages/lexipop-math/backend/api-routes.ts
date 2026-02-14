import { Router } from 'express';
const router = Router();

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

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish', en: 'English', fr: 'French',
  de: 'German',  pt: 'Portuguese', it: 'Italian'
};

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'lexipop-math' });
});

// Ayuda con método mental — llama a OpenAI desde el servidor
router.post('/help', async (req, res) => {
  const { question, answer, lang = 'es' } = req.body;

  if (!question || answer === undefined) {
    return res.status(400).json({ error: 'question y answer son requeridos' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY no configurada' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: HELP_SYSTEM_PROMPT },
          { role: 'user', content: `Problem: ${question}\nCorrect answer: ${answer}\nRespond in ${LANG_NAMES[lang] || 'Spanish'}.` }
        ]
      })
    });

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message: string };
    };

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.choices?.[0]?.message?.content || '-';
    return res.json({ help: text });

  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({ error: 'Error al contactar OpenAI' });
  }
});

export default router;
