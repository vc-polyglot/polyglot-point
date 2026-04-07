// languagetool.service.ts

export interface LTError {
  original: string;
  corrected: string;
  type: string;
  explanation: string;
}

// Cache en memoria para evitar llamadas repetidas
const errorCache = new Map<string, LTError[]>();

// ConfiguraciÃƒÆ’Ã‚Â³n
const LT_API_URL = process.env.LANGUAGETOOL_API_URL || 'https://api.languagetool.org/v2/check';
const LT_API_KEY = process.env.LANGUAGETOOL_API_KEY; // opcional, solo si tienes premium

/**
 * Valida texto con LanguageTool API
 * @param text - Texto a validar
 * @param lang - CÃƒÆ’Ã‚Â³digo de idioma (es, en, fr, it, de, pt)
 * @returns Array de errores encontrados (vacÃƒÆ’Ã‚Â­o si no hay errores o si falla)
 */
export async function validateText(text: string, lang: string): Promise<LTError[]> {
  // Normalizar texto para cache (lowercase, trim)
  const cacheKey = `${lang}:${text.trim().toLowerCase()}`;
  
  // 1. Revisar cache primero
  if (errorCache.has(cacheKey)) {
    console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ LanguageTool cache hit:', cacheKey);
    return errorCache.get(cacheKey)!;
  }

  try {
    console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â LanguageTool validating:', text);
    
    // 2. Llamar a LanguageTool API
    const response = await fetch(LT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(LT_API_KEY && { 'Authorization': `Bearer ${LT_API_KEY}` })
      },
      body: new URLSearchParams({
        text: text,
        language: lang,
      })
    });

    // 3. Manejar rate limit (429)
    if (response.status === 429) {
      console.warn('ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â LanguageTool rate limit reached - continuing without corrections');
      return [];
    }

    // 4. Manejar otros errores HTTP
    if (!response.ok) {
      console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ LanguageTool API error:', response.status, response.statusText);
      return [];
    }

    // 5. Parsear respuesta
    const data = await response.json();
    
    // 6. Convertir a formato simple
    const errors: LTError[] = data.matches.map((match: any) => ({
      original: text.slice(match.offset, match.offset + match.length),
      corrected: match.replacements[0]?.value || '',
      type: match.rule.issueType || 'other', // misspelling, grammar, punctuation, etc.
      explanation: match.shortMessage || match.message.substring(0, 50)
    }));

    // 7. Cachear resultado (incluso si estÃƒÆ’Ã‚Â¡ vacÃƒÆ’Ã‚Â­o)
    errorCache.set(cacheKey, errors);
    
    console.log(`ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ LanguageTool found ${errors.length} errors`);
    return errors;

  } catch (error) {
    console.error('ÃƒÂ¢Ã‚ÂÃ…â€™ LanguageTool exception:', error);
    // En caso de error de red u otro, devolver array vacÃƒÆ’Ã‚Â­o
    // Clara seguirÃƒÆ’Ã‚Â¡ funcionando, solo sin correcciones
    return [];
  }
}

/**
 * Limpiar cache (ÃƒÆ’Ã‚Âºtil para testing o liberar memoria)
 */
export function clearCache(): void {
  errorCache.clear();
  console.log('ÃƒÂ°Ã…Â¸Ã¢â‚¬â€Ã¢â‚¬ËœÃƒÂ¯Ã‚Â¸Ã‚Â LanguageTool cache cleared');
}

/**
 * Obtener estadÃƒÆ’Ã‚Â­sticas del cache (ÃƒÆ’Ã‚Âºtil para monitoreo)
 */
export function getCacheStats() {
  return {
    size: errorCache.size,
    keys: Array.from(errorCache.keys())
  };
}