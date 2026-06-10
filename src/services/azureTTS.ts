/**
 * Azure Cognitive Services Neural TTS — downloads + caches MP3 to disk.
 * Falls back gracefully (returns null) when the key is empty or offline.
 *
 * Usage: const uri = await getCachedTTSUri(text, 'hi');
 * Pass that URI to an AudioPlayer to get human-quality guided speech.
 */

import * as FileSystem from 'expo-file-system/legacy';
import type { SessionLang } from '@/constants/sessionScripts';

const AZURE_VOICES: Record<SessionLang, string> = {
  en: 'en-US-AriaNeural',
  hi: 'hi-IN-SwaraNeural',
  ur: 'ur-PK-UzmaNeural',
};

const AZURE_LANGS: Record<SessionLang, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  ur: 'ur-PK',
};

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}tts_cache/`;

function cacheKey(text: string, lang: SessionLang): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h) ^ text.charCodeAt(i);
  const safeH = (h >>> 0).toString(16);
  return `${lang}_${safeH}`;
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function buildSSML(text: string, lang: SessionLang): string {
  const voice   = AZURE_VOICES[lang];
  const xmlLang = AZURE_LANGS[lang];
  const safe    = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return (
    `<speak version='1.0' xml:lang='${xmlLang}' xmlns:mstts='http://www.w3.org/2001/mstts'>` +
    `<voice name='${voice}'>` +
    `<mstts:express-as style='calm'>` +
    `<prosody rate='-25%' pitch='-5%'>${safe}</prosody>` +
    `</mstts:express-as></voice></speak>`
  );
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * Returns a local file URI for the spoken phrase (cached after first call).
 * Returns null when:
 *  - Azure key is not set in env
 *  - Network request fails
 *  - FileSystem write fails
 */
export async function getCachedTTSUri(text: string, lang: SessionLang): Promise<string | null> {
  const key    = process.env.EXPO_PUBLIC_AZURE_TTS_KEY;
  const region = process.env.EXPO_PUBLIC_AZURE_TTS_REGION ?? 'eastus';
  if (!key) return null;

  try {
    await ensureDir();
    const filePath = `${CACHE_DIR}${cacheKey(text, lang)}.mp3`;
    const cached   = await FileSystem.getInfoAsync(filePath);
    if (cached.exists) return filePath;

    const res = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method:  'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type':              'application/ssml+xml',
          'X-Microsoft-OutputFormat':  'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent':                'MindPulse/1.0',
        },
        body: buildSSML(text, lang),
      },
    );

    if (!res.ok) return null;

    const b64 = arrayBufferToBase64(await res.arrayBuffer());
    await FileSystem.writeAsStringAsync(filePath, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return filePath;
  } catch {
    return null;
  }
}
