// languagetool.service.ts

export interface LTError {
  original: string;
  corrected: string;
  type: string;
  explanation: string;
}

// Cache en memoria para evitar llamadas repetidas
const errorCache = new Map<string, LTError[]>();

// Configuración
const LT_API_URL = process.env.LANGUAGETOOL_API_URL || 'https://api.languagetool.org/v2/check';
const LT_API_KEY = process.env.LANGUAGETOOL_API_KEY; // opcional, solo si tienes premium

/**
 * Valida texto con LanguageTool API
 * @param text - Texto a validar
 * @param lang - Código de idioma (es, en, fr, it, de, pt)
 * @returns Array de errores encontrados (vacío si no hay errores o si falla)
 */
export async function validateText(text: string, lang: string): Promise<LTError[]> {
  // Normalizar texto para cache (lowercase, trim)
  const cacheKey = `${lang}:${text.trim().toLowerCase()}`;
  
  // 1. Revisar cache primero
  if (errorCache.has(cacheKey)) {
    console.log('✅ LanguageTool cache hit:', cacheKey);
    return errorCache.get(cacheKey)!;
  }

  try {
    console.log('🔍 LanguageTool validating:', text);
    
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
      console.warn('⚠️ LanguageTool rate limit reached - continuing without corrections');
      return [];
    }

    // 4. Manejar otros errores HTTP
    if (!response.ok) {
      console.error('❌ LanguageTool API error:', response.status, response.statusText);
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

    // 7. Cachear resultado (incluso si está vacío)
    errorCache.set(cacheKey, errors);
    
    console.log(`✅ LanguageTool found ${errors.length} errors`);
    return errors;

  } catch (error) {
    console.error('❌ LanguageTool exception:', error);
    // En caso de error de red u otro, devolver array vacío
    // Clara seguirá funcionando, solo sin correcciones
    return [];
  }
}

/**
 * Limpiar cache (útil para testing o liberar memoria)
 */
export function clearCache(): void {
  errorCache.clear();
  console.log('🗑️ LanguageTool cache cleared');
}

/**
 * Obtener estadísticas del cache (útil para monitoreo)
 */
export function getCacheStats() {
  return {
    size: errorCache.size,
    keys: Array.from(errorCache.keys())
  };
}