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

    // Schädel-Hirn-Trauma & Neuroanästhesie (ICP / CPP)
    if (text.includes('schädel-hirn') || text.includes('hirndruck') || text.includes('icp') || text.includes('cpp') || text.includes('mannitol') || text.includes('hyperton')) {
      return {
        topic: 'Schädel-Hirn-Trauma & Hirndruckmanagement',
        topic_tr: 'Travmatik Beyin Hasarı & KİBAS Yönetimi',
        firstDrugTR: 'NaCl %3 (2 ml/kg i.v. bolus) veya Mannitol %20 (0,5–1 g/kg)',
        guideline: {
          title: 'DGN / DGAI S2k-Leitlinie Schädel-Hirn-Trauma & Neurotrauma',
          society: 'DGAI / DGN / DGNC / Brain Trauma Foundation (BTF)',
          awmf: 'AWMF-Registernummer 008-001',
          year: '2024',
          recommendation: 'Ziel-CPP ≥ 60–70 mmHg (MAP ≥ 80–90 mmHg), ICP < 20–22 mmHg, strikte Normokapnie (PaCO2 35–38 mmHg). Oberkörperhochlage 30°, Osmotherapie mit hypertoner Kochsalzlösung (NaCl 3%) oder Mannitol 20%.',
          recommendation_tr: 'Hedef CPP ≥ 60–70 mmHg (MAP ≥ 80–90 mmHg), ICP < 20–22 mmHg, kesin normokapni (PaCO2 35–38 mmHg). 30° baş yukarı pozisyon, hipertonik NaCl %3 veya Mannitol ile osmotik tedavi.'
        },
        dosages: [
          { drug: 'NaCl 3% hyperton', dose: '2 ml/kg i.v. Kurzinfusion über 15 min (ca. 150 ml)', route: 'i.v. (ZVK bevorzugt)', maxDose: 'Serum-Osmolarität max. 320 mosm/kg, Na max. 155 mmol/l', limits: 'Keine Hypovolämie induzierend' },
          { drug: 'Mannitol 20%', dose: '0,5–1,0 g/kg i.v. über 15–30 min', route: 'i.v.', maxDose: 'Osmolaritätslücke überwachen (< 10 mosm/kg)', limits: 'Gefahr der osmotischen Hypovolämie & Nierenversagen' },
          { drug: 'Noradrenalin (CPP-Sicherung)', dose: '0,05–0,5 µg/kg/min Perfusor', route: 'i.v.', maxDose: 'Ziel: MAP ≥ 80–90 mmHg bei ICP 20 mmHg (CPP = MAP - ICP)', limits: 'Permissive Hypotonie STRENG KONTRAINDIZIERT!' }
        ],
        koPitfalls: [
          { mistake: 'Permissive Hypotonie beim Schädel-Hirn-Trauma tolerieren', whyFatal: 'Bricht den zerebralen Perfusionsdruck (CPP < 50 mmHg) zusammen und verursacht irreversible sekundäre ischämische Hirnschäden (K.O.-Kriterium!).', correctAction: 'Strikte CPP-Führung: MAP durch Noradrenalin und balancierte Kristalloide ≥ 80–90 mmHg halten!' },
          { mistake: 'Dauerhafte prophylaktische Hyperventilation (PaCO2 < 30 mmHg)', whyFatal: 'Führt über zerebrale Vasokonstriktion zur drastischen Minderperfusion und fokalen Hirninfarkten.', correctAction: 'Normokapnie (PaCO2 35–38 mmHg) anstreben; milde Hyperventilation (PaCO2 30–35) nur als Notfallüberbrückung bei akuter Herniation.' }
        ]
      };
    }

    // Polytrauma & Massivtransfusion (ROTEM / Coagulopathy)
    if (text.includes('polytrauma') || text.includes('massivtransfusion') || text.includes('rotem') || text.includes('fibtem') || text.includes('schockraum') || text.includes('tranexamsäure')) {
      return {
        topic: 'Polytrauma & Akute Traumatische Koagulopathie (ATC)',
        topic_tr: 'Politravma & Masif Transfüzyon (ROTEM Kılavuzluğunda)',
        firstDrugTR: 'Traneksamik Asit (1 g i.v. ilk 3 saatte) + Fibrinojen Konsantresi (2–4 g i.v.)',
        guideline: {
          title: 'S3-Leitlinie Polytrauma / Schwerverletzten-Behandlung & European Trauma Guidelines',
          society: 'DGU / DGAI / DIVI / ESAIC Trauma Taskforce',
          awmf: 'AWMF-Registernummer 187-023',
          year: '2023',
          recommendation: 'Frühzeitige Gabe von Tranexamsäure (TXA 1 g Bolus innerhalb von 3h), zielgerichtete Gerinnungstherapie nach Thrombelastometrie (ROTEM/TEG), Vermeidung der tödlichen Trias (Hypothermie, Azidose, Hypokalzämie).',
          recommendation_tr: 'İlk 3 saatte erken Traneksamik asit (TXA 1 g bolus), ROTEM/TEG rehberliğinde hedefe yönelik faktör konsantresi (Fibrinojen, PCC), ölümcül triadın (hipotermi, asidoz, hipokalsemi) engellenmesi.'
        },
        dosages: [
          { drug: 'Tranexamsäure (TXA)', dose: '1 g i.v. Bolus über 10 min, gefolgt von 1 g über 8h', route: 'i.v.', maxDose: 'Gabe MUSS innerhalb von 3 Stunden nach Trauma erfolgen', limits: 'CRASH-2: Nach > 3h erhöht TXA die Mortalität!' },
          { drug: 'Fibrinogen-Konzentrat', dose: '2–4 g i.v. bei FIBTEM A10 < 10 mm (bzw. A5 < 9 mm)', route: 'i.v.', maxDose: 'Ziel: FIBTEM A10 ≥ 10–12 mm (Fibrinogen > 200 mg/dl)', limits: 'Erster verbrauchter Faktor im schweren Schock' },
          { drug: 'Prothrombinkomplex (PPSB / PCC)', dose: '20–30 IE/kg i.v. bei EXTEM CT > 80–100 s', route: 'i.v.', maxDose: 'Nur bei gesichertem Fibrinogenspiegel applizieren', limits: 'Gefahr von Mikrothromben ohne Fibrinogen-Substrat' },
          { drug: 'Kalziumchlorid 10%', dose: '10–20 ml i.v. (1–2 g)', route: 'i.v.', maxDose: 'Ziel: ionisiertes Kalzium > 1,1–1,2 mmol/l', limits: 'Citrat-Toxizität durch EK-Transfusionen neutralisieren' }
        ],
        koPitfalls: [
          { mistake: 'Ungezielte Gabe von FFP (Fresh Frozen Plasma) statt Faktorkonzentraten', whyFatal: 'Verursacht massive Volumenüberladung, Dilutionskoagulopathie und erhöht das Risiko für TACO und TRALI erheblich.', correctAction: 'Zielgerichtete Hämostase mit TXA, Fibrinogen und PCC nach ROTEM/TEG-Algorithmus.' },
          { mistake: 'Missachtung von Hypothermie (< 35°C) und Hypokalzämie (< 1,1 mmol/l)', whyFatal: 'Gerinnungsenzyme sind temperatur- und kalziumabhängig; unterhalb 35°C versagen alle Gerinnungsfaktoren.', correctAction: 'Konsequentes Wärmemanagement (Wärmedecken, Fluid-Warmer 41°C) und Kalziumsubstitution nach jedem 2. EK.' }
        ]
      };
    }

    // Elektrolyt-Notfälle (Hyperkaliämie & TURP-Syndrom / Hyponatriämie)
    if (text.includes('hyperkaliämie') || text.includes('hyponatriämie') || text.includes('turp') || text.includes('tur-syndrom') || text.includes('kalium') || text.includes('dialyse')) {
      return {
        topic: 'Elektrolyt-Notfälle: Hyperkaliämie & TURP-Syndrom',
        topic_tr: 'Elektrolit Acilleri: Hiperkalemi & TURP Sendromu',
        firstDrugTR: 'Kalsiyum Glukonat %10 (10 ml i.v. membran stabilizasyonu) + Glukoz-İnsülin',
        guideline: {
          title: 'ERC / DGAI / DIVI Empfehlungen Elektrolytstörungen im Notfall & Intensivmedizin',
          society: 'DGAI / ERC / DIVI / DGIM',
          awmf: 'SOP Notfall-Elektrolytmanagement',
          year: '2023',
          recommendation: '3-Säulen-Therapie der Hyperkaliämie: 1. Membranstabilisierung (Kalzium), 2. Shift nach intrazellulär (Glukose-Insulin, Salbutamol, Bikarbonat), 3. Elimination (Dialyse, Kationenaustauscher). TURP: NaCl 3% bei Natrium < 120 mmol/l mit ZNS-Symptomen (max. 8–10 mmol/l/24h).',
          recommendation_tr: 'Hiperkalemide 3 basamak: 1. Membran stabilizasyonu (Kalsiyum), 2. Hücre içine kaydırma (Glukoz-İnsülin, Salbutamol, Bikarbonat), 3. Eliminasyon (Diyaliz). TURP: Sodyum < 120 mmol/l ve nörolojik semptomda %3 NaCl (maks. 8-10 mmol/l/24saat).'
        },
        dosages: [
          { drug: 'Calciumgluconat 10%', dose: '10 ml i.v. langsam über 3–5 min (oder CaCl2 10% 5–10 ml über ZVK)', route: 'i.v.', maxDose: 'Wiederholung nach 5–10 min bei persistierenden EKG-Zeichen', limits: 'Membranstabilisierung hält nur 30–60 min an; senkt Kalium NICHT!' },
          { drug: 'Glukose 20% + Alt-Insulin', dose: '50 ml Glukose 20% + 10 IE Normalinsulin i.v. über 15–30 min', route: 'i.v.', maxDose: 'Blutzuckerkontrollen engmaschig alle 30–60 min', limits: 'Senkt Serumkalium um ca. 0,5–1,2 mmol/l' },
          { drug: 'Salbutamol (Inhalation / i.v.)', dose: '10–20 mg vernebelt oder 0,5 mg i.v. über 15 min', route: 'Inhalativ / i.v.', maxDose: 'Beta-2-vermittelte Na-K-ATPase Aktivierung', limits: 'Vorsicht bei schwerer koronarer Herzkrankheit' },
          { drug: 'NaCl 3% hyperton (bei TURP / Na < 120)', dose: '100 ml i.v. Kurzinfusion über 10–15 min', route: 'i.v.', maxDose: 'Max. Anstieg 8–10 mmol/l in 24h (Prävention der ODS / Myelinolyse)', limits: 'Stopp bei Sistieren von Krämpfen und Koma' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Succinylcholin bei Dialysepatienten oder vorbestehender Hyperkaliämie', whyFatal: 'Succinylcholin steigert das Serumkalium akut um 0,5–1,0 mmol/l und führt unmittelbar zur Kammerasystolie!', correctAction: 'Succinylcholin ist strikt kontraindiziert. RSI mit Rocuronium 1,2 mg/kg durchführen (Reversierung mit Sugammadex).' },
          { mistake: 'Zu rascher Ausgleich einer chronischen Hyponatriämie (> 10–12 mmol/l/24h)', whyFatal: 'Führt zur gefürchteten osmotischen Demyelinisierung (pontine Myelinolyse) mit irreversibler spastischer Tetraplegie und Locked-in-Syndrom.', correctAction: 'Streng limitierter Ausgleich: maximal 8–10 mmol/l innerhalb der ersten 24 Stunden!' }
        ]
      };
    }

    // Herzschrittmacher & Implantierbare Kardioverter-Defibrillatoren (ICD)
    if (text.includes('schrittmacher') || text.includes('pacemaker') || text.includes('icd') || text.includes('magnetauflage') || text.includes('elektrokauter')) {
      return {
        topic: 'Perioperatives Management von Schrittmachern & ICDs',
        topic_tr: 'Kalp Pili & İCD Perioperatif Yönetimi (EMI & Mıknatıs)',
        firstDrugTR: 'Halka Mıknatıs (Ringmagnet) + Harici Defibrilatör Pedleri',
        guideline: {
          title: 'DGAI / DGK Konsensusempfehlung Perioperatives Management kardialer Implantate (CIED)',
          society: 'DGAI / BDA / Deutsche Gesellschaft für Kardiologie (DGK)',
          awmf: 'Kardiologie Leitlinien CIED Perioperativ',
          year: '2023',
          recommendation: 'ICD: Magnetauflage schaltet NUR die Schocktherapie ab (Antitachykardie-Funktion AUS, verhindert Fehlshocks durch Kauter-EMI). Schrittmacherfunktion bleibt unverändert! Herzschrittmacher: Magnet schaltet in asynchronen Starrfrequenzmodus (VOO/DOO 85–100/min). Klebe-Defibrillatorelektroden VOR Narkoseeinleitung anbringen.',
          recommendation_tr: 'İCD: Mıknatıs SADECE şok fonksiyonunu devre dışı bırakır (koter girişimini şok sanmayı engeller), pili asenkron moda geçirmez! Kalp pili: Mıknatıs asenkron sabit hıza (VOO/DOO 85-100/dk) geçirir. Harici pedler indüksiyondan ÖNCE yapıştırılmalıdır.'
        },
        dosages: [
          { drug: 'Externe Defibrillations-Pads', dose: 'Anterior-posterior vor Narkoseeinleitung kleben', route: 'Kutan', maxDose: 'Immer einsatzbereit bei deaktiviertem ICD', limits: 'Pflichtstandard bei jeder ICD-Operation' },
          { drug: 'Bipolare Diathermie / Kauter', dose: 'Kurze Impulse (< 2 s), Neutralelektrode am Oberschenkel', route: 'Chirurgisch', maxDose: 'Strompfad darf niemals über das Aggregat oder die Sonden fließen', limits: 'Abstand Kauter zu Aggregat > 15 cm' },
          { drug: 'Atropin / Adrenalin / Isoprenalin', dose: 'Atropin 0,5–1 mg, Adrenalin 10–50 µg bei Ausfall', route: 'i.v.', maxDose: 'Pharmakologische Notfall-Frequenzstützung', limits: 'Temporäre transkutane Schrittmacherbereitschaft' }
        ],
        koPitfalls: [
          { mistake: 'Annahme, dass ein Ringmagnet den ICD in einen asynchronen Schrittmachermodus versetzt', whyFatal: 'Kardinaler Denkfehler! Der Magnet deaktiviert beim ICD ausschließlich die Schocktherapie. Ist der Patient schrittmacherabhängig, kann Kauter-EMI zur Asystolie führen.', correctAction: 'Schrittmacherabhängige ICD-Patienten müssen präoperativ durch Kardiotechnik/Programmiergerät in VOO/DOO umprogrammiert werden.' },
          { mistake: 'Verzicht auf externe Defibrillationselektroden bei deaktiviertem ICD', whyFatal: 'Tritt intraoperativ Kammerflimmern auf, kann der Patient nicht sofort defibrilliert werden -> anoxischer Hirnschaden.', correctAction: 'Vor Schnittbeginn Defibrillator-Pads kleben und Defibrillator betriebsbereit im Saal vorhalten.' }
        ]
      };
    }

    // Thoraxanästhesie & Einlungenventilation (DLT / Hypoxämie)
    if (text.includes('einlungenventilation') || text.includes('dlt') || text.includes('doppellumentubus') || text.includes('bronchusblocker') || text.includes('olv') || text.includes('thorakotomie')) {
      return {
        topic: 'Thoraxanästhesie & Einlungenventilation (OLV)',
        topic_tr: 'Toraks Anestezisi & Tek Akciğer Ventilasyonu (OLV Hipoksemi Algoritması)',
        firstDrugTR: '%100 FiO2 -> Kollebe Akciğere CPAP (1-5 cmH2O) -> İki Akciğer Ventilasyonu',
        guideline: {
          title: 'DGAI / EACTAIC Empfehlungen zur Thoraxanästhesie & Einlungenventilation',
          society: 'DGAI / Arbeitskreis Thoraxanästhesie / EACTAIC',
          awmf: 'Leitlinie Thoraxanästhesie & Lungenisolation',
          year: '2023',
          recommendation: 'Lungenprotektive OLV: Tidalvolumen 4–5 ml/kg PBW, PEEP 5–8 cmH2O, Driving Pressure ≤ 14 cmH2O. 5-Stufen-Algorithmus bei Hypoxämie: 1. FiO2 1.0, 2. Fiberoptische Lagekontrolle des DLT, 3. PEEP-Optimierung der ventilierten Lunge, 4. CPAP (1–5 cmH2O mit O2) an die nicht-ventilierte Lunge, 5. Re-Ventilation beider Lungen.',
          recommendation_tr: 'Akciğer koruyucu OLV: Vt 4-5 ml/kg PBW, PEEP 5-8 cmH2O, Driving pressure <= 14. Hipoksemide 5 basamak: 1. %100 FiO2, 2. Fiberoptik DLT kontrolü, 3. Ventilasyon akciğerine PEEP, 4. Kollabe akciğere CPAP (1-5 cmH2O O2), 5. İki akciğeri tekrar havalandır.'
        },
        dosages: [
          { drug: 'Sauerstoff-Insufflation (FiO2 1.0)', dose: '100% O2 bei akutem SpO2-Abfall', route: 'Beatmung', maxDose: 'Reduktion nach Stabilisierung auf FiO2 0,6–0,8', limits: 'Resorptionsatelektasen beachten' },
          { drug: 'CPAP-System an kollabierte Lunge', dose: '1–5 cmH2O kontinuierlicher O2-Flow (2–5 l/min)', route: 'Kollabierter DLT-Schenkel', maxDose: 'Sehr effektiv zur Shunt-Reduktion ohne Sichtbehinderung für Operateur', limits: 'Operateur vorab informieren' },
          { drug: 'Protektive Ventilation (PBW)', dose: 'Vt 4–5 ml/kg bezogen auf Idealgewicht (PBW) + PEEP 5–8 cmH2O', route: 'Ventilator', maxDose: 'Spitzendruck < 25–30 mbar, Driving Pressure < 14 mbar', limits: 'Hyperkapnie permissiv tolerieren (pH ≥ 7,20)' }
        ],
        koPitfalls: [
          { mistake: 'Blindes Weiterprobieren ohne fiberoptische DLT-Lagekontrolle bei Hypoxie', whyFatal: 'Die häufigste Ursache einer akuten intraoperativen Hypoxie während OLV ist eine Dislokation des DLT (z.B. durch Umlagerung). Blindes Erhöhen von Beatmungsdrücken führt zum Barotrauma.', correctAction: 'Sofortige fiberoptische Kontrolle der Tubusspitze und der Karina über beide Schenkel!' },
          { mistake: 'Ventilation der operierten Einzellunge mit Normal-Tidalvolumen (8–10 ml/kg)', whyFatal: 'Erzeugt massives Volu- und Barotrauma mit tödlichem akutem Lungenschaden (ARDS / ALI nach Thorakotomie).', correctAction: 'Tidalvolumen strikt auf 4–5 ml/kg PBW der Einzellunge reduzieren!' }
        ]
      };
    }

    // Pädiatrische Notfälle & Laryngospasmus
    if (text.includes('laryngospasmus') || text.includes('pädiatr') || text.includes('larson') || text.includes('kind') || text.includes('fremdkörperaspiration')) {
      return {
        topic: 'Pädiatrische Anästhesie & Akuter Laryngospasmus',
        topic_tr: 'Pediyatrik Anestezi & Akut Laringospazm Yönetimi',
        firstDrugTR: '%100 O2 CPAP + Larson Manevrası -> Propofol (0,5-1 mg/kg) veya Süksinilkolin + Atropin',
        guideline: {
          title: 'DGAI / ESPA Handlungsempfehlung Pädiatrisches Atemwegsmanagement',
          society: 'DGAI / Arbeitskreis Kinderanästhesie & ESPA',
          awmf: 'Leitlinie Pädiatrisches Atemwegsmanagement',
          year: '2023',
          recommendation: 'Stufenplan Laryngospasmus: 1. Narkosevertiefung/Reizunterbrechung + 100% O2 mit dicht sitzender Maske & CPAP (10–15 cmH2O), 2. Larson-Punkt (Druck hinter den Kieferwinkeln), 3. Propofol (0,5–1 mg/kg i.v.), 4. Succinylcholin (0,5–1 mg/kg i.v. IMMER zusammen mit Atropin 0,02 mg/kg bei Kindern < 8 Jahren). Tubusgröße: (Alter/4) + 3,5 mm (gecufft).',
          recommendation_tr: 'Laringospazm basamakları: 1. %100 O2, maskeyle sıkı CPAP (10-15 cmH2O), 2. Larson manevrası (çene köşesi arkasına bası), 3. Propofol (0.5-1 mg/kg), 4. Süksinilkolin (0.5-1 mg/kg i.v. + Atropin 0.02 mg/kg). Kafli tüp: (Yaş/4) + 3.5 mm.'
        },
        dosages: [
          { drug: 'Sauerstoff-CPAP', dose: '100% O2 mit PEEP/CPAP 10–15 cmH2O via dichte Maske', route: 'Maske', maxDose: 'Überwindet leichten bis mäßigen Glottisschluss', limits: 'Vorsicht vor Magenüberblähung' },
          { drug: 'Propofol (Krampflösung)', dose: '0,5–1,0 mg/kg i.v. Bolus', route: 'i.v.', maxDose: 'Durchbricht Laryngospasmus oft ohne Relaxierung', limits: 'Nur bei stabiler Hämodynamik' },
          { drug: 'Succinylcholin (Notfall-Rescue)', dose: '0,5–1,0 mg/kg i.v. (oder 3–4 mg/kg i.m. bei fehlendem ZVK/Viggo)', route: 'i.v. / i.m.', maxDose: 'Zwingend zusammen mit Atropin 0,02 mg/kg i.v.!', limits: 'Verhindert vagale Asystolie des hypoxischen Kindes' },
          { drug: 'Atropin (Bradykardieschutz)', dose: '0,02 mg/kg i.v. (Mindestdosis 0,1 mg)', route: 'i.v.', maxDose: 'Max. 0,5 mg Einzeldosis', limits: 'Essentiell bei pädiatrischer Hypoxie-Bradykardie' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Succinylcholin beim hypoxischen Kind OHNE Atropin', whyFatal: 'Führt bei vorbestehendem Vagotonus und Hypoxie zur unmittelbaren, letalen bradykarden Asystolie (K.O.-Fehler!).', correctAction: 'Succinylcholin und Atropin müssen beim Kind immer gemeinsam aufgezogen und gespritzt werden!' },
          { mistake: 'Blinde Überdruckbeatmung bei vermuteter Fremdkörperaspiration', whyFatal: 'Keilt den Fremdkörper tiefer im Bronchialbaum ein und konvertiert einen partiellen Verschluss in einen totalen Ventilpneumothorax.', correctAction: 'Spontanatmung unter Sevofluran erhalten; starre Bronchoskopie im OP durchführen.' }
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
    if (!q) {
      q = { stem_de: '', question_de: '', category: '' };
    }
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.category || '')).toLowerCase();

    // Default tailored templates
    let s1de = 'Zusammenfassend handelt es sich um einen Risikopatienten mit akutem Handlungsbedarf. Mein primäres anästhesiologisches Ziel ist die lückenlose Sicherung der Vitalfunktionen und ein strukturiertes Vorgehen nach DGAI-Leitlinien.';
    let s1tr = 'Özetle, acil müdahale gerektiren yüksek riskli bir hasta ile karşı karşıyayız. Birincil anesteziyolojik hedefim vital fonksiyonların eksiksiz korunması ve DGAI kılavuzlarına göre yapılandırılmış bir yaklaşım sergilemektir.';

    let s2de = 'Bei der systematischen Inspektion des Monitors fällt unmittelbar die hämodynamische und respiratorische Dekompensation auf. Die Blutgasanalyse zeigt eine interventionsbedürftige Störung, die ich sofort gezielt korrigiere.';
    let s2tr = 'Monitörün sistematik incelemesinde hemodinamik ve solunumsal dekompansasyon hemen göze çarpmaktadır. Kan gazı analizi, derhal hedefe yönelik düzeltmem gereken acil bir tabloyu doğrulamaktadır.';

    let s3de = 'Angesichts der akuten Gefährdung arbeite ich strikt nach dem ABCDE-Schema. Ich rufe sofort den Oberarzt als Back-up, kommuniziere im Team mit Closed-Loop-Briefing und leite ohne Verzögerung die kausale Medikation ein.';
    let s3tr = 'Akut hayati tehlike karşısında kesinlikle ABCDE algoritmasına göre hareket ediyorum. Derhal kıdemli/uzman desteği çağırıyor, ekiple kapalı devre iletişim kuruyor ve nedensel ilaç tedavisini gecikmeksizin başlatıyorum.';

    let s4de = 'Nach erfolgreicher Stabilisierung übergebe ich den Patienten strukturiert nach dem SBAR-Schema an die anästhesiologische Intensivstation zur engmaschigen invasiven Nachüberwachung.';
    let s4tr = 'Hasta başarıyla stabilize edildikten sonra, yakın invaziv takip ve ileri tedavi için SBAR şablonuna göre yapılandırılmış şekilde anestezi yoğun bakım ünitesine devrediyorum.';

    // 1. Airway / CICO / Laryngospasm
    if (text.includes('atemweg') || text.includes('intubation') || text.includes('cico') || text.includes('koniotomie') || text.includes('laryngospasmus')) {
      s1de = 'Herr Prüfungsvorsitzender, wir stehen vor einem kritischen Atemwegsnotfall. Meine oberste Priorität ist die lückenlose Oxygenierung nach dem DGAI-Stufenplan: Plan A Videolaryngoskopie, Plan B Larynxmaske, und bei CICO unverzüglich Plan D eFONA.';
      s1tr = 'Sayın jüri başkanı, kritik bir havayolu acili ile karşı karşıyayız. En yüksek önceliğim DGAI basamaklı planına göre kesintisiz oksijenasyondur: Plan A Videolaringoskopi, Plan B LMA, ve CICO tablosunda derhal Plan D eFONA krikotiroidotomi.';
      s2de = 'Der Monitor zeigt eine rasante Entsättigung mit SpO2 unter 80% und reflektorischer Bradykardie. Die Kapnografie bestätigt das Fehlen eines Beatmungshubs (No-Flow-Situation).';
      s2tr = 'Monitör SpO2 nin hızla %80 in altına düştüğünü ve refleks bradikardi geliştiğini gösteriyor. Kapnografi havalanmanın tamamen durduğunu doğruluyor.';
      s3de = 'Ich deklariere laut im Saal: "Cannot Intubate, Cannot Oxygenate!" Ich fordere das Koniotomie-Set, verabreiche 16 mg/kg Sugammadex bei Rocuronium und führe bei persistierender Hypoxie den Skalpell-Bougie-Schnitt durch.';
      s3tr = 'Salonda yüksek sesle duyuruyorum: "Cannot Intubate, Cannot Oxygenate!" Krikotiroidotomi setini getirtiyor, Roküronyum için 16 mg/kg Sugammadeks veriyor ve hipoksemi devam ederse skalpel-buji kesisi yapıyorum.';
      s4de = 'Nach Etablierung des chirurgischen Atemwegs und Erreichen einer stabilen Sättigung plane ich die definitive operative Versorgung und den Transfer auf die Intensivstation.';
      s4tr = 'Cerrahi havayolu sağlandıktan ve satürasyon normale döndükten sonra kesin cerrahi onarımı ve yoğun bakıma transferi planlıyorum.';
    }
    // 2. Maligne Hyperthermie (MH)
    else if (text.includes('maligne hyperthermie') || text.includes('dantrolen')) {
      s1de = 'Ich diagnostiziere den dringenden Verdacht auf eine Maligne Hyperthermie. Das therapeutische Fenster ist extrem kurz; ich leite unverzüglich den DGAI/EMHG-Notfallalgorithmus ein.';
      s1tr = 'Acil Malign Hipertermi şüphesi tanısı koyuyorum. Terapötik pencere son derece dardır; derhal DGAI/EMHG acil durum algoritmasını başlatıyorum.';
      s2de = 'Leitsymptom im Monitoring ist der unerklärte, steile EtCO2-Anstieg trotz forcierter Beatmung, vergesellschaftet mit Sinustachykardie und metabolischer Laktatazidose in der BGA.';
      s2tr = 'Monitörizasyondaki temel bulgu, yüksek dakika hacmine rağmen açıklanamayan hızlı EtCO2 artışı, sinüs taşikardisi ve kan gazındaki metabolik laktik asidozdur.';
      s3de = 'Meine Sofortmaßnahmen lauten: Alle volatilen Anästhetika sofort STOPP, Verdampfer abkoppeln, 100% O2 mit maximalem Flow hyperventilieren und Dantrolen 2,5 mg/kg i.v. als Kausaltherapie spritzen.';
      s3tr = 'Acil adımlarım: Tüm uçucu anestezikleri derhal DURDUR, vaporizatörü ayır, maksimum akımla %100 O2 ile hiperventile et ve neden tedavisi olarak Dantrolen 2.5 mg/kg i.v. bolus yap.';
      s4de = 'Ich organisiere die kontinuierliche Dantrolen-Titration, kühle den Patienten bis maximal 38,5°C und übergebe ihn zur 24-stündigen Rezidiv-Überwachung auf die operative Intensivstation.';
      s4tr = 'Sürekli Dantrolen titrasyonunu organize ediyor, hastayı en fazla 38.5°C ye kadar soğutuyor ve 24 saatlik nüks takibi için cerrahi yoğun bakıma devrediyorum.';
    }
    // 3. LAST / Lokalanästhetika-Intoxikation
    else if (text.includes('last') || text.includes('lokalanästhetika') || text.includes('intralipid')) {
      s1de = 'Es besteht der V.a. eine systemische Lokalanästhetika-Intoxikation (LAST). Ich stoppe sofort jede weitere Injektion, sichere die Atemwege mit 100% O2 und aktiviere das Lipid-Rescue-Protokoll.';
      s1tr = 'Sistemik lokal anestezik toksisitesi (LAST) şüphesi mevcuttur. Her türlü enjeksiyonu derhal durduruyor, havayolunu %100 O2 ile emniyete alıyor ve Lipid Kurtarma protokolünü devreye sokuyorum.';
      s2de = 'Am Monitor sehe ich typische neuro- und kardiotoxische Warnzeichen: tonisch-klonische Aktivität gefolgt von QRS-Verbreiterung, ventrikulären Arrhythmien bis zum Kreislaufstillstand.';
      s2tr = 'Monitörde tipik nörotoksik ve kardiyotoksik bulgular izliyorum: tonik-klonik nöbeti takiben QRS genişlemesi, ventriküler aritmiler ve kardiyak arrest.';
      s3de = 'Ich fordere das Lipid-Kit: Intralipid 20% Bolus 1,5 ml/kg i.v. über 1 Minute, gefolgt von 0,25 ml/kg/min. Adrenalin-Dosis bei CPR strikt auf unter 1 µg/kg reduzieren; Vasopressin und Lidocain sind kontraindiziert!';
      s3tr = 'Lipid kitini getirtiyorum: İntralipid %20 bolus 1.5 ml/kg i.v. 1 dakikada, ardından 0.25 ml/kg/dk infüzyon. CPR da Adrenalin dozunu kesinlikle < 1 µg/kg a düşür; Vazopressin ve Lidokain kontrendikedir!';
      s4de = 'Wegen der Gefahr eines Rebounds überwache ich den Patienten nach erfolgreicher kardiopulmonaler Stabilisierung für mindestens 24 Stunden invasiv auf der Intensivstation.';
      s4tr = 'Rebound toksisite riski nedeniyle başarılı stabilizasyon sonrası hastayı yoğun bakımda en az 24 saat invaziv olarak takip ediyorum.';
    }
    // 4. Polytrauma & Massivtransfusion / Schock
    else if (text.includes('polytrauma') || text.includes('schockraum') || text.includes('blutung') || text.includes('transfusion') || text.includes('rotem')) {
      s1de = 'Wir leiten die Schockraumversorgung nach dem ATLS- und S3-Leitlinien-Algorithmus ein. Im Zentrum stehen die Beherrschung der lebensbedrohlichen Blutung und die Vermeidung der tödlichen Trias.';
      s1tr = 'Şok odası yönetimini ATLS ve S3 kılavuz algoritmalarına göre başlatıyoruz. Merkezde hayatı tehdit eden kanamanın durdurulması ve ölümcül triadın engellenmesi yer almaktadır.';
      s2de = 'Der Monitor dokumentiert einen hämorrhagischen Schock Klasse III bis IV mit Hypotonie und Tachykardie. Die BGA zeigt eine Laktatazidose und ein ionisiertes Kalzium unter 1,1 mmol/l.';
      s2tr = 'Monitör hipotansiyon ve taşikardi ile Evre III-IV hemorajik şoku belgeler. Kan gazı laktik asidoz ve 1.1 mmol/l nin altında iyonize kalsiyum gösterir.';
      s3de = 'Ich aktiviere das Massivtransfusionsprotokoll: Sofort Tranexamsäure 1 g i.v., gezielte ROTEM-Diagnostik mit Fibrinogen-Gabe bei FIBTEM A10 < 10 mm, Wärmemanagement und Kalziumsubstitution.';
      s3tr = 'Masif transfüzyon protokolünü aktive ediyorum: Derhal Traneksamik asit 1 g i.v., FIBTEM A10 < 10 mm ise Fibrinojen konsantresi, aktif ısıtma ve kalsiyum replasmanı.';
      s4de = 'Parallel zur chirurgischen Blutstillung (Damage Control Surgery) organisiere ich den nahtlosen Übergang auf die operative Intensivstation zur postoperativen Gerinnungsoptimierung.';
      s4tr = 'Cerrahi kanama kontrolüne (Damage Control Surgery) paralel olarak, postoperatif koagülasyon optimizasyonu için cerrahi yoğun bakıma kesintisiz geçişi koordine ediyorum.';
    }
    // 5. Sepsis & Septischer Schock
    else if (text.includes('sepsis') || text.includes('septisch') || text.includes('noradrenalin')) {
      s1de = 'Der Patient erfüllt die Sepsis-3-Kriterien im septischen Schock. Ich initiiere unverzüglich das 1-Hour-Bundle nach Surviving Sepsis Campaign mit differenzierter Kreislaufstabilisierung.';
      s1tr = 'Hasta septik şokta Sepsis-3 kriterlerini karşılamaktadır. Surviving Sepsis Campaign in 1 Saatlik Kurtarma Paketini derhal devreye sokuyorum.';
      s2de = 'Monitoring und Blutgas zeigen einen refraktären distributiven Schock mit Hyperlaktatämie über 4 mmol/l und MAP unter 65 mmHg trotz kristalloider Vorlastoptimierung.';
      s2tr = 'Monitör ve kan gazı, kristaloid yüklemesine rağmen 4 mmol/l üzeri laktat ve 65 mmHg altı MAP ile dirençli distributif şoku gösterir.';
      s3de = 'Ich titriere Noradrenalin als First-Line-Vasopressor auf einen Ziel-MAP von mindestens 65 mmHg, starre Blutkulturen vor Antibiose, gebe Breitspektrum-Antibiotika binnen 60 Minuten und schließe bei Bedarf Vasopressin 0,03 IE/min an.';
      s3tr = 'İlk tercih vazopressör Noradrenalini hedef MAP >= 65 mmHg olacak şekilde titre ediyorum, antibiyotikten önce kan kültürü alıp 60 dakikada geniş spektrumlu antibiyotiği başlıyorum; gerekirse sabit doz Vazopressin 0.03 IU/dk ekliyorum.';
      s4de = 'Zur weiteren Organunterstützung und Steuerung der Laktat-Clearance verlege ich den Patienten unter invasivem hämodynamischem Monitoring auf die Intensivstation.';
      s4tr = 'İleri organ desteği ve laktat klirensi takibi için hastayı invaziv hemodinamik monitörizasyon eşliğinde yoğun bakıma naklediyorum.';
    }

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
    },
    {
      id: 'bga_05',
      title: 'Akute Lungenarterienembolie (LAE) & Respiratorische Alkalose',
      title_tr: 'Akut Pulmoner Emboli & Respiratuar Alkaloz',
      patient: '54-jähriger Patient postoperativ nach Hüft-TEP, akute Dyspnoe, tachykard (130/min), Thoraxschmerz und Zyanose.',
      patient_tr: 'Kalça protezi ameliyatı sonrası 54 yaşında erkek hasta, ani başlayan nefes darlığı, taşikardi (130/dk), göğüs ağrısı ve siyanoz.',
      vitals: {
        ph: '7,52',
        pco2: '26 mmHg',
        po2: '52 mmHg',
        hco3: '22 mmol/l',
        be: '+0,8 mmol/l',
        lactate: '2,4 mmol/l',
        na: '138 mmol/l',
        k: '3,8 mmol/l',
        cl: '104 mmol/l',
        hb: '12,4 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Schwere arterielle Hypoxämie (PaO2 52 mmHg unter Raumluft) infolge intrapulmonalen Shunts und Ventilations-Perfusions-Mismatch.',
        step2_acidBase: 'Relevante Alkalämie (pH 7,52 > 7,45).',
        step3_compensation: 'Akute respiratorische Alkalose durch massive reflektorische Hyperventilation (pCO2 26 mmHg abgeatmet). Keine renale Kompensation (BE und HCO3 normwertig).',
        step4_anionGap: 'Normale Anionenlücke (AG 12 mmol/l). Mäßig erhöhtes Laktat durch myokardiale und periphere Minderperfusion.'
      },
      clinicalAction: '100% Sauerstoffgabe, Notfall-Echokardiographie (FATE: Rechtsherzbelastung, McConnell-Zeichen), therapeutische Antikoagulation (Heparin 5000 IE Bolus), bei Kreislaufinstabilität/Schock sofortige systemische Fibrinolyse (Alteplase rt-PA 100 mg).'
    },
    {
      id: 'bga_06',
      title: 'Schwere Salizylat- / ASS-Intoxikation (Mischstörung)',
      title_tr: 'Ağır Salisilat / Aspirin Zehirlenmesi (Kombine Bozukluk)',
      patient: '32-jährige Patientin nach Einnahme von 40 Tabletten ASS in suizidaler Absicht, Tinnitus, Schwindel, Tachypnoe und Schwitzen.',
      patient_tr: 'İntihar amaçlı 40 tablet Aspirin alan 32 yaşında kadın hasta, kulak çınlaması, baş dönmesi, takipne ve terleme ile acilde.',
      vitals: {
        ph: '7,39',
        pco2: '21 mmHg',
        po2: '94 mmHg',
        hco3: '12 mmol/l',
        be: '-11 mmol/l',
        lactate: '3,1 mmol/l',
        na: '140 mmol/l',
        k: '3,6 mmol/l',
        cl: '105 mmol/l',
        glucose: '130 mg/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Normale arterielle Oxygenierung (PaO2 94 mmHg).',
        step2_acidBase: 'Normaler/grenzwertiger pH (7,39), der jedoch eine schwere lebensbedrohliche Doppelstörung maskiert!',
        step3_compensation: 'Gleichzeitige primäre respiratorische Alkalose (direkte medulläre Stimulation des Atemzentrums mit pCO2 21 mmHg) UND primäre metabolische Azidose.',
        step4_anionGap: 'Massiv erhöhte Anionenlücke: AG = 140 - (105 + 12) = 23 mmol/l (> 12). Ursache: Entkopplung der oxidativen Phosphorylierung mit Laktat-, Salizylat- und Ketosäureakkumulation.'
      },
      clinicalAction: 'Urin-Alkalisierung mit Natriumbikarbonat 8,4% (Ziel-Urin-pH 7,5–8,0 zur Ionenfalle und renalen Ausscheidung), Kaliumsubstitution, bei Spiegeln > 80–100 mg/dl oder Enzephalopathie sofortige Hämodialyse!'
    },
    {
      id: 'bga_07',
      title: 'Massivtransfusion & Zitrat-Toxizität (Metabolische Alkalose)',
      title_tr: 'Masif Transfüzyon & Sitrat Toksisitesi (Metabolik Alkaloz)',
      patient: '45-jähriger Polytraumapatient nach Transfusion von 12 EK und 8 FFP, jetzt ventrikuläre Extrasystolen und verlängertes QTc-Intervall.',
      patient_tr: '12 Ünite ES ve 8 Ünite TDP transfüzyonu yapılan 45 yaşında politravma hastası, ventriküler ekstrasistoller ve uzamış QT aralığı.',
      vitals: {
        ph: '7,56',
        pco2: '46 mmHg',
        po2: '92 mmHg',
        hco3: '40 mmol/l',
        be: '+15 mmol/l',
        lactate: '1,6 mmol/l',
        na: '142 mmol/l',
        k: '3,1 mmol/l',
        ca: '0,78 mmol/l',
        hb: '9,2 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Gute Oxygenierung (PaO2 92 mmHg).',
        step2_acidBase: 'Ausgeprägte Alkalämie (pH 7,56 > 7,45).',
        step3_compensation: 'Schwere metabolische Alkalose (HCO3 40 mmol/l, BE +15) mit hypoventilatorischer partieller Kompensation (pCO2 auf 46 mmHg gestiegen).',
        step4_anionGap: 'Normale Anionenlücke. Kritische ionisierte Hypokalzämie (0,78 mmol/l) durch Bindung von Ca²⁺ an Konservierungs-Zitrat sowie Hypokaliämie.'
      },
      clinicalAction: 'Sofortige Kalziumsubstitution mit Kalziumchlorid 10% (10–20 ml i.v.), Kaliumsubstitution, vorsichtige Beatmung (keine Hyperventilation, da Alkalose die Hypokalzämie verschlimmert).'
    },
    {
      id: 'bga_08',
      title: 'Rhabdomyolyse & Akutes Nierenversagen (Crush-Syndrom)',
      title_tr: 'Rabdomiyoliz & Akut Böbrek Hasarı (Crush Sendromu)',
      patient: '28-jähriger Patient nach 12-stündiger Verschüttung unter Trümmern, beidseitiges Kompartmentsyndrom der Oberschenkel, dunkler portweinfarbener Urin.',
      patient_tr: 'Enkaz altında 12 saat kalan 28 yaşında hasta, iki taraflı uyluk kompartman sendromu, koyu çay rengi idrar.',
      vitals: {
        ph: '7,12',
        pco2: '29 mmHg',
        po2: '88 mmHg',
        hco3: '9 mmol/l',
        be: '-18 mmol/l',
        lactate: '4,2 mmol/l',
        na: '135 mmol/l',
        k: '7,4 mmol/l',
        cl: '98 mmol/l',
        hb: '11,8 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Ausreichende Oxygenierung (PaO2 88 mmHg unter 2 l O2).',
        step2_acidBase: 'Lebensbedrohliche schwere Azidämie (pH 7,12).',
        step3_compensation: 'Schwere metabolische Azidose (HCO3 9 mmol/l, BE -18) mit respiratorischer Gegenregulation (pCO2 29 mmHg).',
        step4_anionGap: 'Erhöhte Anionenlücke (AG 28 mmol/l) durch Akkumulation von Sulfat, Phosphat, Myoglobin und Laktat. Vital bedrohliche Hyperkaliämie (7,4 mmol/l!).'
      },
      clinicalAction: '1. Kardiale Membranstabilisierung: Kalziumchlorid 10% 10 ml i.v., 2. Shift-Therapie: 10 IE Altinsulin in 50 ml G40% + Salbutamol inhalativ, 3. Forcierte Hydratation mit Natriumbikarbonat (Harnalkalisierung pH > 6,5 zum Schutz vor Myoglobinzylindern), 4. Notfall-Hämodialysebereitschaft.'
    },
    {
      id: 'bga_09',
      title: 'Opioid-Überdosierung & Postoperative Atemdepression',
      title_tr: 'Opioid Doz Aşımı & Postoperatif Solunum Depresyonu',
      patient: '38-jähriger Patient postoperativ auf Normalstation nach Fentanyl-PCA-Pumpe, Atemfrequenz 4/min, stecknadelkopfgroße Pupillen, komatös.',
      patient_tr: 'Fentanil PCA pompası sonrası serviste yatan 38 yaşında hasta, solunum sayısı 4/dk, toplu iğne başı pupiller, komatoz.',
      vitals: {
        ph: '7,06',
        pco2: '94 mmHg',
        po2: '42 mmHg',
        hco3: '26 mmol/l',
        be: '+0,2 mmol/l',
        lactate: '2,0 mmol/l',
        na: '139 mmol/l',
        k: '4,5 mmol/l',
        cl: '102 mmol/l',
        hb: '14,2 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Schwere lebensbedrohliche Hypoxämie (PaO2 42 mmHg unter Raumluft).',
        step2_acidBase: 'Akute schwere Azidämie (pH 7,06 < 7,10).',
        step3_compensation: 'Reine akute unkompensierte respiratorische Azidose (CO2-Narkose mit pCO2 94 mmHg). Normales Bikarbonat (26 mmol/l) und normaler BE (+0,2), da Nierenkompensation 24–48h benötigt.',
        step4_anionGap: 'Normale Anionenlücke (AG 11 mmol/l). Reine Hypoventilationsstörung.'
      },
      clinicalAction: 'Sofortige Beutel-Masken-Beatmung mit 100% O2! Naloxon titriert i.v. (0,04–0,08 mg alle 2 Minuten bis zum Wiedereintritt der Spontanatmung). Cave: Naloxon-Halbwertszeit (45–60 min) ist kürzer als die vieler Opioide -> Rebound-Überwachung auf Intensivstation!'
    },
    {
      id: 'bga_10',
      title: 'Maligne Hyperthermie (MH) - Akute hypermetabole Krise',
      title_tr: 'Malign Hipertermi (MH) - Akut Hipermetabolik Kriz',
      patient: '19-jähriger Patient intraoperativ unter Narkose mit Sevofluran, plötzlicher Anstieg von EtCO2 auf 85 mmHg trotz Hyperventilation, Temperatur 39,4 °C, Masseterspasmus.',
      patient_tr: 'Sevofluran anestezisi altında 19 yaşında hasta, dakika solunum hacmi artırılmasına rağmen EtCO2 aniden 85 mmHg, vücut sıcaklığı 39,4 °C, masseter spazmı.',
      vitals: {
        ph: '6,98',
        pco2: '98 mmHg',
        po2: '120 mmHg',
        hco3: '16 mmol/l',
        be: '-16 mmol/l',
        lactate: '12,5 mmol/l',
        na: '144 mmol/l',
        k: '7,2 mmol/l',
        cl: '98 mmol/l',
        hb: '13,8 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Oxygenierung durch 100% O2 vorerst erhalten (PaO2 120 mmHg).',
        step2_acidBase: 'Extreme, lebensbedrohliche Azidämie (pH 6,98 < 7,0).',
        step3_compensation: 'Schwere kombinierte respiratorische (pCO2 98 mmHg) UND metabolische Laktatazidose (Laktat 12,5 mmol/l, BE -16) durch explosionsartigen Zytosol-Kalziumeinstrom.',
        step4_anionGap: 'Massiv erhöhte Anionenlücke (AG 30 mmol/l) und akute letale Hyperkaliämie (7,2 mmol/l).'
      },
      clinicalAction: 'Trigger SOFORT STOPPEN (Vapor abdrehen!), Hyperventilation mit 100% O2 maximaler Flow, Dantrolen 2,5 mg/kg i.v. Bolus sofort (wiederholen bis zu 10 mg/kg), aktive Kühlung, Kalziumchlorid + Glukose/Insulin. K.O.-Kriterium: NIEMALS Kalziumkanalblocker!'
    },
    {
      id: 'bga_11',
      title: 'Post-Reanimationsphase (ROSC nach Kammerflimmern)',
      title_tr: 'Resüsitasyon Sonrası Dönem (Ventriküler Fibrilasyon Sonrası ROSC)',
      patient: '61-jähriger Patient nach 18 Minuten Reanimation bei Kammerflimmern und 3 Schocks, nun Spontankreislauf (ROSC), komatös (GCS 3).',
      patient_tr: 'Ventriküler fibrilasyon nedeniyle 18 dakika CPR ve 3 şok sonrası spontan dolaşımı dönen (ROSC) 61 yaşında komatoz hasta.',
      vitals: {
        ph: '7,02',
        pco2: '56 mmHg',
        po2: '110 mmHg',
        hco3: '14 mmol/l',
        be: '-17 mmol/l',
        lactate: '10,8 mmol/l',
        na: '138 mmol/l',
        k: '3,4 mmol/l',
        cl: '102 mmol/l',
        hb: '13,1 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Hyperoxämie vermeiden! PaO2 110 mmHg unter FiO2 0,6.',
        step2_acidBase: 'Schwere Azidämie (pH 7,02).',
        step3_compensation: 'Gemischte metabolische (Laktat 10,8 mmol/l, BE -17) und mäßig respiratorische Azidose (pCO2 56 mmHg) infolge des Ganzkörper-Kreislaufstillstands.',
        step4_anionGap: 'Massiv vergrößerte Anionenlücke (AG 22 mmol/l) durch hypoxische Gewebeischämie.'
      },
      clinicalAction: 'Zielgerichtetes Temperaturmanagement (TTM 32–36 °C), Vermeidung von Hyperoxie (Ziel SpO2 94–98%) und Hypokapnie (Normokapnie 35–45 mmHg zur Hirnperfusion), unverzüglicher Transfer ins Herzkatheterlabor (PTCA).'
    },
    {
      id: 'bga_12',
      title: 'Hyperchlorämische Dilutionsazidose nach NaCl 0,9%',
      title_tr: 'Aşırı Serum Fizyolojik (%0,9 NaCl) Sonrası Hiperkloremik Asidoz',
      patient: '42-jähriger Patient nach Schockraum-Stabilisierung und Zufuhr von 6 Litern NaCl 0,9% Infusion, nun Azidose im Aufwachraum.',
      patient_tr: 'Şok odasında 6 litre %0,9 NaCl (serum fizyolojik) infüzyonu yapılan 42 yaşında hasta, derlenme odasında asidoz tespit edildi.',
      vitals: {
        ph: '7,22',
        pco2: '32 mmHg',
        po2: '96 mmHg',
        hco3: '13 mmol/l',
        be: '-12 mmol/l',
        lactate: '1,2 mmol/l',
        na: '144 mmol/l',
        k: '4,1 mmol/l',
        cl: '122 mmol/l',
        hb: '10,2 g/dl'
      },
      systematicSteps: {
        step1_oxygenation: 'Normale Oxygenierung (PaO2 96 mmHg).',
        step2_acidBase: 'Relevante Azidämie (pH 7,22).',
        step3_compensation: 'Metabolische Azidose (HCO3 13 mmol/l, BE -12) mit adäquater respiratorischer Kompensation (pCO2 32 mmHg).',
        step4_anionGap: 'NORMALE Anionenlücke: AG = 144 - (122 + 13) = 9 mmol/l (< 12). Keine Laktatazidose (Laktat 1,2 normwertig!), sondern reine Verdünnungs-/Chlorid-Überladung (Cl 122 mmol/l).'
      },
      clinicalAction: 'Infusionsumstellung von NaCl 0,9% auf balancierte Vollelektrolytlösungen mit metabolisierbarem Anion (z.B. Jonosteril / Sterofundin), renale Säureausscheidung abwarten, keine Pufferung mit NaHCO3 indiziert!'
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
