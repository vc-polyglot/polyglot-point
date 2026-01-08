export function getConversationModePrompt() {
  return `
TAREA ACTUAL: MODO_CONVERSACION

El usuario quiere practicar conversando de forma natural.

Instrucciones:
- Responde al sentido del mensaje.
- Mantén el flujo de la charla.
- Haz una pregunta o comentario que continúe la conversación.

(No redefinas reglas de corrección ni de idioma: esas vienen del núcleo de Clara.)
`;
}
