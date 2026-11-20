/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - GEMINI HIGH-FIDELITY TTS AUDIO GENERATOR
 * Generates natural neural audio for exam questions and stores them locally
 * in audio/cases/<id>_fall_stem.m4a (and .wav) with a manifest in js/audio_manifest.js.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const SpeechEngine = require('../js/speech_engine.js');

let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
  try {
    const configLocalPath = path.resolve(__dirname, '../config.local.js');
    if (fs.existsSync(configLocalPath)) {
      const cfg = fs.readFileSync(configLocalPath, 'utf8');
      const m = cfg.match(/GEMINI_LOCAL_KEY\s*=\s*['"]([^'"]+)['"]/);
      if (m) GEMINI_API_KEY = m[1];
    }
  } catch (e) {}
}
const AUDIO_DIR = path.resolve(__dirname, '../audio/cases');
const MANIFEST_JS = path.resolve(__dirname, '../js/audio_manifest.js');
const MANIFEST_JSON = path.resolve(__dirname, '../audio/audio_manifest.json');

function ensureDirectories() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

function createWavBuffer(pcmBuffer, sampleRate = 24000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function convertWavToM4a(wavPath, m4aPath) {
  try {
    execSync(`/usr/bin/afconvert -f m4af -d aac -b 64000 "${wavPath}" "${m4aPath}"`, { stdio: 'ignore' });
    // Remove uncompressed wav if m4a was created successfully to save space
    if (fs.existsSync(m4aPath) && fs.statSync(m4aPath).size > 1000) {
      fs.unlinkSync(wavPath);
      return true;
    }
  } catch (e) {
    // afconvert not available or failed; keep wav
  }
  return false;
}

async function synthesizeText(text, voiceName = 'Charon', maxRetries = 3) {
  const models = ['gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-lite-tts'];
  const cleanPrompt = `Read the following text aloud: ${text}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: cleanPrompt }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName
                  }
                }
              }
            }
          })
        });

        if (res.status === 429) {
          console.warn(`[429 Rate Limit] on ${model}, waiting 8s before retry...`);
          await new Promise(r => setTimeout(r, 8000));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[HTTP ${res.status}] on ${model}: ${errText.slice(0, 150)}`);
          continue;
        }

        const data = await res.json();
        const audioPart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.data);
        if (!audioPart) continue;

        const pcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
        return createWavBuffer(pcmBuffer, 24000);
      } catch (err) {
        console.warn(`[Fetch error] on ${model}: ${err.message}`);
      }
    }
    if (attempt < maxRetries) {
      console.log(`Retrying attempt ${attempt + 1}...`);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  throw new Error('All TTS models failed after retries');
}

function updateManifestFile() {
  const files = fs.readdirSync(AUDIO_DIR);
  const manifest = {};

  for (const f of files) {
    if (f.endsWith('.m4a') || f.endsWith('.wav')) {
      const match = f.match(/^(.+?)_fall_stem\.(m4a|wav)$/);
      if (match) {
        const qId = match[1];
        manifest[qId] = `audio/cases/${f}`;
      }
    }
  }

  // Write JS manifest for client-side zero-latency lookup
  const jsContent = `/**
 * AUTO-GENERATED LOCAL AUDIO MANIFEST
 * Maps question IDs to pre-rendered high-fidelity neural audio files.
 */
(function(global) {
  global.LOCAL_AUDIO_MANIFEST = ${JSON.stringify(manifest, null, 2)};
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(MANIFEST_JS, jsContent, 'utf8');
  fs.writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[Manifest Updated] Indexed ${Object.keys(manifest).length} pre-rendered audio files.`);
  return manifest;
}

async function main() {
  ensureDirectories();

  const args = process.argv.slice(2);
  let limit = Infinity;
  let delayMs = 3500;
  let voice = 'Charon';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10);
    if (args[i] === '--delay' && args[i + 1]) delayMs = parseInt(args[++i], 10);
    if (args[i] === '--voice' && args[i + 1]) voice = args[++i];
  }

  // Load questions
  const qCode = fs.readFileSync(path.resolve(__dirname, '../questions.js'), 'utf8');
  const match = qCode.match(/const EXAM_QUESTIONS = (\[[\s\S]*?\]);\s*(?:if|$)/);
  if (!match) {
    console.error('Failed to parse EXAM_QUESTIONS');
    process.exit(1);
  }

  const questions = eval(match[1]);
  console.log(`Loaded ${questions.length} total questions. Processing up to ${limit}...`);

  let count = 0;
  let skipped = 0;

  for (const q of questions) {
    if (count >= limit) break;

    const baseName = `${q.id}_fall_stem`;
    const m4aPath = path.join(AUDIO_DIR, `${baseName}.m4a`);
    const wavPath = path.join(AUDIO_DIR, `${baseName}.wav`);

    if (fs.existsSync(m4aPath) || fs.existsSync(wavPath)) {
      skipped++;
      continue;
    }

    const rawText = q.stem_de || q.question_de || '';
    const cleanSpeech = SpeechEngine.prepareMedicalTextForSpeech(rawText);
    if (!cleanSpeech || cleanSpeech.length < 5) {
      skipped++;
      continue;
    }

    console.log(`[${count + 1}/${limit}] Generating audio for ${q.id} (${cleanSpeech.length} chars)...`);
    try {
      const wavBuf = await synthesizeText(cleanSpeech, voice);
      fs.writeFileSync(wavPath, wavBuf);
      convertWavToM4a(wavPath, m4aPath);
      count++;
      console.log(`  ✓ Saved ${baseName}`);
      updateManifestFile();

      // Polite delay between requests to stay safely within RPM rate limits
      await new Promise(r => setTimeout(r, delayMs));
    } catch (err) {
      console.error(`  ✗ Error for ${q.id}:`, err.message);
    }
  }

  updateManifestFile();
  console.log(`Done! Generated: ${count}, Skipped (already existed): ${skipped}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal generator error:', err);
    process.exit(1);
  });
}

module.exports = { synthesizeText, updateManifestFile };
