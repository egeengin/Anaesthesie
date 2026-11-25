/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - PODCAST COMPILER (20-MINUTE ON-THE-GO AUDIO)
 * Compiles authentic exam questions into structured, chapter-marked 20-minute audio episodes
 * designed for commute / jogging / on-the-go spaced audio learning.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AUDIO_CASES_DIR = path.resolve(__dirname, '../audio/cases');
const PODCAST_DIR = path.resolve(__dirname, '../audio/podcasts');
const MANIFEST_PATH = path.resolve(__dirname, '../audio/podcasts/podcast_manifest.json');

function ensureDirectories() {
  if (!fs.existsSync(PODCAST_DIR)) {
    fs.mkdirSync(PODCAST_DIR, { recursive: true });
  }
}

function createWavHeader(dataLength, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

// Generate gentle 3-tone acoustic bell chime for question chapter transitions
function createChapterChime(sampleRate = 24000) {
  const durationSec = 1.2;
  const samples = Math.floor(sampleRate * durationSec);
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * 3.8);
    const s1 = Math.sin(2 * Math.PI * 523.25 * t); // C5
    const s2 = Math.sin(2 * Math.PI * 659.25 * t); // E5
    const s3 = Math.sin(2 * Math.PI * 783.99 * t); // G5
    const val = Math.round((s1 * 0.4 + s2 * 0.35 + s3 * 0.25) * decay * 11000);
    pcm.writeInt16LE(val, i * 2);
  }
  return pcm;
}

// Create clean digital silence
function createSilence(durationSec = 2.0, sampleRate = 24000) {
  return Buffer.alloc(Math.floor(sampleRate * durationSec) * 2);
}

// Extract 24kHz 16-bit Mono PCM buffer from any audio file using macOS afconvert
function getPcmFromAudioFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const tmpWav = `/tmp/pcm_extract_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`;
  try {
    execSync(`/usr/bin/afconvert -f WAVE -d LEI16 -c 1 -r 24000 "${filePath}" "${tmpWav}"`, { stdio: 'ignore' });
    const buf = fs.readFileSync(tmpWav);
    fs.unlinkSync(tmpWav);
    // Walk RIFF subchunks properly to locate 'data' chunk and respect its byte length
    if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
      return null;
    }
    let offset = 12;
    while (offset + 8 <= buf.length) {
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      const dataStart = offset + 8;
      if (chunkId === 'data') {
        const dataEnd = Math.min(buf.length, dataStart + chunkSize);
        return buf.slice(dataStart, dataEnd);
      }
      offset = dataStart + chunkSize + (chunkSize % 2);
    }
    return null;
  } catch (e) {
    if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
    return null;
  }
}

const PODCAST_EPISODES = [
  {
    id: 'ep_01_notfall_krisen',
    title: 'Folge 1: Notfall-SOPs & Hämodynamische Krisen',
    title_tr: 'Bölüm 1: Acil Durum SOP\'leri ve Hemodinamik Krizler',
    category: 'ÄKNO Düsseldorf Protokolle',
    description: 'Aortenklappenstenose, Spannungspneumothorax, MH, LAST, CICO, Anaphylaxie, Polytrauma & Massivtransfusion.',
    caseIds: [
      'q_dus_01', 'q_dus_02', 'q_dus_03', 'q_dus_04', 'q_dus_05',
      'q_dus_06', 'q_dus_07', 'q_dus_08', 'q_dus_09', 'q_dus_10',
      'q_dus_11', 'q_dus_12', 'q_dus_13', 'q_dus_14', 'q_dus_15'
    ]
  },
  {
    id: 'ep_02_intensiv_sepsis',
    title: 'Folge 2: Intensivmedizin, Sepsis & Organversagen',
    title_tr: 'Bölüm 2: Yoğun Bakım, Sepsis ve Organ Yetmezliği',
    category: 'Intensivmedizin & Beatmung',
    description: 'ARDS lungenprotektive Beatmung, Sepsis bundle, Bauchlagerung, AKI & Nierenersatztherapie, Weaning & Tracheotomie.',
    caseIds: [
      'q_dus_16', 'q_dus_17', 'q_dus_18', 'q_dus_19', 'q_dus_20',
      'q_dus_21', 'q_dus_22', 'q_dus_23', 'q_dus_24', 'q_dus_25',
      'q_dus_26', 'q_dus_27', 'q_dus_28', 'q_dus_29', 'q_dus_30',
      'q_dus_31', 'q_dus_32', 'q_dus_33', 'q_dus_34', 'q_dus_35'
    ]
  },
  {
    id: 'ep_03_hochrisiko_speziell',
    title: 'Folge 3: Hochrisiko-Patienten & Spezielle Anästhesieführung',
    title_tr: 'Bölüm 3: Yüksek Riskli Hastalar ve Özel Cerrahi Anestezi',
    category: 'Spezielle Anästhesiologie',
    description: 'Thoraxanästhesie (ELV), Karotischirurgie, Neuroanästhesie & ICP, Adipositas Permagna, Herzschrittmacher & ICD perioperativ.',
    caseIds: [
      'q_dus_36', 'q_dus_37', 'q_dus_38', 'q_dus_39', 'q_dus_40',
      'q_dus_41', 'q_dus_42', 'q_dus_43', 'q_dus_44', 'q_dus_45',
      'q_dus_46', 'q_dus_47', 'q_dus_48', 'q_dus_49', 'q_dus_50',
      'q_dus_51', 'q_dus_52', 'q_dus_53', 'q_dus_54'
    ]
  }
];

function buildEpisode(ep) {
  console.log(`\nCompiling Podcast: ${ep.title}...`);
  const pcmParts = [];
  const chime = createChapterChime(24000);
  const thinkingPause = createSilence(3.0, 24000); // 3-second thinking pause
  const chapterTransition = createSilence(1.5, 24000);

  const chapters = [];
  let currentSampleOffset = 0;

  for (let idx = 0; idx < ep.caseIds.length; idx++) {
    const qId = ep.caseIds[idx];
    const m4aPath = path.join(AUDIO_CASES_DIR, `${qId}_fall_stem.m4a`);
    const mp3Path = path.join(AUDIO_CASES_DIR, `${qId}_fall_stem.mp3`);
    const caseAudio = fs.existsSync(m4aPath) ? m4aPath : (fs.existsSync(mp3Path) ? mp3Path : null);

    if (!caseAudio) {
      console.warn(`  [Warning] Missing audio for ${qId}, skipping.`);
      continue;
    }

    const casePcm = getPcmFromAudioFile(caseAudio);
    if (!casePcm) {
      console.warn(`  [Warning] Failed to decode PCM for ${qId}, skipping.`);
      continue;
    }

    const ansM4aPath = path.join(AUDIO_CASES_DIR, `${qId}_antwort.m4a`);
    const ansMp3Path = path.join(AUDIO_CASES_DIR, `${qId}_antwort.mp3`);
    const ansAudio = fs.existsSync(ansM4aPath) ? ansM4aPath : (fs.existsSync(ansMp3Path) ? ansMp3Path : null);
    const ansPcm = ansAudio ? getPcmFromAudioFile(ansAudio) : null;

    // Mark chapter start
    const startSec = Math.round((currentSampleOffset / 24000) * 10) / 10;
    const chapterNum = chapters.length + 1;
    chapters.push({
      caseId: qId,
      number: chapterNum,
      hasAnswer: !!ansPcm,
      startSec: startSec,
      formattedTime: `${Math.floor(startSec / 60)}:${Math.floor(startSec % 60).toString().padStart(2, '0')}`
    });

    // 1. Chime
    pcmParts.push(chime);
    currentSampleOffset += (chime.length / 2);

    // 2. Short pause
    const prePause = createSilence(0.5, 24000);
    pcmParts.push(prePause);
    currentSampleOffset += (prePause.length / 2);

    // 3. Case question / stem
    pcmParts.push(casePcm);
    currentSampleOffset += (casePcm.length / 2);

    // 4. Thinking pause before answer (or next case)
    pcmParts.push(thinkingPause);
    currentSampleOffset += (thinkingPause.length / 2);

    // 5. Case answer (if generated)
    if (ansPcm) {
      pcmParts.push(ansPcm);
      currentSampleOffset += (ansPcm.length / 2);
    }

    // 6. Short transition
    pcmParts.push(chapterTransition);
    currentSampleOffset += (chapterTransition.length / 2);

    console.log(`  ✓ Added [Fall ${idx + 1}] ${qId}${ansPcm ? ' (+ Antwort)' : ' (ohne Antwort)'} at ${chapters[chapters.length - 1].formattedTime}`);
  }

  const totalPcm = Buffer.concat(pcmParts);
  const totalDurationSec = Math.round((totalPcm.length / 2 / 24000) * 10) / 10;
  const totalMinutes = (totalDurationSec / 60).toFixed(1);

  const wavPath = path.join(PODCAST_DIR, `${ep.id}.wav`);
  const m4aPath = path.join(PODCAST_DIR, `${ep.id}.m4a`);
  const header = createWavHeader(totalPcm.length, 24000);
  fs.writeFileSync(wavPath, Buffer.concat([header, totalPcm]));

  if (fs.existsSync(m4aPath)) fs.unlinkSync(m4aPath);
  execSync(`/usr/bin/afconvert -f m4af -d aac -b 64000 "${wavPath}" "${m4aPath}"`);
  fs.unlinkSync(wavPath);

  const fileSizeMb = (fs.statSync(m4aPath).size / 1024 / 1024).toFixed(2);
  console.log(`★ Episode Ready: ${m4aPath} (${totalMinutes} min, ${fileSizeMb} MB, ${chapters.length} cases)`);

  return {
    ...ep,
    filePath: `audio/podcasts/${ep.id}.m4a`,
    durationSec: totalDurationSec,
    durationFormatted: `${Math.floor(totalDurationSec / 60)} Min. ${Math.floor(totalDurationSec % 60)} Sek.`,
    fileSizeMb: parseFloat(fileSizeMb),
    chapters
  };
}

function main() {
  ensureDirectories();
  console.log('=== Compiling Facharztprüfung On-The-Go Podcasts ===');

  const manifest = [];
  for (const ep of PODCAST_EPISODES) {
    const built = buildEpisode(ep);
    manifest.push(built);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  // Also write JS file for frontend
  const jsContent = `/**
 * AUTO-GENERATED PODCAST MANIFEST
 * Facharztprüfung Anästhesiologie - 20-Minuten On-The-Go Audio Podcasts
 */
(function(global) {
  global.PODCAST_MANIFEST = ${JSON.stringify(manifest, null, 2)};
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(path.resolve(__dirname, '../js/podcast_manifest.js'), jsContent, 'utf8');

  console.log(`\n🎉 All ${manifest.length} podcasts compiled successfully! Saved to audio/podcasts/ and js/podcast_manifest.js.`);
}

if (require.main === module) {
  main();
}

module.exports = { PODCAST_EPISODES, buildEpisode };
