#!/usr/bin/env python3
"""
Deep cleaner for OCR word-break artifacts, gas notations, chemical formulas,
and formatting inconsistencies in questions.js.
"""
import json
import re

with open("questions.js", "r", encoding="utf-8") as f:
    raw = f.read()

json_str = re.sub(r'^.*?=\s*', '', raw, count=1, flags=re.DOTALL).rstrip().rstrip(';')
questions = json.loads(json_str)

print(f"Loaded {len(questions)} questions")

# Counters
counts = {
    "hyphen_words": 0,
    "gas_notations": 0,
    "punctuation_spaces": 0,
    "quotes": 0,
}

def clean_medical_text(text):
    if not text or not isinstance(text, str):
        return text
    
    orig = text
    
    # 1. German hyphenated OCR word breaks
    # Do NOT join if followed by 'oder', 'und', 'bzw', 'sowie' (e.g., 'Rechts- und Linksherz')
    def join_hyphen(m):
        w1, w2 = m.group(1), m.group(2)
        if w2.lower() in ("oder", "und", "bzw", "sowie"):
            return m.group(0)
        global counts
        counts["hyphen_words"] += 1
        return w1 + w2

    text = re.sub(r'\b([A-Za-zÄÖÜäöüß]{2,})-\s+([a-zäöüß]{2,})\b', join_hyphen, text)
    
    # 2. Gas and Blood-Gas Notations
    # PaO2, PaCO2, PECO2, FiO2, PAO2, pO2, pCO2, O2, CO2
    def fix_gas(t):
        global counts
        
        # PaO2
        t_new = re.sub(r'\b[pP]\s*[aA]\s*[oO]\s*2\b', 'PaO₂', t)
        # PaCO2
        t_new = re.sub(r'\b[pP]\s*[aA]\s*[cC][oO]\s*2\b', 'PaCO₂', t_new)
        # PECO2
        t_new = re.sub(r'\b[pP]\s*[eE]\s*[cC][oO]\s*2\b', 'PECO₂', t_new)
        # PAO2
        t_new = re.sub(r'\b[pP]\s*[aA]\s*[oO]\s*2\b', 'PAO₂', t_new) # capital A if distinct
        # FiO2
        t_new = re.sub(r'\b[fF]\s*[iI]\s*[oO]\s*2\b', 'FiO₂', t_new)
        # pO2
        t_new = re.sub(r'\b[pP]\s*[oO]\s*2\b', 'pO₂', t_new)
        # pCO2
        t_new = re.sub(r'\b[pP]\s*[cC][oO]\s*2\b', 'pCO₂', t_new)
        # O2
        t_new = re.sub(r'\b[oO]\s*2\b', 'O₂', t_new)
        # CO2
        t_new = re.sub(r'\b[cC][oO]\s*2\b', 'CO₂', t_new)
        # Ion / Chemical notation
        t_new = re.sub(r'\b[cC]a\s*2\+\b', 'Ca²⁺', t_new)
        t_new = re.sub(r'\b[hH]\+\b', 'H⁺', t_new)
        t_new = re.sub(r'\b[kK]\+\b', 'K⁺', t_new)
        t_new = re.sub(r'\b[nN]a\+\b', 'Na⁺', t_new)
        t_new = re.sub(r'\b[hH][cC][oO]\s*3\b', 'HCO₃⁻', t_new)

        if t_new != t:
            counts["gas_notations"] += 1
        return t_new

    text = fix_gas(text)
    
    # 3. Clean spaces before punctuation
    t_punc = re.sub(r'\s+([\.,;:\?!])', r'\1', text)
    # Restore space after colon/comma if missing
    t_punc = re.sub(r'([,;:\?!])([A-Za-zÄÖÜäöüß])', r'\1 \2', t_punc)
    if t_punc != text:
        counts["punctuation_spaces"] += 1
        text = t_punc

    # 4. Clean up weird German quotes like » text « or »text «
    t_quote = re.sub(r'»\s+', '»', text)
    t_quote = re.sub(r'\s+«', '«', t_quote)
    if t_quote != text:
        counts["quotes"] += 1
        text = t_quote

    # 5. Fix double spaces
    text = re.sub(r'[ \t]+', ' ', text).strip()

    return text

# Apply to all fields in questions
for q in questions:
    for field in ["stem_de", "stem_tr", "question_de", "question_tr", "answer_de", "answer_tr", "explanation_de", "explanation_tr"]:
        if field in q and q[field]:
            q[field] = clean_medical_text(q[field])
    
    if "options" in q:
        for opt in q["options"]:
            for field in ["text_de", "text_tr", "explanation_de", "explanation_tr"]:
                if field in opt and opt[field]:
                    opt[field] = clean_medical_text(opt[field])

print("\nCleaning summary:")
for k, v in counts.items():
    print(f"  {k:25s}: {v}")

# Write cleaned questions back
js_output = "// Facharztprüfung Anästhesiologie - Question Bank\nconst EXAM_QUESTIONS = " + \
    json.dumps(questions, ensure_ascii=False, indent=2) + ";\n"

with open("questions.js", "w", encoding="utf-8") as f:
    f.write(js_output)

print("\n✅ Successfully updated questions.js with cleaned text!")
