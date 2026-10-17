/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - CURRICULUM & MEDICAL GROUND-TRUTH ENGINE
 * Ärztekammer Nordrhein (ÄKNO Düsseldorf) - 3-Stufen-Lernpfad, DGAI/AWMF Guidelines,
 * 30-Sekunden-Spickzettel, Redefluss-Baukasten, BGA-Trainer & Medizinrecht
 */

(function (global) {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TOP-50 HIGH-YIELD ÜBERLEBENSFÄLLE (STAGE 1 IDENTIFIERS)
  // ─────────────────────────────────────────────────────────────────────────────
  const CORE_SURVIVAL_KEYWORDS = [
    'maligne hyperthermie', 'dantrolen',
    'last', 'lokalanästhetika-intoxikation', 'intralipid',
    'schwieriger atemweg', 'cico', 'koniotomie', 'efona', 'videolaryngoskop',
    'anaphylaxie', 'adrenalin',
    'aspiration', 'rsi', 'krikoiddruck',
    'hohe spinalanästhesie', 'sympathikolyse',
    'präeklampsie', 'hellp', 'magnesiumsulfat',
    'postpartale blutung', 'pph', 'atonia uteri', 'sulproston',
    'tur-syndrom', 'hyponatriämie', 'ods',
    'lungenembolie', 'thrombolyse', 'rtpa',
    'sepsis', 'septischer schock', 'noradrenalin',
    'ards', 'lungenprotektiv', 'driving pressure',
    'polytrauma', 'schockraum', 'massenblutung', 'rotem',
    'laryngospasmus', 'fremdkörperaspiration', 'kindernotfall',
    'hirntod', 'hirnfunktionsausfall', 'apnoe-test'
  ];

  /**
   * Initializes curriculum stages on the questions dataset
   * Stage 1: Top-50 High-Yield Überlebensfälle (Düsseldorf protocol & core emergencies)
   * Stage 2: Klinische Vertiefung (Remaining open case & image routine scenarios)
   * Stage 3: ÄKNO Generalprobe (45-Min Mock Exam)
   */
  function tagCurriculumStages(questions) {
    if (!Array.isArray(questions)) return;

    questions.forEach(q => {
      const isDus = !!q.is_dus_protocol || (q.source_book && q.source_book.includes('Düsseldorf'));
      const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.answer_de || '') + ' ' + (q.category || '')).toLowerCase();
      
      const isSurvivalCore = CORE_SURVIVAL_KEYWORDS.some(kw => text.includes(kw));

      if (isDus || (isSurvivalCore && q.question_type !== 'options')) {
        q.stage = 1;
        q.is_high_yield = true;
      } else if (q.question_type === 'open' || q.image) {
        q.stage = 2;
      } else {
        q.stage = 2; // MCQ converted to oral intermediate questions
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MEDICAL GROUND-TRUTH LAYER (DGAI / AWMF GUIDELINES, DOSAGES & K.O. TRAPS)
  // ─────────────────────────────────────────────────────────────────────────────
  function _computeMedicalGroundTruth(q) {
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.answer_de || '') + ' ' + (q.category || '')).toLowerCase();

    // Maligne Hyperthermie (MH)
    if (text.includes('maligne hyperthermie') || text.includes('dantrolen')) {
      return {
        topic: 'Maligne Hyperthermie (MH)',
        topic_tr: 'Malign Hipertermi (MH)',
        firstDrugTR: 'Dantrolen (2,5 mg/kg i.v. Bolus)',
        guideline: {
          title: 'S2k-Leitlinie Diagnostik und Therapie der Malignen Hyperthermie',
          society: 'DGAI / BDA & European Malignant Hyperthermia Group (EMHG)',
          awmf: 'AWMF-Registernummer 001-036',
          year: '2023',
          recommendation: 'Sofortige Trigger-Unterbrechung (Volatila STOP, Vapor dekonnektieren), 100% O2 mit maximalem Flow, Hyperventilation (2-3x MV), Dantrolen i.v. als Kausaltherapie.',
          recommendation_tr: 'Tetikleyicilerin derhal kesilmesi (uçucu anestezikleri DURDUR, vaporizatörü ayır), maksimum akımla %100 O2, hiperventilasyon (dakika hacminin 2-3 katı), nedene yönelik tedavi olarak Dantrolen i.v.'
        },
        dosages: [
          { drug: 'Dantrolen (Ryanodex / Dantrolen i.v.)', dose: '2,5 mg/kg i.v. Bolus', route: 'i.v.', maxDose: 'Bis zu 10 mg/kg (Titration bis Abfall von EtCO₂ & Tachykardie)', limits: 'EtCO₂ Normalisierung, T < 38,5°C' },
          { drug: 'Kühlung (Eispacks, kalte Infusionen)', dose: 'Kalte Ringer-Laktat 4°C', route: 'i.v. / extern', maxDose: 'Stopp bei Kerntemperatur 38,5°C', limits: 'Rebound-Hypothermie vermeiden' },
          { drug: 'Forcierte Diurese', dose: 'Furosemid 0,5–1 mg/kg + Mannitol 20%', route: 'i.v.', maxDose: 'Urin-Ausscheidung > 1,5–2 ml/kg/h', limits: 'Prävention von Myoglobinurie-Nierenversagen' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Kalziumkanalblockern (z.B. Verapamil / Diltiazem)', whyFatal: 'Führt bei MH in Kombination mit Dantrolen zu therapierefraktärer Hyperkaliämie, myokardialem Kreislaufkollaps und Asystolie!', correctAction: 'Kalziumantagonisten sind STRENG KONTRAINDIZIERT! Hyperkaliämie mit Glukose-Insulin, Kalziumchlorid und ggf. Dialyse behandeln.' },
          { mistake: 'Zuwarten mit Dantrolen bis zum Fieberanstieg', whyFatal: 'Hyperthermie ist ein Spätsymptom! Hauptfrühzeichen sind unbegründeter EtCO₂-Anstieg und Tachykardie / Masseterspasmus.', correctAction: 'Dantrolen sofort bei begründetem Verdacht (steigendes EtCO₂) ohne Zögern applizieren.' }
        ]
      };
    }

    // Lokalanästhetika-Intoxikation (LAST)
    if (text.includes('last') || text.includes('lokalanästhetika') || text.includes('intralipid')) {
      return {
        topic: 'Lokalanästhetika-Intoxikation (LAST)',
        topic_tr: 'Lokal Anestezik Sistemik Toksisitesi (LAST)',
        firstDrugTR: 'Lipid Emülsiyonu %20 (İntralipid) (1,5 ml/kg i.v. bolus 1 dakikada)',
        guideline: {
          title: 'DGAI-Handlungsempfehlung: Systemische Toxizität von Lokalanästhetika (LAST)',
          society: 'DGAI / BDA / ESAIC / ASRA-Standard',
          awmf: 'DGAI SOP Lokalanästhetika-Intoxikation',
          year: '2023',
          recommendation: 'Injektion sofort stoppen, Hilfe rufen, Atemweg sichern (100% O2 zur Azidosevermeidung), Krampfanfall mit Benzodiazepin/Propofol kupieren, frühzeitige Lipid-Rettung (Lipid 20%).',
          recommendation_tr: 'Enjeksiyonu derhal durdur, yardım çağır, havayolunu emniyete al (asidozu önlemek için %100 O2), nöbeti benzodiazepin/propofol ile sonlandır, erken lipid kurtarma tedavisi (%20 İntralipid).'
        },
        dosages: [
          { drug: 'Lipidemulsion 20% (Intralipid)', dose: '1,5 ml/kg i.v. Bolus über 1 min (~100 ml bei 70 kg)', route: 'i.v.', maxDose: 'Bolus max. 2x wdh. alle 5 min, anschl. 0,25–0,5 ml/kg/min; Max: 10–12 ml/kg', limits: 'Propofol ist KEIN Lipidersatz!' },
          { drug: 'Adrenalin (bei Reanimation/Kollaps)', dose: 'Niedrig dosiert: 10–50 µg i.v. Boli (≤ 1 µg/kg)', route: 'i.v.', maxDose: 'KEINE Standard-1-mg-Boli (Arrhythmiegefahr & Lungenödem!)', limits: 'Vasopressin, Ca-Blocker und Lidocain KONTRAINDIZIERT' },
          { drug: 'Krampfkupierung', dose: 'Midazolam 0,05–0,1 mg/kg i.v.', route: 'i.v.', maxDose: 'Propofol nur niedrig dosiert bei stabilen Kreislaufverhältnissen', limits: 'Azidose drastisch verschlechtert LAST' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Lidocain oder anderen Antiarrhythmika der Klasse I', whyFatal: 'Addiert zusätzliche Natriumkanal-Blockade und führt zu irreversiblem Asystolie-Kreislaufstillstand!', correctAction: 'Ausschließlich Lipid 20%, Amiodaron bei ventrikulären Rhythmusstörungen, Reanimation nach modifiziertem ALS.' },
          { mistake: 'Standard-Adrenalin-Bolus von 1 mg i.v.', whyFatal: 'Erhöht den myokardialen Sauerstoffverbrauch und triggert therapierefraktäre Kammerrhythmusstörungen.', correctAction: 'Adrenalin streng titriert in Mini-Boli (< 1 µg/kg, d.h. 10–50 µg).' }
        ]
      };
    }

    // Schwieriger Atemweg / CICO / eFONA
    if (text.includes('atemweg') || text.includes('intubation') || text.includes('cico') || text.includes('koniotomie') || text.includes('videolaryngoskop')) {
      return {
        topic: 'Atemwegsmanagement & Can-Not-Intubate-Can-Not-Oxygenate (CICO)',
        topic_tr: 'Havayolu Yönetimi & Entübe Edilemiyor-Oksijenlenemiyor (CICO)',
        firstDrugTR: 'Sugammadex (Roküronyumda CICO kurtarma için 16 mg/kg i.v. ani bolus)',
        guideline: {
          title: 'S1-Leitlinie Atemwegsmanagement (Präoperativ, Notfall, CICO)',
          society: 'DGAI / BDA Arbeitskreis Atemwegsmanagement',
          awmf: 'AWMF-Registernummer 001-028',
          year: '2023',
          recommendation: 'Strikter DGAI 4-Stufen-Plan: Plan A (Maske & Videolaryngoskopie, max. 3 Versuche), Plan B (Supraglottischer Atemweg / Larynxmaske 2. Generation), Plan C (Aufwachen lassen / Beutel-Maske), Plan D (eFONA: Skalpell-Bougie-Tubus).',
          recommendation_tr: 'Katı DGAI 4 basamaklı planı: Plan A (Maske & Videolaringoskopi, en fazla 3 deneme), Plan B (Supraglottik havayolu / 2. nesil LMA), Plan C (Uyandırma / Balon-Maske), Plan D (eFONA: Skalpel-Buji-Tüp).'
        },
        dosages: [
          { drug: 'Sugammadex (CICO-Rescue bei Rocuronium)', dose: '16 mg/kg i.v. Notfall-Sofortbolus', route: 'i.v.', maxDose: 'Vollständige Aufhebung der neuromuskulären Blockade in < 3 min', limits: 'Funktioniert nur bei Rocuronium/Vecuronium' },
          { drug: 'eFONA (Emergency Front of Neck Airway)', dose: 'Skalpell Nr. 10 (horizontaler Schnitt) + Bougie + Ch. 6.0 Tubus', route: 'Koniotomie', maxDose: 'Keine Nadelpunktion bei Erwachsenen (Versagerquote > 60%)', limits: 'Durchführung bei SpO₂-Abfall < 80% im CICO' },
          { drug: 'Sauerstoff-Insufflation', dose: '100% FiO2 High-Flow (bis 60 l/min)', route: 'Nasal / Maske', maxDose: 'Apnoische Oxygenierung während Intubationsversuchen', limits: 'Voroxygenierung mit EtO2 > 90%' }
        ],
        koPitfalls: [
          { mistake: 'Mehr als 3 Intubationsversuche ohne Verfahrenswechsel', whyFatal: 'Verursacht Schwellung, Blutung und konvertiert eine "Can-Ventilate"-Situation in ein tödliches CICO!', correctAction: 'Maximal 3 Versuche (nur 1 mit direkter Laryngoskopie, sofortiger Wechsel auf Videolaryngoskop & Plan B Larynxmaske).' },
          { mistake: 'Zögern bei der chirurgischen Koniotomie (eFONA) im CICO-Fall', whyFatal: 'Führt zu hypoxischem Hirnschaden und Herzkreislaufstillstand innerhalb von 3-4 Minuten.', correctAction: 'Sofortige Ansage: "CICO-Notfall - Koniotomie-Besteck öffnen!" Skalpell-Bougie-Tubus-Technik.' }
        ]
      };
    }

    // Aortenklappenstenose & Hämodynamik
    if (text.includes('aortenklappen') || text.includes('aortenstenose')) {
      return {
        topic: 'Schwere Aortenklappenstenose',
        topic_tr: 'Ağır Aort Kapak Darlığı',
        firstDrugTR: 'Noradrenalin (1. seçenek: 2-10 µg i.v. bolus veya 0,02-0,2 µg/kg/dk)',
        guideline: {
          title: 'DGAI / ESC Leitlinie Perioperatives Management kardialer Risikopatienten',
          society: 'DGAI / BDA / ESC / ESAIC',
          awmf: 'AWMF-Registernummer 001-016',
          year: '2023',
          recommendation: 'Hämodynamische Trias: SVR hoch-normal, Sinusrhythmus 60–80/min, Vorlast hoch-normal. Invasive Blutdruckmessung vor Narkoseeinleitung.',
          recommendation_tr: 'Hemodinamik Triad: SVR yüksek-normal, Sinüs ritmi 60–80/dk, Ön yük yüksek-normal. Anestezi indüksiyonundan önce invaziv arteriyel kan basıncı ölçümü şarttır.'
        },
        dosages: [
          { drug: 'Noradrenalin (Vasopressor der 1. Wahl)', dose: '2–10 µg i.v. Boli oder 0,02–0,2 µg/kg/min Perfusor', route: 'i.v.', maxDose: 'Ziel-MAP ≥ 75–80 mmHg', limits: 'Periphere Vasokonstriktion sichert Koronardurchblutung' },
          { drug: 'Phenylephrin (reiner Alpha-1-Agonist)', dose: '50–100 µg i.v. Boli', route: 'i.v.', maxDose: 'Reflexbradykardie beachten', limits: 'Günstig bei Tachyarrhythmie' },
          { drug: 'Volumenbelastung (Vorlastsicherung)', dose: 'Vollelektrolytlösung 250–500 ml Boli', route: 'i.v.', maxDose: 'Hypovolämie führt sofort zum Kreislaufzusammenbruch', limits: 'Starrer hypertrophierter Ventrikel braucht Füllungsdruck' }
        ],
        koPitfalls: [
          { mistake: 'Durchführung einer Spinalanästhesie (SPA)', whyFatal: 'Die akute Sympathikolyse führt zum SVR-Kollaps. Da das Schlagvolumen über der fixierten Stenose nicht steigen kann, bricht die Koronarperfusion zusammen -> Asystolie!', correctAction: 'Spinalanästhesie ist absolut KONTRAINDIZIERT. Schonende Allgemeinanästhesie mit Etomidat/Sufentanil oder vorsichtige, langsam aufdosierte Epiduralanästhesie.' },
          { mistake: 'Tolerieren von Tachykardie (> 90/min)', whyFatal: 'Verkürzt die Diastolendauer drastisch und erzeugt tödliche Myokardischämie des hypertrophierten linken Ventrikels.', correctAction: 'Sinusrhythmus strikt bei 60–80/min halten. Tachyarrhythmie sofort kardiovertieren.' }
        ]
      };
    }

    // Anaphylaxie & Schock
    if (text.includes('anaphylaxie') || text.includes('allergie') || text.includes('bronchospasmus')) {
      return {
        topic: 'Perioperative Anaphylaxie',
        topic_tr: 'Perioperatif Anafilaksi ve Şok',
        firstDrugTR: 'Adrenalin (0,5 mg i.m. veya 10-50 µg i.v. titre)',
        guideline: {
          title: 'S2k-Leitlinie Akuttherapie und Management anaphylaktischer Reaktionen',
          society: 'DGAI / BDA / DGAKI / AWMF',
          awmf: 'AWMF-Registernummer 061-025',
          year: '2023',
          recommendation: 'Sofortiges Absetzen aller verdächtigen Substanzen, 100% O2, Adrenalin als Medikament der 1. Wahl, massive Volumentherapie mit kristalloiden Lösungen.',
          recommendation_tr: 'Tüm şüpheli ajanların derhal kesilmesi, %100 O2, ilk tercih olarak derhal Adrenalin, kristalloid solüsyonlarla agresif volüm replasmanı.'
        },
        dosages: [
          { drug: 'Adrenalin i.m. (Grad II–III, Spontanatmung)', dose: '0,5 mg i.m. (ungestreckt 1:1000)', route: 'i.m. M. vastus lat.', maxDose: 'Wiederholung alle 5–10 min bei Persistenz', limits: 'Schnellste Resorption und sicherster Weg' },
          { drug: 'Adrenalin i.v. titriert (Narkose / Kreislaufkollaps)', dose: '10–50 µg i.v. Boli (1:10.000 oder 1:100.000 verdünnt)', route: 'i.v.', maxDose: 'Perfusor 0,05–0,5 µg/kg/min nach Ansprechen', limits: 'Nur verdünnt titrieren bei liegendem Monitoring' },
          { drug: 'Kristalloide Infusion', dose: 'Vollelektrolytlösung 1000–2000 ml Druckinfusion', route: 'i.v.', maxDose: 'Bis zu 30–50 ml/kg in der ersten Stunde', limits: 'Kompensiert kapilläres Leck & Vasodilatation' },
          { drug: 'Zweitlinien-Therapie (erst nach Adrenalin)', dose: 'Dimetinden 0,1 mg/kg + Prednisolon 250–500 mg i.v.', route: 'i.v.', maxDose: 'Wirkeintritt erst nach 20–30 min', limits: 'Verzögern Sie NIEMALS die Adrenalingabe dafür!' }
        ],
        koPitfalls: [
          { mistake: 'Zuwarten mit Adrenalin und primäre Gabe von Kortison oder Antihistaminika', whyFatal: 'Kortikoide und Antihistaminika stoppen den akuten Kreislaufkollaps und Bronchospasmus NICHT! Der Patient stirbt im Asphyxie-Schock.', correctAction: 'Adrenalin ist das EINZIGE lebensrettende Kausaltherapeutikum und MUSS sofort gegeben werden.' }
        ]
      };
    }

    // Sepsis & Septischer Schock
    if (text.includes('sepsis') || text.includes('septisch')) {
      return {
        topic: 'Sepsis & Septischer Schock',
        topic_tr: 'Sepsis & Septik Şok',
        firstDrugTR: 'Noradrenalin (0,05-0,5 µg/kg/dk titre)',
        guideline: {
          title: 'S3-Leitlinie Sepsis - Prävention, Diagnose, Therapie und Nachsorge',
          society: 'DGAI / DIVI / DSG / AWMF',
          awmf: 'AWMF-Registernummer 079-001',
          year: '2023',
          recommendation: 'Surviving Sepsis 1-Hour-Bundle: Blutkulturen VOR Antibiose, kalkulierte Breitspektrumantibiose innerhalb 60 min, 30 ml/kg Kristalloide, Noradrenalin Ziel-MAP ≥ 65 mmHg, Laktat-Clearance.',
          recommendation_tr: 'Surviving Sepsis 1 Saat Paketi: Antibiyotikten ÖNCE kan kültürü, 60 dk içinde geniş spektrumlu antibiyotik, 30 ml/kg kristalloid, hedef MAP ≥ 65 mmHg için Noradrenalin, laktat klirensi.'
        },
        dosages: [
          { drug: 'Noradrenalin (Vasopressor 1. Wahl)', dose: '0,05–0,5 µg/kg/min titriert', route: 'i.v. (ZVK / Perfusor)', maxDose: 'Ziel-MAP ≥ 65 mmHg (bei chronischer Hypertonie 70–75 mmHg)', limits: 'Frühzeitig parallel zur Volumengabe starten' },
          { drug: 'Vasopressin (Argipressin / Second-Line)', dose: '0,03 IE/min fixer Perfusor', route: 'i.v.', maxDose: 'Keine Dosissteigerung > 0,04 IE/min', limits: 'Additiv bei hohem Noradrenalin-Bedarf' },
          { drug: 'Kristalloide Flüssigkeitstherapie', dose: '30 ml/kg balancierte Vollelektrolyte in 3h', route: 'i.v.', maxDose: 'Dynamische Parameter (SVV/PPV) zur Steuerung nutzen', limits: 'Überwässerung und Lungenödem vermeiden' }
        ],
        koPitfalls: [
          { mistake: 'Verzögerung der kalkulierten Antibiose (> 1 Stunde nach Diagnosestellung)', whyFatal: 'Jede Stunde Verzögerung erhöht die Letalität im septischen Schock um bis zu 7%!', correctAction: 'Breitspektrum-Antibiotikum innerhalb von 60 Minuten infundieren (nach zügiger Blutkulturentnahme).' }
        ]
      };
    }

    // Postpartale Blutung (PPH) & Geburtshilfe
    if (text.includes('pph') || text.includes('postpartal') || text.includes('blutung') && text.includes('uterus') || text.includes('sectio')) {
      return {
        topic: 'Peripartale Blutungen (PPH) & Notsectio',
        topic_tr: 'Peripartum Kanamalar (PPH) & Acil Sezaryen',
        firstDrugTR: 'Oksitosin (3-5 IU yavaş i.v. 2 dakikada) + Traneksamik Asit (1 g i.v.)',
        guideline: {
          title: 'S2k-Leitlinie Peripartale Blutungen (Diagnostik und Therapie)',
          society: 'DGAI / DGGG / OEGGG / SGGG',
          awmf: 'AWMF-Registernummer 015-063',
          year: '2023',
          recommendation: 'Stufenweises Vorgehen (4T: Tonus, Trauma, Tissue, Thrombin). Uterotonika, Tranexamsäure frühzeitig, Fibrinogen Ziel ≥ 2 g/l, Bakri-Ballon / chirurgische Kompression.',
          recommendation_tr: 'Basamaklı yaklaşım (4T: Tonus, Travma, Doku, Trombin). Uterotonikler, erken Traneksamik asit, hedef Fibrinojen ≥ 2 g/l, Bakri balonu / cerrahi kompresyon.'
        },
        dosages: [
          { drug: 'Oxytocin (Syntocinon)', dose: '3–5 IE langsam i.v. über 1–2 min, dann Perfusor 10–20 IE in 500 ml', route: 'i.v.', maxDose: 'KEIN schneller Bolus (Hypotonie & Tachykardie!)', limits: '1. Wahl bei Uterusatonie' },
          { drug: 'Sulproston (Nalador / Prostaglandin E2)', dose: '500 µg in 500 ml NaCl (initial 100–500 µg/h)', route: 'i.v. Perfusor', maxDose: 'Max. 500 µg in 4 Stunden / 1500 µg in 24h', limits: 'Kontraindikation: schweres Asthma bronchiale!' },
          { drug: 'Tranexamsäure (TXA)', dose: '1 g i.v. Kurzinfusion (100 ml über 10 min)', route: 'i.v.', maxDose: 'Wiederholung von 1 g nach 30 min bei fortbestehender Blutung', limits: 'Gabe MUSS innerhalb von 3 Stunden nach Geburt erfolgen' },
          { drug: 'Fibrinogen-Konzentrat', dose: '2–4 g i.v. nach ROTEM (FIBTEM A10 < 10 mm)', route: 'i.v.', maxDose: 'Zielwert Fibrinogen ≥ 2 g/l (200 mg/dl)', limits: 'Fibrinogen ist der erste verbrauchte Gerinnungsfaktor bei PPH' }
        ],
        koPitfalls: [
          { mistake: 'Verabreichung von Oxytocin als unverdünnter schneller i.v.-Bolus', whyFatal: 'Löst akuten systemischen Gefäßwiderstandsabfall mit schwerer Hypotonie, Koronarspasmen und Kreislaufstillstand aus!', correctAction: 'Oxytocin streng fraktioniert und langsam über 2 Minuten i.v. verabreichen.' },
          { mistake: 'Vergessen der 15–30° Linksseitenkippung bei Schwangeren', whyFatal: 'Aortokavales Kompressionssyndrom mit drastischem Abfall des venösen Rückstroms und fetaler Asphyxie.', correctAction: 'Obligate Linksseitenlagerung des Beckens / Keilkissen bis zur Kindsentwicklung.' }
        ]
      };
    }

    // Default High-Yield Emergency Fallback
    return {
      topic: q.category || 'Anästhesiologisches Notfallmanagement',
      topic_tr: 'Anesteziyolojik Acil Durum Yönetimi',
      firstDrugTR: 'Adrenalin (10-50 µg i.v. titre / CPR için 1 mg)',
      guideline: {
        title: 'DGAI / BDA Empfehlungen & S3-Leitlinien Standards',
        society: 'Deutsche Gesellschaft für Anästhesiologie und Intensivmedizin (DGAI)',
        awmf: 'AWMF Leitlinienportal Anästhesie & Intensivmedizin',
        year: '2023',
        recommendation: 'Strukturierte Priorisierung nach dem ABCDE-Schema, Patientensicherheit vor Detailwissen, evidenzbasierte DGAI-Algorithmen.',
        recommendation_tr: 'ABCDE şemasına göre yapılandırılmış önceliklendirme, detay bilgiden önce hasta güvenliği ve kanıta dayalı DGAI algoritmaları.'
      },
      dosages: [
        { drug: 'Adrenalin (Notfall-Rescue)', dose: '10–50 µg i.v. titriert / 1 mg bei ALS-CPR', route: 'i.v. / i.o.', maxDose: 'Ziel-MAP ≥ 65 mmHg', limits: 'Titration nach Wirkung' },
        { drug: 'Atropin (Symptomatische Bradykardie)', dose: '0,5 mg i.v. Bolus', route: 'i.v.', maxDose: 'Wiederholung bis max. 3 mg', limits: 'Paradoxer Effekt bei Dosis < 0,5 mg' },
        { drug: 'Kristalloide Infusion', dose: 'Vollelektrolytlösung 500–1000 ml Bolus', route: 'i.v.', maxDose: 'Normovolämie sichern', limits: 'Balancierte Lösungen bevorzugen' }
      ],
      koPitfalls: [
        { mistake: 'Unstrukturiertes Agieren ohne ABCDE-Priorisierung bei vitaler Gefährdung', whyFatal: 'Führt zum Übersehen lebensbedrohlicher Basiskomplikationen (Hypoxie, Spannungspneu, Verblutung).', correctAction: 'Immer laut und klar: "Ich arbeite strikt nach ABCDE. Punkt A ist gesichert..."' },
        { mistake: 'Unterlassen von Hilfeanforderung (Team-Kommunikation)', whyFatal: 'Überlastung in kritischen Notfallsituationen ist einer der häufigsten Durchfallgründe in der ÄKNO.', correctAction: 'Sofortige Ansage: "Ich rufe den Oberarzt hinzu und weise die Pflege im Closed-Loop an."' }
      ]
    };
  }

  function getMedicalGroundTruth(q) {
    const res = _computeMedicalGroundTruth(q);
    if (!res) return null;
    if (res.dosages && Array.isArray(res.dosages)) {
      res.dosages = res.dosages.map(d => ({
        ...d,
        limit: d.maxDose || d.limit || 'Gemäß Klinik-SOP',
        maxDose: d.maxDose || d.limit || 'Gemäß Klinik-SOP',
        note: d.limits || d.note || (d.route ? `Applikation: ${d.route}` : 'Strikte Leitlinienüberwachung'),
        limits: d.limits || d.note || (d.route ? `Applikation: ${d.route}` : 'Strikte Leitlinienüberwachung')
      }));
    }
    if (res.guideline) {
      res.guideline.org = res.guideline.society || res.guideline.org || 'DGAI / BDA';
      res.guideline.society = res.guideline.society || res.guideline.org || 'DGAI / BDA';
      res.guideline.coreStatement = res.guideline.recommendation || res.guideline.coreStatement || '';
      res.guideline.recommendation = res.guideline.recommendation || res.guideline.coreStatement || '';
      res.guideline.recommendation_tr = res.guideline.recommendation_tr || res.guideline.recommendation;
    }
    return res;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. VORAB-WISSEN (30-SEKUNDEN-SPICKZETTEL) ENGINE
  // ─────────────────────────────────────────────────────────────────────────────
  function get30SecondSpickzettel(q) {
    const gt = getMedicalGroundTruth(q);
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.answer_de || '')).toLowerCase();

    const topicDE = gt.topic;
    const topicTR = gt.topic_tr || gt.topic;

    const recDE = (gt.guideline.recommendation || '').split('.')[0] + '.';
    const recTR = (gt.guideline.recommendation_tr || gt.guideline.recommendation || '').split('.')[0] + '.';

    const drugDE = `${gt.dosages[0].drug} (${gt.dosages[0].dose})`;
    const drugTR = gt.firstDrugTR || drugDE;

    let summaryDE = `Kompakter Leitfaden für die ÄKNO-Prüfung zu **${topicDE}**:\n` +
      `• **Pathophysiologischer Kern:** ${recDE}\n` +
      `• **Prüfer-Fokus:** Konsequente Priorisierung, exakte Dosierungen und Ausschluss von Kontraindikationen.\n` +
      `• **Wichtigstes Medikament:** ${drugDE}.`;

    let summaryTR = `**${topicTR}** için 30 saniyelik pratik özet:\n` +
      `• **Patofizyolojik Odak:** ${recTR}\n` +
      `• **Jüri Beklentisi:** Kararlı önceliklendirme, hatasız miligram/mikrogram dozları ve K.O. tuzaklarından kaçınma.\n` +
      `• **Kritik İlk İlaç:** ${drugTR}.`;

    let stepsDE = [
      `1. Sofortige Problemerkennung & Hilfe rufen (Team-Alarm)`,
      `2. Kausale Erstmaßnahme: ${drugDE}`,
      `3. Vitalparameter stabilisieren (Ziel-MAP ≥ 65, SpO2 > 94%)`,
      `4. Postoperative Weiterversorgung auf Intensivstation organisieren`
    ];

    let stepsTR = [
      `1. Sorunun anında tanınması & Kıdemli/Ekip yardımı çağırma`,
      `2. Nedene yönelik ilk müdahale: ${drugTR}`,
      `3. Yaşamsal bulguları stabilize etme (Hedef MAP ≥ 65, SpO2 > 94%)`,
      `4. Yoğun bakımda postoperatif takip ve yatış planlama`
    ];

    return {
      topic: topicDE,
      topic_tr: topicTR,
      summaryDE,
      summaryTR,
      stepsDE,
      stepsTR,
      guideline: gt.guideline.title,
      dosages: gt.dosages,
      toString: function() {
        const cleanSummaryDE = (this.summaryDE || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const cleanSummaryTR = (this.summaryTR || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const stepsHtml = (this.stepsDE || []).map((s, idx) => {
          const trNote = (this.stepsTR && this.stepsTR[idx]) ? `<span style="color: var(--text-muted); font-size: 0.8rem;"> — ${this.stepsTR[idx]}</span>` : '';
          return `<li style="margin-bottom: 0.35rem;"><strong>${s}</strong>${trNote}</li>`;
        }).join('');

        return `
          <div class="spickzettel-body-inner">
            <div style="margin-bottom: 0.4rem; font-weight: 700; color: #0284c7; font-size: 0.95rem;">
              📌 ${this.topic}
            </div>
            <div style="font-size: 0.8rem; background: rgba(2, 132, 199, 0.08); padding: 0.35rem 0.6rem; border-radius: 4px; margin-bottom: 0.65rem; color: #0369a1; border-left: 3px solid #0284c7;">
              📘 <strong>DGAI-Leitlinie:</strong> ${this.guideline}
            </div>
            <div style="margin-bottom: 0.65rem;">
              <div style="font-weight: 700; font-size: 0.84rem; color: #1e293b; margin-bottom: 0.25rem;">🇩🇪 30-Sekunden-Leitfaden (DE):</div>
              <div style="font-size: 0.85rem; line-height: 1.5; white-space: pre-line; color: var(--text-primary);">${cleanSummaryDE}</div>
            </div>
            <div style="margin-bottom: 0.65rem; background: rgba(14, 165, 233, 0.05); padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid #0ea5e9;">
              <div style="font-weight: 700; font-size: 0.82rem; color: #0369a1; margin-bottom: 0.25rem;">🇹🇷 Hızlı Klinik Özet (TR):</div>
              <div style="font-size: 0.83rem; line-height: 1.45; white-space: pre-line; color: var(--text-secondary);">${cleanSummaryTR}</div>
            </div>
            <div style="border-top: 1px dashed var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem;">
              <div style="font-weight: 700; font-size: 0.84rem; color: #d97706; margin-bottom: 0.35rem;">⚡ 4-Schritte-Notfall-Algorithmus:</div>
              <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.83rem; line-height: 1.45; color: var(--text-primary);">
                ${stepsHtml}
              </ol>
            </div>
          </div>
        `;
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DÜSSELDORFER REDEFLUSS-BAUKASTEN (4-PHASE SPOKEN GERMAN TEMPLATES)
  // ─────────────────────────────────────────────────────────────────────────────
  function getRedeflussBaukasten(q) {
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '')).toLowerCase();

    const s1de = 'Zusammenfassend handelt es sich um einen Risikopatienten mit akutem Handlungsbedarf. Mein primäres anästhesiologisches Ziel ist die lückenlose Sicherung der Vitalfunktionen und ein strukturiertes Vorgehen nach DGAI-Leitlinien.';
    const s1tr = 'Özetle, acil müdahale gerektiren yüksek riskli bir hasta ile karşı karşıyayız. Birincil anesteziyolojik hedefim vital fonksiyonların eksiksiz korunması ve DGAI kılavuzlarına göre yapılandırılmış bir yaklaşım sergilemektir.';

    const s2de = 'Bei der systematischen Inspektion des Monitors fällt unmittelbar die hämodynamische und respiratorische Dekompensation auf. Die Blutgasanalyse zeigt eine interventionsbedürftige Störung, die ich sofort gezielt korrigiere.';
    const s2tr = 'Monitörün sistematik incelemesinde hemodinamik ve solunumsal dekompansasyon hemen göze çarpmaktadır. Kan gazı analizi, derhal hedefe yönelik düzeltmem gereken acil bir tabloyu doğrulamaktadır.';

    const s3de = 'Angesichts der akuten Gefährdung arbeite ich strikt nach dem ABCDE-Schema. Ich rufe sofort den Oberarzt als Back-up, kommuniziere im Team mit Closed-Loop-Briefing und leite ohne Verzögerung die kausale Medikation ein.';
    const s3tr = 'Akut hayati tehlike karşısında kesinlikle ABCDE algoritmasına göre hareket ediyorum. Derhal kıdemli/uzman desteği çağırıyor, ekiple kapalı devre iletişim kuruyor ve nedensel ilaç tedavisini gecikmeksizin başlatıyorum.';

    const s4de = 'Nach erfolgreicher Stabilisierung übergebe ich den Patienten strukturiert nach dem SBAR-Schema an die anästhesiologische Intensivstation zur engmaschigen invasiven Nachüberwachung.';
    const s4tr = 'Hasta başarıyla stabilize edildikten sonra, yakın invaziv takip ve ileri tedavi için SBAR şablonuna göre yapılandırılmış şekilde anestezi yoğun bakım ünitesine devrediyorum.';

    return {
      step1: {
        title: 'Schritt 1: Patientenvorstellung & Strategie',
        de: s1de,
        tr: s1tr,
        textDE: s1de,
        textTR: s1tr
      },
      step2: {
        title: 'Schritt 2: Vitalparameter & BGA-Interpretation',
        de: s2de,
        tr: s2tr,
        textDE: s2de,
        textTR: s2tr
      },
      step3: {
        title: 'Schritt 3: Sofortige Notfallintervention (ABCDE)',
        de: s3de,
        tr: s3tr,
        textDE: s3de,
        textTR: s3tr
      },
      step4: {
        title: 'Schritt 4: Zusammenfassung & Weiterversorgung',
        de: s4de,
        tr: s4tr,
        textDE: s4de,
        textTR: s4tr
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. BGA-TRAINER MINI-TOOL CASUISTICS (4-STUFEN-BGA-SYSTEMATIK)
  // ─────────────────────────────────────────────────────────────────────────────
  const BGA_TRAINING_CASES = [
    {
      id: 'bga_01',
      title: 'Septischer Schock & Schwere Laktatazidose',
      title_tr: 'Septik Şok & Ağır Laktik Asidoz',
      patient: '68-jährige Patientin nach perforierter Sigmadivertikulitis, katecholaminpflichtig (Noradrenalin 0,3 µg/kg/min), Vigilanzminderung und Tachypnoe auf Intensivstation.',
      patient_tr: 'Perfore sigmoid divertikülit sonrası 68 yaşında kadın hasta, katekolamin ihtiyacı olan (Noradrenalin 0,3 µg/kg/dk), bilinç bulanıklığı ve taşipne ile yoğun bakımda.',
      vitals: {
        ph: '7,18',
        pco2: '28 mmHg',
        po2: '64 mmHg',
        hco3: '11 mmol/l',
        be: '-14 mmol/l',
        lactate: '7,4 mmol/l',
        na: '136 mmol/l',
        k: '5,2 mmol/l',
        cl: '101 mmol/l',
        hb: '8,4 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Hypoxämie unter 4 l O2 (PaO2 64 mmHg). Horovitz-Index erniedrigt (~170 mmHg) -> Lungenbeteiligung / beginnendes ARDS.',
        step2_acidBase: 'Schwere Azidämie (pH 7,18 < 7,35).',
        step3_compensation: 'Primär metabolische Azidose (HCO3 11 mmol/l, BE -14) mit partiell respiratorischer Kompensation (pCO2 auf 28 mmHg abgeatmet).',
        step4_anionGap: 'Anionenlücke: AG = 136 - (101 + 11) = 24 mmol/l (erhöht, > 12). Ursache: Schwere Hyperlaktatämie (7,4 mmol/l) bei Gewebehypoperfusion im septischen Schock.'
      },
      clinicalAction: 'Fokussanierung, Noradrenalin Ziel-MAP ≥ 65, 30 ml/kg Kristalloide, kalkulierte Breitspektrum-Antibiose innerhalb 1 Stunde.'
    },
    {
      id: 'bga_02',
      title: 'Schwere COPD-Exazerbation & Respiratorische Globalinsuffizienz',
      title_tr: 'Ağır KOAH Alevlenmesi & Respiratuar Global Yetmezlik',
      patient: '72-jähriger Patient mit bekannter schwerer COPD (GOLD IV), zunehmender Somnolenz und paradoxer Atembewegung im Notaufnahme-Schockraum.',
      patient_tr: 'Bilinen ağır KOAH (GOLD IV) öyküsü olan 72 yaşında erkek hasta, acil servis şok odasında artan somnolans ve paradoks solunum.',
      vitals: {
        ph: '7,24',
        pco2: '72 mmHg',
        po2: '54 mmHg',
        hco3: '31 mmol/l',
        be: '+6 mmol/l',
        lactate: '1,4 mmol/l',
        na: '139 mmol/l',
        k: '4,1 mmol/l',
        cl: '98 mmol/l',
        hb: '15,6 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Schwere arterielle Hypoxämie (PaO2 54 mmHg).',
        step2_acidBase: 'Relevante Azidämie (pH 7,24).',
        step3_compensation: 'Akut auf chronische respiratorische Azidose. Chronische renale Vorkompensation (HCO3 31 mmol/l, BE +6), akut dekompensiert durch CO2-Retention (pCO2 72 mmHg).',
        step4_anionGap: 'Normale Anionenlücke, normales Laktat (1,4). Reine Ventilationsstörung (Erschöpfung der Atempumpe).'
      },
      clinicalAction: 'Sofortige Nicht-invasive Beatmung (NIV) mit PEEP 4–5 und PS 8–12 cmH2O. Keine unkontrollierte Hyperoxie! Intubationsbereitschaft bei Vigilanzminderung.'
    },
    {
      id: 'bga_03',
      title: 'Schwere Diabetische Ketoazidose (DKA)',
      title_tr: 'Ağır Diyabetik Ketoasidoz (DKA)',
      patient: '24-jährige Patientin mit Diabetes mellitus Typ 1, akuter Kussmaul-Atmung, Dehydratation und Verwirrtheitszustand.',
      patient_tr: 'Tip 1 diyabetli 24 yaşında kadın hasta, akut Kussmaul solunumu, dehidratasyon ve konfüzyon tablosunda.',
      vitals: {
        ph: '7,08',
        pco2: '18 mmHg',
        po2: '98 mmHg',
        hco3: '6 mmol/l',
        be: '-21 mmol/l',
        lactate: '2,1 mmol/l',
        na: '132 mmol/l',
        k: '5,8 mmol/l',
        cl: '96 mmol/l',
        glucose: '480 mg/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'O2-Partialdruck normwertig (PaO2 98 mmHg unter Raumluft).',
        step2_acidBase: 'Lebensbedrohliche Azidämie (pH 7,08).',
        step3_compensation: 'Schwerste metabolische Azidose (HCO3 6 mmol/l) mit maximaler respiratorischer Kussmaul-Kompensation (pCO2 auf 18 mmHg hyperventiliert).',
        step4_anionGap: 'Massiv erhöhte Anionenlücke: AG = 132 - (96 + 6) = 30 mmol/l. Ursache: Ketonkörper (Beta-Hydroxybutyrat & Acetoacetat).'
      },
      clinicalAction: 'Flüssigkeitssubstitution (NaCl 0,9% / Vollelektrolyt), Normalinsulin 0,1 IE/kg/h i.v. Perfusor (erst wenn Kalium > 3,5 mmol/l!), engmaschige Kaliumkontrolle.'
    },
    {
      id: 'bga_04',
      title: 'TUR-Syndrom mit Verdünnungshyponatriämie',
      title_tr: 'Seyrelme Hiponatremisi ile TUR Sendromu',
      patient: '76-jähriger Patient nach transurethraler Prostataresektion (TUR-P), akut bradykard, verwirrt und klagt über Sehstörungen und Kopfschmerzen.',
      patient_tr: 'Transüretral prostat rezeksiyonu (TUR-P) sonrası 76 yaşında erkek hasta, akut bradikardik, konfüze, görme bozukluğu ve baş ağrısı tarifliyor.',
      vitals: {
        ph: '7,32',
        pco2: '36 mmHg',
        po2: '82 mmHg',
        hco3: '19 mmol/l',
        be: '-5 mmol/l',
        lactate: '2,0 mmol/l',
        na: '112 mmol/l',
        k: '3,2 mmol/l',
        cl: '84 mmol/l',
        hb: '8,1 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Mäßige Oxygenierungsstörung (PaO2 82 mmHg), Gefahr des Lungenödems durch Hypervolämie.',
        step2_acidBase: 'Leichte Azidämie (pH 7,32).',
        step3_compensation: 'Leichte Verdünnungsazidose (Dilutionsazidose).',
        step4_anionGap: 'Akute schwere Hyponatriämie (Na 112 mmol/l) und Hämoglobinsturz durch massive intravasale Resorption elektrolytfreier Spülflüssigkeit (Glycin/Sorbitol).'
      },
      clinicalAction: 'OP sofort stoppen! Furosemid 20–40 mg i.v., bei neurologischen Symptomen/Krämpfen hypertones Kochsalz NaCl 3% (100 ml über 10–15 min). Maximaler Na-Anstieg: 8–10 mmol/l in 24h zur Vermeidung einer pontinen Myelinolyse!'
    }
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. MEDIZINRECHT & AUFKLÄRUNG (NRW LEGAL CHECKPOINTS)
  // ─────────────────────────────────────────────────────────────────────────────
  function _computeLegalCheckpoint(q) {
    if (!q) return null;
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.answer_de || '') + ' ' + (q.category || '')).toLowerCase();

    if (text.includes('zeugen jehova') || (text.includes('transfusion') && text.includes('ablehn'))) {
      return {
        title: 'Zeugen Jehovas & Ablehnung von Blutprodukten',
        topic: 'Zeugen Jehovas & Ablehnung von Blutprodukten',
        scenario: 'Der Patient verweigert schriftlich die Gabe allogener Bluttransfusionen.',
        rule: 'Das Selbstbestimmungsrecht des einwilligungsfähigen Patienten steht über der ärztlichen Lebensrettungspflicht (Art. 2 Abs. 1 GG). Eine schriftliche, spezifische Ablehnung ist rechtlich bindend. Bei Verstoß droht dem Arzt Strafbarkeit wegen Körperverletzung (§ 223 StGB)!',
        ruleDE: 'Das Selbstbestimmungsrecht des einwilligungsfähigen Patienten steht über der ärztlichen Lebensrettungspflicht (Art. 2 Abs. 1 GG). Eine schriftliche, spezifische Ablehnung ist rechtlich bindend. Bei Verstoß droht dem Arzt Strafbarkeit wegen Körperverletzung (§ 223 StGB)!',
        ruleTR: 'Temyiz kudretine sahip hastanın kendi kaderini tayin hakkı hekimin hayat kurtarma görevinin önündedir (Art. 2 GG). Yazılı ve spesifik kan reddi beyanı hukuken bağlayıcıdır. İhlali halinde hekime müessir fiil davası açılır (§ 223 StGB)!',
        guideline: 'DGAI Patient Blood Management, Cell Saver, Tranexamsäure, permissiver Hämatokrit.',
        paragraph: 'Art. 2 Abs. 1 GG · § 223 StGB'
      };
    }

    if (text.includes('notsectio') || text.includes('eez') || text.includes('eilige sectio')) {
      return {
        title: 'Aufklärung bei Notsectio (EEZ ≤ 20 min)',
        topic: 'Aufklärung bei Notsectio (EEZ ≤ 20 min)',
        scenario: 'Akute fetale Bradykardie, Notsectio-Alarm im Kreißsaal.',
        rule: 'Bei vitaler Bedrohung von Mutter oder Kind entfällt eine ausführliche schriftliche Aufklärung zugunsten des mutmaßlichen Willens (§ 630d Abs. 1 BGB - Notfallindikation). Dokumentation erfolgt unverzüglich postoperativ.',
        ruleDE: 'Bei vitaler Bedrohung von Mutter oder Kind entfällt eine ausführliche schriftliche Aufklärung zugunsten des mutmaßlichen Willens (§ 630d Abs. 1 BGB - Notfallindikation). Dokumentation erfolgt unverzüglich postoperativ.',
        ruleTR: 'Anne veya bebek için hayati tehlike anında acil durum karinesi (§ 630d BGB) geçerlidir; ayrıntılı yazılı aydınlatma operasyonu geciktirmemelidir. Aydınlatma ve gerekçe operasyon sonrasında hemen belgelenir.',
        guideline: 'S2k Notsectio DGAI / DGGG: EEZ (Entscheidungs-Entbindungs-Zeit) maximal 20 Minuten.',
        paragraph: '§ 630d Abs. 1 BGB (Notfallindikation)'
      };
    }

    if (text.includes('patientenverfügung') || text.includes('therapiebegrenz') || text.includes('palliativ')) {
      return {
        title: 'Patientenverfügung & Vorsorgevollmacht (§ 1827 / § 1901a BGB)',
        topic: 'Patientenverfügung & Vorsorgevollmacht (§ 1827 / § 1901a BGB)',
        scenario: 'Schwerstkranker Intensivpatient mit schriftlicher Patientenverfügung zum Verzicht auf Reanimation und Beatmung.',
        rule: 'Eine schriftliche Patientenverfügung entfaltet unmittelbare Verbindlichkeit, wenn sie auf die aktuelle Lebens- und Behandlungssituation zutrifft (§ 1827 BGB, früher § 1901a BGB). Ein Betreuungsgericht muss bei Konsens zwischen Bevollmächtigtem und Arzt NICHT eingeschaltet werden.',
        ruleDE: 'Eine schriftliche Patientenverfügung entfaltet unmittelbare Verbindlichkeit, wenn sie auf die aktuelle Lebens- und Behandlungssituation zutrifft (§ 1827 BGB, früher § 1901a BGB). Ein Betreuungsgericht muss bei Konsens zwischen Bevollmächtigtem und Arzt NICHT eingeschaltet werden.',
        ruleTR: 'Yazılı hasta vasiyeti, mevcut klinik duruma uyuyorsa bağlayıcıdır (§ 1827 BGB, eski § 1901a BGB). Hekim ile vekil arasında tedavi sınırlandırması konusunda fikir birliği varsa vesayet mahkemesi iznine gerek yoktur.',
        guideline: 'Grundsätze der Bundesärztekammer zur ärztlichen Sterbebegleitung & DGAI Ethikkommission.',
        paragraph: '§ 1827 BGB (ehem. § 1901a) & § 1828 BGB'
      };
    }

    if (text.includes('delir') || text.includes('fixier') || text.includes('unruhe')) {
      return {
        title: 'Fixierung & Unterbringungsrecht in NRW (§ 1831 BGB / PsychKG NRW)',
        topic: 'Fixierung & Unterbringungsrecht in NRW (§ 1831 BGB / PsychKG NRW)',
        scenario: 'Akut delirianter, fremdgefährdender Patient zieht an Kathetern und Tubus.',
        rule: 'Jede mechanische Fixierung (> 30 Minuten) stellt eine freiheitsentziehende Maßnahme dar und bedarf einer richterlichen Genehmigung (§ 1831 Abs. 4 BGB, ehemals § 1906 BGB / PsychKG NRW). Im akuten Notfall ist eine vorläufige Fixierung durch den Arzt zulässig, der richterliche Beschluss muss unverzüglich nachgefordert werden.',
        ruleDE: 'Jede mechanische Fixierung (> 30 Minuten) stellt eine freiheitsentziehende Maßnahme dar und bedarf einer richterlichen Genehmigung (§ 1831 Abs. 4 BGB, ehemals § 1906 BGB / PsychKG NRW). Im akuten Notfall ist eine vorläufige Fixierung durch den Arzt zulässig, der richterliche Beschluss muss unverzüglich nachgefordert werden.',
        ruleTR: 'Mekanik tespit/bağlama (> 30 dakika) hürriyeti kısıtlayıcı önlemdir ve hakim onayı gerektirir (§ 1831 BGB / PsychKG NRW). Acil durumda hekim geçici tespit kararı verebilir, ancak mahkeme onayı ivedilikle talep edilmelidir.',
        guideline: 'S3-Leitlinie Analgesie, Sedierung und Delirmanagement (DAS).',
        paragraph: '§ 1831 BGB (ehem. § 1906) & PsychKG NRW'
      };
    }

    if (text.includes('hirntod') || text.includes('organspende') || text.includes('transplantationsgesetz') || text.includes('iha')) {
      return {
        title: 'Irreversibler Hirnfunktionsausfall (IHA) & Organspende (TPG)',
        topic: 'Irreversibler Hirnfunktionsausfall (IHA) & Organspende (TPG)',
        scenario: 'Feststellung des Hirntodes bei potenziellem Organspender auf der Intensivstation.',
        rule: 'Diagnostik des IHA nach Richtlinie der Bundesärztekammer durch zwei unabhängige, erfahrene Fachärzte (mind. ein Neurologe/Neurochirurg). Bei Organspende gilt in Deutschland die erweiterte Entscheidungslösung (§ 3 TPG, schriftliche Einwilligung oder mutmaßlicher Wille der Angehörigen).',
        ruleDE: 'Diagnostik des IHA nach Richtlinie der Bundesärztekammer durch zwei unabhängige, erfahrene Fachärzte (mind. ein Neurologe/Neurochirurg). Bei Organspende gilt in Deutschland die erweiterte Entscheidungslösung (§ 3 TPG, schriftliche Einwilligung oder mutmaßlicher Wille der Angehörigen).',
        ruleTR: 'BÄK yönergesine göre beyin ölümü tespiti iki bağımsız uzman hekim tarafından yapılır (en az biri nörolog/beyin cerrahı). Almanya\'da genişletilmiş rıza modeli (§ 3 TPG) geçerlidir: Organ bağışı için hastanın yazılı rızası veya yakınlarının beyan ettiği muhtemel irade şarttır.',
        guideline: 'Richtlinie der Bundesärztekammer zur Feststellung des IHA & Transplantationsgesetz (TPG).',
        paragraph: '§ 3 TPG · BÄK-Richtlinie IHA'
      };
    }

    if (text.includes('schweigepflicht') || text.includes('§ 203') || text.includes('polizei')) {
      return {
        title: 'Ärztliche Schweigepflicht & Offenbarungsbefugnis (§ 203 StGB)',
        topic: 'Ärztliche Schweigepflicht & Offenbarungsbefugnis (§ 203 StGB)',
        scenario: 'Polizeiliche Ermittler verlangen auf der Intensivstation Auskunft oder Blutproben eines intoxikierten Patienten.',
        rule: 'Die ärztliche Schweigepflicht (§ 203 StGB) gilt ausnahmslos gegenüber jedermann, einschließlich der Polizei. Auskunftserteilung ist nur bei Patienteneinwilligung, richterlichem Beschluss oder rechtfertigendem Notstand (§ 34 StGB zur Abwendung schwerer Straftaten) erlaubt!',
        ruleDE: 'Die ärztliche Schweigepflicht (§ 203 StGB) gilt ausnahmslos gegenüber jedermann, einschließlich der Polizei. Auskunftserteilung ist nur bei Patienteneinwilligung, richterlichem Beschluss oder rechtfertigendem Notstand (§ 34 StGB zur Abwendung schwerer Straftaten) erlaubt!',
        ruleTR: 'Hekim sır saklama yükümlülüğü (§ 203 StGB) istisnasız herkese, polise karşı da geçerlidir. Bilgi paylaşımı sadece hastanın rızası, hakim kararı veya meşru müdafaa/acil durum hallerinde (§ 34 StGB) mümkündür.',
        guideline: 'Musterberufsordnung für die deutschen Ärztinnen und Ärzte (MBO-Ä) § 9 & § 203 StGB.',
        paragraph: '§ 203 StGB · § 34 StGB · § 9 MBO-Ä'
      };
    }

    return null;
  }

  function getLegalCheckpoint(q) {
    const res = _computeLegalCheckpoint(q);
    if (!res) return null;
    return {
      ...res,
      title: res.title || res.topic || 'ÄKNO Rechtsfrage & Aufklärung',
      topic: res.topic || res.title || 'ÄKNO Rechtsfrage & Aufklärung',
      rule: res.rule || res.ruleDE || 'Gemäß Berufsordnung & BGB',
      ruleDE: res.ruleDE || res.rule || 'Gemäß Berufsordnung & BGB',
      ruleTR: res.ruleTR || '',
      scenario: res.scenario || 'Klinische Entscheidungssituation',
      guideline: res.guideline || res.paragraph || 'Ärztekammer Nordrhein (ÄKNO) Rechtsstandard',
      paragraph: res.paragraph || res.guideline || 'BGB & Berufsordnung'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SMART SESSION BUILDER (SCHWACHSTELLEN & FÄLLIGE FÄLLE)
  // ─────────────────────────────────────────────────────────────────────────────
  function getSmartSessionQuestions(questions, sm2Data, answers) {
    if (!Array.isArray(questions)) return [];
    sm2Data = sm2Data || {};
    answers = answers || {};

    const now = Date.now();

    // Prioritize:
    // 1. SM-2 Due questions
    // 2. Incorrect / Unsicher (K.O.-Fehler) questions
    // 3. High-Yield unattempted questions
    const scored = questions.map(q => {
      const sm = sm2Data[q.id];
      const ans = answers[q.id];
      let priority = 0;

      if (sm && sm.dueDate && sm.dueDate <= now) {
        priority += 100; // Fällig
      }
      if (ans && ans.submitted && !ans.isCorrect) {
        priority += 80;  // Falsch / Unsicher
      }
      if (q.is_high_yield || q.stage === 1) {
        priority += 40;  // High-Yield
      }
      if (!ans || !ans.submitted) {
        priority += 30;  // Noch nie geübt
      }
      if (q.is_dus_protocol) {
        priority += 20;  // Düsseldorf Top-Fall
      }

      return { q, priority };
    });

    scored.sort((a, b) => b.priority - a.priority);
    // Return top 25 high-priority questions for a 15-20 min power session
    return scored.slice(0, 25).map(item => item.q);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT MODULE
  // ─────────────────────────────────────────────────────────────────────────────
  const CurriculumEngine = {
    tagCurriculumStages,
    getMedicalGroundTruth,
    get30SecondSpickzettel,
    getRedeflussBaukasten,
    getLegalCheckpoint,
    getSmartSessionQuestions,
    BGA_TRAINING_CASES,
    CORE_SURVIVAL_KEYWORDS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CurriculumEngine;
  } else {
    global.CurriculumEngine = CurriculumEngine;
  }

})(typeof window !== 'undefined' ? window : this);
