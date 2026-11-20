#!/usr/bin/env python3
"""
FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - FAST NEURAL TTS GENERATOR
Generates German neural audio files with zero rate limits using Microsoft Azure Neural TTS (Edge-TTS).
Voice: de-DE-ChristophNeural (Senior Examiner, authoritative & natural)
"""

import os
import sys
import re
import json
import asyncio
import subprocess
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("edge_tts not installed. Run: pip install edge-tts")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent.parent
AUDIO_DIR = BASE_DIR / "audio" / "cases"
MANIFEST_JS = BASE_DIR / "js" / "audio_manifest.js"
MANIFEST_JSON = BASE_DIR / "audio" / "audio_manifest.json"
QUESTIONS_FILE = BASE_DIR / "questions.js"

DEFAULT_VOICE = "de-DE-ChristophNeural"

def ensure_dirs():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

def load_questions():
    content = QUESTIONS_FILE.read_text(encoding="utf-8")
    m = re.search(r"const EXAM_QUESTIONS = (\[[\s\S]*?\]);\s*(?:if|$)", content)
    if not m:
        raise ValueError("Could not find EXAM_QUESTIONS in questions.js")
    
    # Use node to evaluate JSON-safe questions cleanly
    cmd = ["node", "-e", "const fs=require('fs');const c=fs.readFileSync('questions.js','utf8');const m=c.match(/const EXAM_QUESTIONS = (\[[\\s\\S]*?\]);\\s*(?:if|$)/);console.log(JSON.stringify(eval(m[1])));"]
    res = subprocess.check_output(cmd, cwd=str(BASE_DIR), text=True)
    return json.loads(res)

def batch_clean_speech_texts(questions):
    """Batch preprocesses medical texts via SpeechEngine in Node.js for perfect clinical German expansions."""
    items = []
    for q in questions:
        raw = q.get("stem_de") or q.get("question_de") or ""
        items.append({"id": q["id"], "text": raw})
    
    tmp_path = BASE_DIR / "scratch" / "texts_to_clean.json"
    tmp_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")

    cmd = ["node", "-e", f"""
    const fs = require('fs');
    const SpeechEngine = require('./js/speech_engine.js');
    const data = JSON.parse(fs.readFileSync('{tmp_path}', 'utf8'));
    const result = {{}};
    for (const item of data) {{
      result[item.id] = SpeechEngine.prepareMedicalTextForSpeech(item.text);
    }}
    console.log(JSON.stringify(result));
    """]
    res = subprocess.check_output(cmd, cwd=str(BASE_DIR), text=True)
    if tmp_path.exists():
        tmp_path.unlink()
    return json.loads(res)

def update_manifest():
    ensure_dirs()
    manifest = {}
    for f in AUDIO_DIR.iterdir():
        if f.suffix in [".m4a", ".mp3", ".wav"]:
            m = re.match(r"^(.+?)_fall_stem\.(m4a|mp3|wav)$", f.name)
            if m:
                manifest[m.group(1)] = f"audio/cases/{f.name}"

    js_code = f"""/**
 * AUTO-GENERATED LOCAL AUDIO MANIFEST
 * Maps question IDs to pre-rendered high-fidelity neural audio files.
 */
(function(global) {{
  global.LOCAL_AUDIO_MANIFEST = {json.dumps(manifest, indent=2, ensure_ascii=False)};
}})(typeof window !== 'undefined' ? window : globalThis);
"""
    MANIFEST_JS.write_text(js_code, encoding="utf-8")
    MANIFEST_JSON.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[Manifest Updated] Indexed {len(manifest)} pre-rendered audio files.")
    return manifest

async def generate_single(sem, qid, text, voice, force=False):
    mp3_path = AUDIO_DIR / f"{qid}_fall_stem.mp3"
    m4a_path = AUDIO_DIR / f"{qid}_fall_stem.m4a"

    if not force and (mp3_path.exists() or m4a_path.exists()):
        return "skipped"

    if not text or len(text.strip()) < 5:
        return "empty"

    async with sem:
        for attempt in range(1, 4):
            try:
                comm = edge_tts.Communicate(text, voice)
                await comm.save(str(mp3_path))
                if mp3_path.exists() and mp3_path.stat().st_size > 1000:
                    return "saved"
            except Exception as e:
                if attempt == 3:
                    print(f"  ✗ Error for {qid}: {e}")
                    return "error"
                await asyncio.sleep(1.5)
        return "error"

async def main():
    ensure_dirs()
    questions = load_questions()
    print(f"Loaded {len(questions)} total questions from questions.js.")

    # Filter arguments
    prefix = ""
    limit = len(questions)
    voice = DEFAULT_VOICE
    force = False

    args = sys.argv[1:]
    for i in range(len(args)):
        if args[i] == "--prefix" and i + 1 < len(args):
            prefix = args[i + 1]
        elif args[i] == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
        elif args[i] == "--voice" and i + 1 < len(args):
            voice = args[i + 1]
        elif args[i] == "--force":
            force = True

    if prefix:
        questions = [q for q in questions if q["id"].startswith(prefix)]
        print(f"Filtered {len(questions)} questions matching prefix '{prefix}'.")

    questions = questions[:limit]
    print(f"Preparing medical German speech texts for {len(questions)} questions...")
    cleaned_texts = batch_clean_speech_texts(questions)

    sem = asyncio.Semaphore(4)  # 4 concurrent downloads for maximum speed without network choke
    tasks = []

    for q in questions:
        qid = q["id"]
        text = cleaned_texts.get(qid, "")
        tasks.append(generate_single(sem, qid, text, voice, force))

    print(f"Generating neural speech with voice '{voice}' (Concurrency: 4)...")
    results = await asyncio.gather(*tasks)

    saved_count = results.count("saved")
    skipped_count = results.count("skipped")
    error_count = results.count("error")

    print(f"\nFinished! New Generated: {saved_count}, Already Existed: {skipped_count}, Errors: {error_count}")
    update_manifest()

if __name__ == "__main__":
    asyncio.run(main())
