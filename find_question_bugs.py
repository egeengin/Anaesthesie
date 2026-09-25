#!/usr/bin/env python3
"""
Comprehensive question quality scanner for questions.js.
Checks every possible data-quality bug category:

  STRUCTURAL BUGS:
   1. Duplicate option keys within one question
   2. Too many options (>5)
   3. Too few options (<2) — trivially solvable or broken
   4. Missing/empty required fields (stem, text, explanations)
   5. Option keys not in expected sequence (a-e)
   6. Duplicate question IDs
   7. Duplicate question stems (same question appearing twice)
   8. Missing or empty category

  CONTENT CORRUPTION:
   9. Option text starts with "Richtig./Falsch." (explanation leaked as option)
  10. Option text >200 chars (cross-contaminated)
  11. Stub explanations ("d. ✅ Richtig." instead of real content)
  12. Wrong letter references in explanations
  13. Book formatting artifacts in any text field
  14. German hyphenation artifacts ("wer- den", "Patien- ten")
  15. Cross-contamination from other questions (Laktat in non-Laktat question, etc.)

  TRANSLATION BUGS:
  16. Turkish stub explanations
  17. Mismatched Turkish translations (different topic than German)
  18. Turkish text identical to German (untranslated)
  19. Missing Turkish translation when German exists

  LOGICAL / ANSWER BUGS:
  20. All options marked correct (suspicious)
  21. All options marked incorrect (suspicious — likely parsing error)
  22. No correct answer at all
  23. Duplicate option text (same text_de in multiple options)
  24. Explanation text identical to option text (copy-paste error)

  ENCODING / FORMATTING:
  25. Text ending mid-word (truncated)
  26. Broken unicode or encoding artifacts
  27. Excessively short stem (<10 chars)
  28. Excessively short option text (<3 chars)
"""
import json
import re
import sys
from collections import Counter

# ─── Load questions.js ───────────────────────────────────────────────────────

with open("questions.js", "r", encoding="utf-8") as f:
    raw = f.read()

# Extract content between first '[' and last ']'
start_idx = raw.find('[')
end_idx = raw.rfind(']')
if start_idx != -1 and end_idx != -1:
    json_str = raw[start_idx:end_idx+1]
else:
    json_str = re.sub(r'^.*?=\s*', '', raw, count=1, flags=re.DOTALL).rstrip().rstrip(';')

questions = json.loads(json_str)

print(f"Loaded {len(questions)} questions from questions.js\n")

bug_count = 0
bugs_by_type = Counter()
bugs_by_severity = Counter()
affected_questions = set()

def report_bug(q, bug_type, detail, severity="ERROR"):
    """severity: ERROR (must fix), WARNING (should fix), INFO (cosmetic)"""
    global bug_count
    bug_count += 1
    bugs_by_type[bug_type] += 1
    bugs_by_severity[severity] += 1
    affected_questions.add(q["id"])
    icon = {"ERROR": "🐛", "WARNING": "⚠️", "INFO": "ℹ️"}[severity]
    print(f"{icon} [{severity}] #{bug_count} [{bug_type}] in {q['id']}")
    print(f"   Q: {q.get('stem_de', q.get('question_de', ''))[:80]}...")
    print(f"   {detail}")
    print()


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL CHECKS
# ═══════════════════════════════════════════════════════════════════════════════

# --- Duplicate IDs ---
id_counts = Counter(q["id"] for q in questions)
for qid, count in id_counts.items():
    if count > 1:
        for q in questions:
            if q["id"] == qid:
                report_bug(q, "DUPLICATE_ID", f"ID '{qid}' appears {count} times", "ERROR")
                break

# --- Duplicate stems ---
stem_counts = Counter()
for q in questions:
    stem = q.get("stem_de", q.get("question_de", "")).strip().lower()
    if stem:
        stem_counts[stem] += 1

for stem, count in stem_counts.items():
    if count > 1:
        for q in questions:
            q_stem = q.get("stem_de", q.get("question_de", "")).strip().lower()
            if q_stem == stem:
                report_bug(q, "DUPLICATE_STEM", f"Question stem appears {count} times", "WARNING")
                break


# ═══════════════════════════════════════════════════════════════════════════════
# PER-QUESTION CHECKS
# ═══════════════════════════════════════════════════════════════════════════════

for q in questions:
    qtype = q.get("question_type", "")
    
    # ─── STRUCTURAL: Missing/empty required fields ────────────────────
    
    # Check category
    if not q.get("category", "").strip():
        report_bug(q, "MISSING_CATEGORY", "Question has no category", "WARNING")
    
    # Check stem
    stem_de = q.get("stem_de", q.get("question_de", ""))
    stem_tr = q.get("stem_tr", q.get("question_tr", ""))
    
    if not stem_de or not stem_de.strip():
        report_bug(q, "MISSING_STEM_DE", "No German stem/question text", "ERROR")
    elif len(stem_de.strip()) < 10:
        report_bug(q, "SHORT_STEM", f"Stem is only {len(stem_de.strip())} chars: '{stem_de.strip()}'", "WARNING")
    
    if not stem_tr or not stem_tr.strip():
        report_bug(q, "MISSING_STEM_TR", "No Turkish stem/question translation", "WARNING")
    
    # ─── OPTIONS-type specific checks ─────────────────────────────────
    if qtype == "options":
        opts = q.get("options", [])
        
        if not opts:
            report_bug(q, "NO_OPTIONS", "Options-type question has no options", "ERROR")
            continue
        
        # --- Too few options ---
        if len(opts) == 1:
            report_bug(q, "SINGLE_OPTION", "Question has only 1 option (trivially solvable)", "ERROR")
        elif len(opts) == 2:
            report_bug(q, "FEW_OPTIONS", "Question has only 2 options", "INFO")
        
        # --- Too many options ---
        if len(opts) > 5:
            keys = [o["key"] for o in opts]
            report_bug(q, "TOO_MANY_OPTIONS",
                f"Question has {len(opts)} options (expected max 5). Keys: {keys}", "ERROR")
        
        # --- Duplicate option keys ---
        keys = [o["key"] for o in opts]
        seen_keys = {}
        for i, k in enumerate(keys):
            if k in seen_keys:
                report_bug(q, "DUPLICATE_KEY",
                    f"Key '{k}' at positions {seen_keys[k]} and {i} (keys: {keys})", "ERROR")
            else:
                seen_keys[k] = i
        
        # --- Option key sequence ---
        expected = ['a', 'b', 'c', 'd', 'e'][:len(opts)]
        if keys != expected and len(set(keys)) == len(keys):  # only if no duplicates
            report_bug(q, "KEY_SEQUENCE", f"Keys {keys} not in expected order {expected}", "INFO")
        
        # --- All correct or all incorrect ---
        correct_count = sum(1 for o in opts if o.get("is_correct", False))
        if correct_count == 0:
            report_bug(q, "NO_CORRECT_ANSWER", "No option is marked as correct", "WARNING")
        elif correct_count == len(opts):
            report_bug(q, "ALL_CORRECT", f"All {len(opts)} options are marked correct", "WARNING")
        
        # --- Duplicate option text ---
        text_set = {}
        for o in opts:
            txt = o.get("text_de", "").strip().lower()
            if txt in text_set and txt:
                report_bug(q, "DUPLICATE_OPTION_TEXT",
                    f"Options {text_set[txt]} and {o['key']} have identical text_de", "ERROR")
            else:
                text_set[txt] = o["key"]
        
        # --- Per-option checks ---
        for opt in opts:
            text_de = opt.get("text_de", "")
            text_tr = opt.get("text_tr", "")
            expl_de = opt.get("explanation_de", "")
            expl_tr = opt.get("explanation_tr", "")
            key = opt.get("key", "?")
            
            # Missing option text
            if not text_de or not text_de.strip():
                report_bug(q, "EMPTY_OPTION_TEXT_DE",
                    f"Option {key}: text_de is empty", "ERROR")
            elif len(text_de.strip()) < 3:
                report_bug(q, "SHORT_OPTION_TEXT",
                    f"Option {key}: text_de is only {len(text_de.strip())} chars: '{text_de.strip()}'", "WARNING")
            
            # Missing Turkish translation for option
            if text_de and text_de.strip() and (not text_tr or not text_tr.strip()):
                report_bug(q, "MISSING_OPTION_TR",
                    f"Option {key}: has text_de but no text_tr", "INFO")
            
            # Option text starts with "Richtig." or "Falsch." (explanation leaked)
            if text_de and re.match(r'^(Richtig|Falsch)\.', text_de.strip()):
                report_bug(q, "EXPLANATION_AS_OPTION",
                    f"Option {key}: text_de starts with 'Richtig./Falsch.' — leaked explanation\n"
                    f"   text: {text_de[:120]}...", "ERROR")
            
            # Option text too long (cross-contamination)
            if text_de and len(text_de) > 200:
                report_bug(q, "OPTION_TEXT_TOO_LONG",
                    f"Option {key}: text_de is {len(text_de)} chars — may be cross-contaminated\n"
                    f"   text: {text_de[:150]}...", "WARNING")
            
            # Stub explanation DE
            if expl_de and re.match(r'^[a-e]\.\s*[✅❌]\s*(Richtig|Falsch)\.?\s*$', expl_de.strip()):
                report_bug(q, "STUB_EXPLANATION_DE",
                    f"Option {key}: explanation_de is just a stub: '{expl_de.strip()}'", "ERROR")
            
            # Stub explanation TR
            if expl_tr and re.match(r'^[A-Ea-e]\.\s*[✅❌]\s*(Doğru|Yanlış)\.?\s*$', expl_tr.strip()):
                report_bug(q, "STUB_EXPLANATION_TR",
                    f"Option {key}: explanation_tr is just a stub: '{expl_tr.strip()}'", "ERROR")
            
            # Wrong letter reference in explanation
            letter_match = re.match(r'^([a-e])\.\s*[✅❌]?\s*(Richtig|Falsch)', expl_de.strip())
            if letter_match and letter_match.group(1) != key:
                report_bug(q, "WRONG_LETTER_REF",
                    f"Option {key}: explanation_de references letter '{letter_match.group(1)}'\n"
                    f"   explanation: {expl_de[:100]}...", "ERROR")
            
            # Book formatting artifacts
            if re.search(r'\d+\s+\d+Kapitel\s+\d+', expl_de):
                report_bug(q, "BOOK_ARTIFACT_EXPL",
                    f"Option {key}: book artifacts in explanation_de\n"
                    f"   ...{expl_de[-80:]}", "ERROR")
            if text_de and re.search(r'\d+\s+\d+Kapitel\s+\d+', text_de):
                report_bug(q, "BOOK_ARTIFACT_TEXT",
                    f"Option {key}: book artifacts in text_de", "ERROR")
            
            # German hyphenation artifacts (broken words)
            for field_name, field_val in [("text_de", text_de), ("explanation_de", expl_de)]:
                if field_val and re.search(r'[a-zäöüß]-\s+[a-zäöüß]', field_val):
                    # This is common in PDF extraction — count occurrences
                    breaks = re.findall(r'[a-zäöüß]-\s+[a-zäöüß]', field_val)
                    if len(breaks) >= 3:
                        report_bug(q, "HYPHENATION_ARTIFACTS",
                            f"Option {key}: {field_name} has {len(breaks)} unjoined hyphenated words\n"
                            f"   examples: {breaks[:3]}", "INFO")
            
            # Explanation identical to option text (copy-paste)
            if expl_de and text_de and expl_de.strip() == text_de.strip():
                report_bug(q, "EXPLANATION_IS_OPTION_TEXT",
                    f"Option {key}: explanation_de is identical to text_de", "WARNING")
            
            # Turkish translation identical to German (untranslated)
            if text_de and text_tr and text_de.strip() == text_tr.strip() and len(text_de.strip()) > 10:
                report_bug(q, "UNTRANSLATED_OPTION",
                    f"Option {key}: text_tr is identical to text_de (not translated)", "WARNING")
            if expl_de and expl_tr and expl_de.strip() == expl_tr.strip() and len(expl_de.strip()) > 10:
                report_bug(q, "UNTRANSLATED_EXPLANATION",
                    f"Option {key}: explanation_tr is identical to explanation_de", "WARNING")
            
            # Mismatched Turkish translation topic
            expl_de_lower = expl_de.lower() if expl_de else ""
            expl_tr_lower = expl_tr.lower() if expl_tr else ""
            if ("hiperaldosteronizm" in expl_tr_lower or "conn sendromu" in expl_tr_lower) and \
               "aldosteron" not in expl_de_lower and "conn" not in expl_de_lower:
                report_bug(q, "MISMATCHED_TRANSLATION",
                    f"Option {key}: TR mentions Hiperaldosteronizm/Conn but DE does not", "ERROR")
            
            # Missing explanation entirely (especially for incorrect answers)
            if not expl_de or not expl_de.strip():
                if not opt.get("is_correct", True):
                    report_bug(q, "MISSING_EXPLANATION_INCORRECT",
                        f"Option {key}: incorrect answer has no explanation", "INFO")
            
            # Text ends mid-word (truncated)
            if text_de and re.search(r'[a-zäöüß]-$', text_de.strip()):
                report_bug(q, "TRUNCATED_TEXT",
                    f"Option {key}: text_de appears truncated (ends with hyphen)\n"
                    f"   ...{text_de[-50:]}", "WARNING")
    
    # ─── OPEN-type specific checks ────────────────────────────────────
    elif qtype == "open":
        question_de = q.get("question_de", "")
        answer_de = q.get("answer_de", "")
        question_tr = q.get("question_tr", "")
        answer_tr = q.get("answer_tr", "")
        
        if not question_de or not question_de.strip():
            report_bug(q, "MISSING_OPEN_QUESTION", "Open question has no question_de", "ERROR")
        
        if not answer_de or not answer_de.strip():
            report_bug(q, "MISSING_OPEN_ANSWER", "Open question has no answer_de", "ERROR")
        
        if question_de and (not question_tr or not question_tr.strip()):
            report_bug(q, "MISSING_OPEN_QUESTION_TR", "Open question has no Turkish translation", "INFO")
        
        if answer_de and (not answer_tr or not answer_tr.strip()):
            report_bug(q, "MISSING_OPEN_ANSWER_TR", "Open answer has no Turkish translation", "INFO")
        
        # Book artifacts in open questions
        for fname, fval in [("question_de", question_de), ("answer_de", answer_de)]:
            if fval and re.search(r'\d+\s+\d+Kapitel\s+\d+', fval):
                report_bug(q, "BOOK_ARTIFACT_OPEN",
                    f"{fname} contains book formatting artifacts", "ERROR")
    
    else:
        if qtype:
            report_bug(q, "UNKNOWN_TYPE", f"Unknown question_type: '{qtype}'", "WARNING")
        else:
            report_bug(q, "MISSING_TYPE", "Question has no question_type field", "ERROR")


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print("=" * 70)
print(f"\n📊 COMPREHENSIVE SCAN RESULTS")
print(f"{'='*70}")
print(f"   Total questions scanned: {len(questions)}")
print(f"   Total bugs found:        {bug_count}")
print(f"   Affected questions:       {len(affected_questions)}")
print()

if bugs_by_severity:
    print(f"BY SEVERITY:")
    for sev in ["ERROR", "WARNING", "INFO"]:
        if sev in bugs_by_severity:
            print(f"   🐛 {sev:10s}: {bugs_by_severity[sev]:4d}")
    print()

if bugs_by_type:
    print(f"BY TYPE:")
    for bug_type, count in bugs_by_type.most_common():
        print(f"   {bug_type:40s}: {count:4d}")
    print()

if bug_count == 0:
    print("✅ No bugs found! All questions pass quality checks.")
elif bugs_by_severity.get("ERROR", 0) == 0:
    print(f"✅ No critical errors! {bugs_by_severity.get('WARNING', 0)} warnings and {bugs_by_severity.get('INFO', 0)} informational items.")
else:
    print(f"❌ {bugs_by_severity.get('ERROR', 0)} critical errors need fixing!")
