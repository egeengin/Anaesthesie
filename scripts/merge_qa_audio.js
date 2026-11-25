/**
 * Merges any standalone <id>_antwort.m4a into <id>_fall_stem.m4a
 * (Question + 3s thinking pause + Answer in a single file)
 * and deletes the separate _antwort.m4a file.
 * Records completed IDs in audio/qa_completed.json so future runs skip them.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AUDIO_DIR = path.resolve(__dirname, '../audio/cases');
const QA_COMPLETED_PATH = path.resolve(__dirname, '../audio/qa_completed.json');

function createWavHeader(dataLength, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

function getPcmFromAudioFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const tmpWav = `/tmp/qa_merge_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`;
  try {
    execSync(`/usr/bin/afconvert -f WAVE -d LEI16 -c 1 -r 24000 "${filePath}" "${tmpWav}"`, { stdio: 'ignore' });
    const buf = fs.readFileSync(tmpWav);
    fs.unlinkSync(tmpWav);
    if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
      return null;
    }
    let offset = 12;
    while (offset + 8 <= buf.length) {
      const chunkId = buf.toString('ascii', offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      const dataStart = offset + 8;
      if (chunkId === 'data') {
        return buf.slice(dataStart, Math.min(buf.length, dataStart + chunkSize));
      }
      offset = dataStart + chunkSize + (chunkSize % 2);
    }
    return null;
  } catch (e) {
    if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
    return null;
  }
}

function loadCompleted() {
  if (fs.existsSync(QA_COMPLETED_PATH)) {
    try {
      return new Set(JSON.parse(fs.readFileSync(QA_COMPLETED_PATH, 'utf8')));
    } catch (e) {}
  }
  return new Set();
}

function saveCompleted(set) {
  fs.writeFileSync(QA_COMPLETED_PATH, JSON.stringify(Array.from(set).sort(), null, 2), 'utf8');
}

function main() {
  const completed = loadCompleted();
  const files = fs.readdirSync(AUDIO_DIR).sort();
  const answerFiles = files.filter(f => f.endsWith('_antwort.m4a'));

  if (answerFiles.length === 0) {
    console.log('No standalone _antwort.m4a files to merge.');
    return;
  }

  const pausePcm = Buffer.alloc(Math.floor(24000 * 3.0) * 2); // 3s silence
  let merged = 0;

  for (const ansFile of answerFiles) {
    const qId = ansFile.replace('_antwort.m4a', '');
    const ansPath = path.join(AUDIO_DIR, ansFile);
    const stemPath = path.join(AUDIO_DIR, `${qId}_fall_stem.m4a`);

    const ansPcm = getPcmFromAudioFile(ansPath);
    if (!ansPcm) {
      console.warn(`Skipping ${qId}: failed to decode ${ansFile}`);
      continue;
    }

    const stemPcm = fs.existsSync(stemPath) ? getPcmFromAudioFile(stemPath) : null;
    const combinedPcm = stemPcm ? Buffer.concat([stemPcm, pausePcm, ansPcm]) : ansPcm;

    const tmpWav = path.join(AUDIO_DIR, `${qId}_combined_tmp.wav`);
    const header = createWavHeader(combinedPcm.length, 24000);
    fs.writeFileSync(tmpWav, Buffer.concat([header, combinedPcm]));

    if (fs.existsSync(stemPath)) fs.unlinkSync(stemPath);
    execSync(`/usr/bin/afconvert -f m4af -d aac -b 64000 "${tmpWav}" "${stemPath}"`, { stdio: 'ignore' });
    fs.unlinkSync(tmpWav);
    fs.unlinkSync(ansPath);

    completed.add(qId);
    merged++;
    console.log(`✓ Merged ${qId} (Question + 3s Pause + Answer) into ${qId}_fall_stem.m4a`);
  }

  saveCompleted(completed);
  console.log(`Done! Merged ${merged} Q+A files. Total Q+A completed: ${completed.size}`);
}

if (require.main === module) {
  main();
}

module.exports = { getPcmFromAudioFile, createWavHeader, loadCompleted, saveCompleted };
