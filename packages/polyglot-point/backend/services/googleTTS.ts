import textToSpeech from "@google-cloud/text-to-speech";
import { safeJsonParse } from "../utils/safeJson";

const { TextToSpeechClient } = textToSpeech;

type GoogleCredentials = {
  client_email: string;
  private_key: string;
  // agrega mÃƒÂ¡s campos si quieres tiparlo mÃƒÂ¡s estricto
};

const rawCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let credentials: GoogleCredentials | null = null;

// Si la variable empieza con "{", asumimos que es JSON embebido y lo parseamos de forma segura.
// Si es una ruta a archivo o estÃƒÂ¡ vacÃƒÂ­a, NO llamamos JSON.parse y dejamos que el SDK se encargue.
if (rawCreds && rawCreds.trim().startsWith("{")) {
  credentials = safeJsonParse<GoogleCredentials | null>(
    rawCreds,
    null,
    "GOOGLE_APPLICATION_CREDENTIALS"
  );
}

// Cliente TTS: si hay credenciales parseadas, se pasan explÃƒÂ­citas;
// si no, Google usa la ruta o las Application Default Credentials.
export const ttsClient = credentials
  ? new TextToSpeechClient({ credentials })
  : new TextToSpeechClient();

// Compatibilidad con el cÃƒÂ³digo existente que importaba { googleTTSService }
export const googleTTSService = ttsClient;
