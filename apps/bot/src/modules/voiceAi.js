const { createAudioResource, StreamType, EndBehaviorType } = require('@discordjs/voice');
const { t } = require('i18n');
const { Writable } = require('stream');
const { writeFileSync, unlinkSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

async function generateTTS(text, lang = 'fr') {
  const googleTTS = require('google-tts-api');
  const urls = googleTTS.getAllAudioUrls(text, {
    lang,
    slow: false,
    host: 'https://translate.google.com',
  });
  return urls;
}

async function playTTSResponse(connection, text, lang = 'fr') {
  try {
    const urls = await generateTTS(text, lang);
    if (!urls || urls.length === 0) return;

    const { createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');

    const player = connection.state.subscription?.player || createAudioPlayer();
    if (!connection.state.subscription) {
      connection.subscribe(player);
    }

    for (const urlObj of urls) {
      await new Promise(async (resolve) => {
        try {
          const res = await fetch(urlObj.url);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const { Readable } = require('stream');
          const stream = Readable.from(buffer);
          const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

          player.play(resource);

          player.once(AudioPlayerStatus.Idle, resolve);
          player.once('error', resolve);
        } catch {
          resolve();
        }
      });
    }
  } catch (err) {
    console.error('TTS error:', err.message);
  }
}

/**
 * Listen to a user's voice in a voice channel, record audio, and transcribe using Whisper.
 * Returns the transcribed text.
 */
async function listenAndTranscribe(connection, userId, duration = 5000) {
  return new Promise((resolve) => {
    try {
      const receiver = connection.receiver;
      const chunks = [];

      const audioStream = receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 2000 },
      });

      const timeout = setTimeout(() => {
        audioStream.destroy();
        resolve(processAudio(chunks));
      }, duration);

      audioStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      audioStream.on('end', () => {
        clearTimeout(timeout);
        resolve(processAudio(chunks));
      });

      audioStream.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function processAudio(chunks) {
  if (!chunks.length) return null;

  try {
    const tmpDir = join(process.cwd(), 'tmp');
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

    const pcmPath = join(tmpDir, `stt_${Date.now()}.pcm`);
    const wavPath = pcmPath.replace('.pcm', '.wav');

    // Combine PCM chunks
    const pcmBuffer = Buffer.concat(chunks);
    writeFileSync(pcmPath, pcmBuffer);

    // Convert PCM to WAV using ffmpeg (Discord sends 48kHz 16-bit stereo PCM)
    try {
      execSync(`ffmpeg -y -f s16le -ar 48000 -ac 2 -i "${pcmPath}" "${wavPath}" 2>/dev/null`);
    } catch {
      cleanup(pcmPath, wavPath);
      return null;
    }

    // Transcribe using Whisper API (local or OpenAI-compatible)
    const whisperUrl = process.env.WHISPER_API_URL || process.env.OLLAMA_URL;
    if (!whisperUrl) {
      cleanup(pcmPath, wavPath);
      return null;
    }

    let text = null;

    // Try Whisper via Ollama audio endpoint or OpenAI-compatible API
    if (process.env.WHISPER_API_URL) {
      const FormData = require('form-data');
      const fs = require('fs');
      const form = new FormData();
      form.append('file', fs.createReadStream(wavPath));
      form.append('model', 'whisper-1');

      const res = await fetch(`${process.env.WHISPER_API_URL}/v1/audio/transcriptions`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      });
      const data = await res.json();
      text = data.text;
    } else {
      // Fallback: use Ollama with audio description (best effort)
      const fs = require('fs');
      const audioBase64 = fs.readFileSync(wavPath).toString('base64');
      const res = await fetch(`${whisperUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.WHISPER_MODEL || 'whisper',
          prompt: 'Transcribe the following audio to text in the original language:',
          images: [audioBase64],
          stream: false,
        }),
      });
      const data = await res.json();
      text = data.response;
    }

    cleanup(pcmPath, wavPath);
    return text;
  } catch (err) {
    console.error('STT processing error:', err.message);
    return null;
  }
}

function cleanup(...paths) {
  for (const p of paths) {
    try { if (existsSync(p)) unlinkSync(p); } catch {}
  }
}

module.exports = { generateTTS, playTTSResponse, listenAndTranscribe };
