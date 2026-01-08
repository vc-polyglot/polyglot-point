# Golden Cases — Polyglot Point Engine Tests

## Propósito
Documentar casos de prueba semánticos para `runClaraEngine`, sus invariantes verificables,
y brechas conocidas del sistema.

## Idiomas soportados
- es (español)
- en (english)
- fr (français)
- it (italiano)
- de (deutsch)
- pt (português)

## Invariantes verificables (sin red)

| Campo | Invariante |
|-------|------------|
| `language` | === normalizeLanguage(input.language) |
| `engine` | === input.engineVariant (cuando explícito) |
| `raw` | length > 0 |
| `cleaned` | length > 0, <= 4000 |
| `response` | length > 0 |

## Tests implementados (19 total)

### Por idioma (6 tests)
- GOLDEN [es]: input español, output válido ✅
- GOLDEN [en]: input inglés, output válido ✅
- GOLDEN [it]: input italiano, output válido ✅
- GOLDEN [fr]: input francés, output válido ✅
- GOLDEN [de]: input alemán, output válido ✅
- GOLDEN [pt]: input portugués, output válido ✅

### Engine variant (2 tests)
- GOLDEN [engine]: modular variant respetado ✅
- GOLDEN [engine]: legacy variant respetado ✅

### Regresiones input (4 tests)
- REGRESIÓN: input solo espacios => error ✅
- REGRESIÓN: input string vacío => error ✅
- REGRESIÓN: input undefined (cast) => error ✅
- REGRESIÓN: input null (cast) => error ✅

### Regresiones LLM response (4 tests)
- REGRESIÓN: respuesta vacía del LLM => error ✅
- REGRESIÓN: respuesta solo espacios del LLM => error ✅
- REGRESIÓN: JSON corrected (otro contrato) => error ✅
- REGRESIÓN: JSON con wrapper markdown => error ✅

### Normalización (2 tests)
- GOLDEN: idioma desconocido normaliza a 'es' ✅
- GOLDEN: idioma mayúsculas normalizado ✅

### Brechas documentadas (1 test)
- BRECHA DOCUMENTADA: idioma incorrecto en contenido NO es rechazado ✅

## Brechas conocidas (by-design)

### Mezcla de idioma en respuesta
El motor **no valida** que el contenido de la respuesta esté en el idioma solicitado.
Solo verifica que `output.language` coincida con el input normalizado.

**Ejemplo**:
- Input: `{ input: "hola", language: "es" }`
- Mock LLM: `"Hello! How are you?"`
- Output: `{ language: "es", response: "Hello! How are you?" }` ← PASA

Esto es by-design: la validación semántica requeriría un segundo LLM call o heurísticas frágiles.

## Changelog
- 2026-01-08: FASE 8 completada - 19 golden tests (sin red)
