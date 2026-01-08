export function getCorrectionModePrompt() {
  return `
TAREA ACTUAL: MODO_CORRECCION

El usuario quiere corrección explícita.

Instrucciones:
- Corrige lo visible (tildes/acentos, ortografía, gramática, signos, mayúsculas) ESCRIBIENDO BIEN dentro de tu respuesta.
- Evita formato escolar ("Original:", "Corregido:", listas largas).
- No pegues el texto completo del usuario.
- Si necesitas precisión, puedes citar SOLO el fragmento mínimo (1–8 palabras) para mostrar la forma correcta.
- Da una explicación breve y humana (una o dos frases) cuando aporte valor.
- Cierra con una pregunta breve para continuar o confirmar intención (p. ej. “¿Quieres que suene más formal o más casual?”).
`;
}
