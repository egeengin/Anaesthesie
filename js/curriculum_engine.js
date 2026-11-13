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

    
    // Extrakorporale Membranoxygenierung (ECMO) / ARDS
    if (/\b(ecmo|eolia)\b/i.test(text) || text.includes('extrakorporale membran') || (text.includes('ards') && (text.includes('vv-ecmo') || text.includes('va-ecmo') || text.includes('horovitz < 50')))) {
      return {
        topic: 'Extrakorporale Membranoxygenierung (ECMO) & EOLIA-Kriterien',
        topic_tr: 'Ekstrakorporal Membran Oksijenasyonu (ECMO) & EOLIA Kriterleri',
        firstDrugTR: 'Veno-venöz (V-V) ECMO Kanülasyonu & Ultra-Protektif Ventilasyon',
        guideline: {
          title: 'S3-Leitlinie Invasive Beatmung und Einsatz extrakorporaler Verfahren bei akuter respiratorischer Insuffizienz',
          title_tr: 'Akut Solunum Yetmezliğinde İnvaziv Ventilasyon ve Ekstrakorporal Yöntemler S3 Kılavuzu',
          society: 'DGAI / DIVI / DGP & ELSO Guidelines',
          awmf: 'AWMF-Registernummer 001-021',
          year: '2024',
          recommendation: 'Bei schwerem ARDS mit refraktärer Hypoxämie (Horovitz-Quotient < 80 mmHg über > 6h oder < 50 mmHg über > 3h trotz Bauchlagerung und PEEP-Optimierung) sofortige Indikationsprüfung für V-V-ECMO nach EOLIA-Kriterien.',
          recommendation_tr: 'Yüzüstü pozisyonlama ve optimize PEEP e ragmen refrakter hipoksemisi olan agir ARDS de (PaO2/FiO2 < 80 mmHg > 6 saat veya < 50 mmHg > 3 saat) EOLIA kriterlerine göre derhal V-V ECMO degerlendirmesi yapilmalidir.'
        },
        dosages: [
          { drug: 'V-V ECMO Kanülengröße', drug_tr: 'V-V ECMO Kanül Boyutu', dose: 'Drainagefemoral 23–25 Fr, Rückgabe jugulär 17–19 Fr', dose_tr: 'Femoral drenaj 23–25 Fr, juguler dönüş 17–19 Fr', route: 'perkutan / chirurgisch', maxDose: 'Blutfluss 4–6 l/min (angestrebt: SaO₂ > 85-88%)', maxDose_tr: 'Kan akımı 4–6 l/dk (hedef: SaO₂ > %85–88)', limits: 'Strikte Ultraschall- & Röntgenlagekontrolle', limits_tr: 'Kesin ultrason ve akciğer grafisi ile yerleşim kontrolü' },
          { drug: 'Ultra-lungenprotektive Beatmung unter ECMO', drug_tr: 'ECMO Altında Ultra-Akciğer Koruyucu Ventilasyon', dose: 'Vt 2–4 ml/kg PBW, Driving Pressure < 10–12 cmH₂O, PEEP 10–14 cmH₂O', dose_tr: 'Vt 2–4 ml/kg PBW, Driving Pressure < 10–12 cmH₂O, PEEP 10–14 cmH₂O', route: 'Beatmung', maxDose: 'Atemfrequenz 4–10/min (Lung-Rest-Concept)', maxDose_tr: 'Solunum sayısı 4–10/dk (Akciğer İstirahati / Lung-Rest Konsepti)', limits: 'Spitzenbeatmungsdruck Pmax ≤ 25 cmH₂O', limits_tr: 'Tepe inspiratuar basınç Pmax ≤ 25 cmH₂O' },
          { drug: 'Antikoagulation unter ECMO', drug_tr: 'ECMO Altında Antikoagülasyon', dose: 'Unfraktioniertes Heparin (UFH) Ziel-aPTT 50–70s bzw. Anti-Xa 0,3–0,5 IE/ml', dose_tr: 'Fraksiyone olmayan Heparin (UFH) hedef aPTT 50–70 sn veya Anti-Xa 0,3–0,5 IU/ml', route: 'i.v. Perfusor', maxDose: 'Regelmäßiges Gerinnungs- und ROTEM-Monitoring', maxDose_tr: 'Düzenli koagülasyon ve ROTEM takibi', limits: 'Blutungs- und Thromboserisiko', limits_tr: 'Kanama ve devre trombozu riski' }
        ],
        koPitfalls: [
          { mistake: 'Anschluss einer V-A ECMO bei reinem hypoxämischem Lungenversagen ohne kardiogenen Schock', mistake_tr: 'Kardiyojenik şok olmaksızın saf hipoksemik solunum yetmezliğinde V-A ECMO bağlanması', whyFatal: 'V-A ECMO erhöht unnötig die linksventrikuläre Nachlast und birgt das Risiko eines Harlekin-Syndroms (oberkörpernahe Hypoxie)!', whyFatal_tr: 'V-A ECMO sol ventrikül ard yükünü (afterload) gereksiz yere artırır ve Harlequin sendromu (üst vücut hipoksisi) riskine yol açar!', correctAction: 'Bei isoliertem respiratorischem ARDS immer V-V ECMO als Goldstandard wählen.', correctAction_tr: 'İzole solunumsal ARDS tablosunda altın standart olarak daima V-V ECMO seçilmelidir.' }
        ]
      };
    }

    // Patient Blood Management (PBM)
    if (/\b(pbm)\b/i.test(text) || text.includes('patient blood management') || (text.includes('anämie') && text.includes('ferric') && text.includes('präoperativ'))) {
      return {
        topic: 'Patient Blood Management (PBM) & Präoperative Anämieoptimierung',
        topic_tr: 'Hasta Kan Yönetimi (PBM) & Preoperatif Anemi Optimizasyonu',
        firstDrugTR: 'Ferrik Karboksimaltoz (i.v. Demir) & Restriktif Transfüzyon (Hb 7-8 g/dl)',
        guideline: {
          title: 'S3-Leitlinie Präoperative Anämie und Patient Blood Management',
          title_tr: 'Preoperatif Anemi ve Hasta Kan Yönetimi (PBM) S3 Kılavuzu',
          society: 'DGAI / BDA / DGTI / AWMF',
          awmf: 'AWMF-Registernummer 001-024',
          year: '2023',
          recommendation: 'PBM-3-Säulen-Konzept: 1. Präoperative Anämiediagnostik und Kausaltherapie (i.v. Eisen / EPO), 2. Minimierung von intraoperativem Blutverlust (TXA, Cell-Saver, Point-of-Care-Gerinnung), 3. Rationale, restriktive Transfusionstrigger (Hb 7–8 g/dl).',
          recommendation_tr: 'PBM 3 Sütun Konsepti: 1. Preoperatif anemi tanisi ve nedene yönelik tedavi (i.v. demir / EPO), 2. Cerrahi kan kaybinin en aza indirilmesi (TXA, Cell-Saver, ROTEM), 3. Akilci ve kisitlayici transfüzyon esikleri (Hb 7-8 g/dl).'
        },
        dosages: [
          { drug: 'Eisencarboxymaltose (i.v. Eisen)', drug_tr: 'Ferrik Karboksimaltoz (i.v. Demir)', dose: '500–1.000 mg i.v. Kurzinfusion (Ganz-Dosis-Schema nach Ganzoni)', dose_tr: '500–1.000 mg i.v. kısa infüzyon (Ganzoni formülüne göre tam doz şeması)', route: 'i.v.', maxDose: 'Mindestens 2–4 Wochen vor elektiver Operation applizieren', maxDose_tr: 'Elektif operasyondan en az 2–4 hafta önce uygulanmalıdır', limits: 'Ferritin < 100 ng/ml oder Ferritin < 300 ng/ml bei TSAT < 20%', limits_tr: 'Ferritin < 100 ng/ml veya TSAT < %20 iken Ferritin < 300 ng/ml' },
          { drug: 'Tranexamsäure (TXA)', drug_tr: 'Traneksamik Asit (TXA)', dose: '1 g (10–15 mg/kg) i.v. Kurzinfusion bei Schnitt', dose_tr: '1 g (10–15 mg/kg) i.v. cilt kesisinde kısa infüzyon', route: 'i.v.', maxDose: 'Wiederholung nach 4–8h bei anhaltendem Blutverlust', maxDose_tr: 'Devam eden kanamada 4–8 saat sonra tekrar', limits: 'Gabe innerhalb der ersten 3 Stunden!', limits_tr: 'İlk 3 saat içinde uygulanmalıdır!' },
          { drug: 'Maschinelle Autotransfusion (Cell-Saver)', drug_tr: 'Ototransfüzyon (Cell-Saver)', dose: 'Aufbereitung von Wundblut bei erwartetem Blutverlust > 500–1.000 ml', dose_tr: 'Beklenen kan kaybı > 500–1.000 ml olduğunda yara kanının yıkanıp geri verilmesi', route: 'i.v. Retransfusion', maxDose: 'Gewaschenes Erythrozytenkonzentrat (Hk ~50–60%)', maxDose_tr: 'Yıkanmış eritrosit süspansiyonu (Hkt ~%50–60)', limits: 'Kontraindikation: Infektionsherd im OP-Gebiet', limits_tr: 'Kontrendikasyon: Cerrahi alanda enfeksiyon odağı veya malignite (ışınlamasız)' }
        ],
        koPitfalls: [
          { mistake: 'Liberale Bluttransfusion bei asymptomatischen Patienten mit Hb 8–9 g/dl', mistake_tr: 'Hb 8–9 g/dl olan asemptomatik hastalarda liberal kan transfüzyonu yapılması', whyFatal: 'Unnötige allogene Transfusionen erhöhen Infektionsrate, TRALI/TACO-Risiko und Gesamtmortalität signifikant!', whyFatal_tr: 'Gereksiz allojenik transfüzyonlar enfeksiyon oranını, TRALI/TACO riskini ve toplam mortaliteyi anlamlı şekilde artırır!', correctAction: 'Strikte Einhaltung restriktiver Transfusionsgrenzen (Hb 7 g/dl ohne KHK, 8 g/dl bei KHK/zerebrovaskulärer Erkrankung).', correctAction_tr: 'Kısıtlayıcı transfüzyon eşiklerine sıkı uyum (KAH yoksa Hb 7 g/dl, KAH/serebrovasküler hastalıkta 8 g/dl).' }
        ]
      };
    }

    // Maligne Hyperthermie (MH)
    if (text.includes('maligne hyperthermie') || text.includes('dantrolen')) {
      return {
        topic: 'Maligne Hyperthermie (MH)',
        topic_tr: 'Malign Hipertermi (MH)',
        firstDrugTR: 'Dantrolen (2,5 mg/kg i.v. Bolus)',
        guideline: {
          title: 'S2k-Leitlinie Diagnostik und Therapie der Malignen Hyperthermie',
          title_tr: 'Malign Hipertermi Tanı ve Tedavisi S2k Kılavuzu',
          society: 'DGAI / BDA & European Malignant Hyperthermia Group (EMHG)',
          awmf: 'AWMF-Registernummer 001-036',
          year: '2023',
          recommendation: 'Sofortige Trigger-Unterbrechung (Volatila STOP, Vapor dekonnektieren), 100% O2 mit maximalem Flow, Hyperventilation (2-3x MV), Dantrolen i.v. als Kausaltherapie.',
          recommendation_tr: 'Tetikleyicilerin derhal kesilmesi (uçucu anestezikleri DURDUR, vaporizatörü ayır), maksimum akımla %100 O2, hiperventilasyon (dakika hacminin 2-3 katı), nedene yönelik tedavi olarak Dantrolen i.v.'
        },
        dosages: [
          { drug: 'Dantrolen (Ryanodex / Dantrolen i.v.)', drug_tr: 'Dantrolen (Ryanodex / Dantrolen i.v.)', dose: '2,5 mg/kg i.v. Bolus', dose_tr: '2,5 mg/kg i.v. hızlı bolus', route: 'i.v.', maxDose: 'Bis zu 10 mg/kg (Titration bis Abfall von EtCO₂ & Tachykardie)', maxDose_tr: '10 mg/kg a kadar (EtCO₂ düşüşü ve taşikardi gerileyene dek titrasyon)', limits: 'EtCO₂ Normalisierung, T < 38,5°C', limits_tr: 'EtCO₂ normalleşmesi, vücut ısısı < 38,5°C' },
          { drug: 'Kühlung (Eispacks, kalte Infusionen)', drug_tr: 'Aktif Soğutma (Buz paketleri, soğuk infüzyonlar)', dose: 'Kalte Ringer-Laktat 4°C', dose_tr: '4°C soğuk dengeli kristalloid solüsyonu', route: 'i.v. / extern', maxDose: 'Stopp bei Kerntemperatur 38,5°C', maxDose_tr: 'Çekirdek ısı 38,5°C ye indiğinde soğutmayı durdur', limits: 'Rebound-Hypothermie vermeiden', limits_tr: 'Rebound hipotermiden kaçınılmalıdır' },
          { drug: 'Forcierte Diurese', drug_tr: 'Zorlu Diürez (Rabdomiyoliz Koruması)', dose: 'Furosemid 0,5–1 mg/kg + Mannitol 20%', dose_tr: 'Furosemid 0,5–1 mg/kg + Mannitol %20', route: 'i.v.', maxDose: 'Urin-Ausscheidung > 1,5–2 ml/kg/h', maxDose_tr: 'İdrar çıkışı > 1,5–2 ml/kg/saat hedeflenir', limits: 'Prävention von Myoglobinurie-Nierenversagen', limits_tr: 'Miyoglobinüriye bağlı akut böbrek yetmezliğinin önlenmesi' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Kalziumkanalblockern (z.B. Verapamil / Diltiazem)', mistake_tr: 'Kalsiyum kanal blokerlerinin (örn. Verapamil / Diltiazem) verilmesi', whyFatal: 'Führt bei MH in Kombination mit Dantrolen zu therapierefraktärer Hyperkaliämie, myokardialem Kreislaufkollaps und Asystolie!', whyFatal_tr: 'MH tablosunda Dantrolen ile kombinasyonu tedaviye dirençli ağır hiperkalemi, miyokardiyal kollaps ve asistoliye yol açar!', correctAction: 'Kalziumantagonisten sind STRENG KONTRAINDIZIERT! Hyperkaliämie mit Glukose-Insulin, Kalziumchlorid und ggf. Dialyse behandeln.', correctAction_tr: 'Kalsiyum antagonistleri KESİNLİKLE KONTRENDİKEDİR! Hiperkalemiyi glukoz-insülin, kalsiyum klorür ve gerekirse diyaliz ile tedavi edin.' },
          { mistake: 'Zuwarten mit Dantrolen bis zum Fieberanstieg', mistake_tr: 'Dantrolen vermek için ateşin yükselmesini beklemek', whyFatal: 'Hyperthermie ist ein Spätsymptom! Hauptfrühzeichen sind unbegründeter EtCO₂-Anstieg und Tachykardie / Masseterspasmus.', whyFatal_tr: 'Hipertermi geç bir bulgudur! En erken temel bulgular açıklanamayan EtCO₂ artışı, taşikardi ve masseter spazmıdır.', correctAction: 'Dantrolen sofort bei begründetem Verdacht (steigendes EtCO₂) ohne Zögern applizieren.', correctAction_tr: 'Haklı şüphe (yükselen EtCO₂) anında tereddüt etmeden derhal Dantrolen uygulayın.' }
        ]
      };
    }

    
    // GLP-1-Rezeptoragonisten & Aspirationsprävention
    if (text.includes('glp-1') || text.includes('semaglutid') || text.includes('ozempic') || text.includes('liraglutid') || text.includes('tirzepatid')) {
      return {
        topic: 'GLP-1-Rezeptoragonisten & Magenentleerungsverzögerung',
        topic_tr: 'GLP-1 Reseptör Agonistleri & Mide Boşalması Gecikmesi (Aspirasyon Riski)',
        firstDrugTR: 'Mide Ultrasonu (POCUS) + Hızlı Seri İndüksiyon (RSI)',
        guideline: {
          title: 'DGAI / ESAIC / ASA Konsensus-Leitlinie Perioperatives Management GLP-1-Agonisten',
          title_tr: 'GLP-1 Agonistlerinin Perioperatif Yönetimi DGAI / ESAIC / ASA Uzlaşı Kılavuzu',
          society: 'DGAI / ESAIC / ASA Taskforce',
          awmf: 'ESAIC Consensus 2024 GLP-1 Receptor Agonists',
          year: '2024',
          recommendation: 'Aufgrund extremer Magenentleerungsverzögerung (Gastroparese) droht trotz 6h Nüchternheit ein voller Magen. Tägliche GLP-1-RA am OP-Tag pausieren, wöchentliche GLP-1-RA 1 Woche vor OP pausieren. Bei Notfällen oder fehlender Pause: Magen-POCUS und konsequente RSI.',
          recommendation_tr: 'Belirgin gastroparezi nedeniyle 6 saatlik açlığa rağmen ameliyatta dolu mide riski mevcuttur. Günlük ilaç ameliyat günü, haftalık ilaç 1 hafta önce kesilir. Yetersiz aralıkta mide POCUS ve kesin RSI uygulanır.'
        },
        dosages: [
          { drug: 'Präoperative Karenz wöchentlicher Substanzen', drug_tr: 'Haftalık İlaçların Preoperatif Kesilmesi', dose: '1 Dosisintervall auslassen (7 Tage vor OP)', dose_tr: '1 doz aralığı atlanır (Ameliyattan 7 gün önce kesilir)', route: 's.c.', maxDose: 'Elektive Eingriffe bei Völlegefühl/Erbrechen verschieben', maxDose_tr: 'Dolgunluk hissi/kusma varsa elektif vakalar ertelenir', limits: 'Ozempic / Wegovy / Mounjaro', limits_tr: 'Ozempic / Wegovy / Mounjaro' },
          { drug: 'Magen-Sonographie (POCUS)', drug_tr: 'Mide Ultrasonografisi (POCUS)', dose: 'Antrum-Querschnitt im Rechtsseitenlage (Perlas 0-2)', dose_tr: 'Sağ yan pozisyonda antrum kesit alanı ölçümü (Perlas 0–2)', route: 'Ultraschall', maxDose: 'Flüssigkeit > 1,5 ml/kg oder Feststoffe = Magen voll', maxDose_tr: 'Sıvı > 1,5 ml/kg veya katı gıda = Dolu mide', limits: 'Grad 2 = Hohes Aspirationsrisiko', limits_tr: 'Evre 2 = Yüksek aspirasyon riski' },
          { drug: 'Narkoseeinleitung bei vollem Magen', drug_tr: 'Dolu Midede Anestezi İndüksiyonu', dose: 'RSI mit Videolaryngoskop + Magensonde nach Intubation', dose_tr: 'Videolaringoskop ile RSI + entübasyon sonrası nazogastrik sonda', route: 'i.v.', maxDose: 'Rocuronium 1,0–1,2 mg/kg oder Succinylcholin 1,0 mg/kg', maxDose_tr: 'Roküronyum 1,0–1,2 mg/kg veya Süksinilkolin 1,0 mg/kg', limits: 'Keine Zwischenbeatmung!', limits_tr: 'Ara maske ventilasyonu yapılmaz!' }
        ],
        koPitfalls: [
          { mistake: 'Annahme, 6 Stunden Nüchternheit reichten bei Semaglutid aus', mistake_tr: 'Semaglutid kullanan hastada 6 saatlik açlığın yeterli olduğunu varsaymak', whyFatal: 'GLP-1-Agonisten führen zu stark verzögerter Magenmotilität; Patienten aspirieren trotz 10 Stunden Nüchternheit massive Feststoffmengen (Mendelson-Syndrom)!', whyFatal_tr: 'GLP-1 agonistleri mide boşalmasını ciddi şekilde geciktirir; hastalar 10 saatlik açlığa rağmen masif katı mide içeriği aspire edebilir (Mendelson sendromu)!', correctAction: 'Immer nach GLP-1 fragen, Magen-Sonographie durchführen und bei Unklarheit RSI indizieren.', correctAction_tr: 'Her zaman GLP-1 kullanımını sorgulayın, mide ultrasonu (POCUS) yapın ve şüphede kesin RSI uygulayın.' }
        ]
      };
    }

    // SGLT2-Inhibitoren & Euglykämische Ketoazidose (euDKA)
    if (text.includes('sglt2') || text.includes('dapagliflozin') || text.includes('empagliflozin') || text.includes('eudka') || text.includes('euglykämische ketoazidose')) {
      return {
        topic: 'SGLT2-Inhibitoren & Euglykämische Ketoazidose (euDKA)',
        topic_tr: 'SGLT2 İnhibitörleri & Normoglisemik/Öglisemik Ketoasidoz (euDKA)',
        firstDrugTR: 'Glukoz-İnsülin İnfüzyonu + Agresif Sıvı Tedavisi',
        guideline: {
          title: 'ESAIC / FDA / EMA Safety Warning & Guidelines on SGLT2-Inhibitor euDKA',
          title_tr: 'SGLT2 İnhibitörü Öglisemik Ketoasidoz (euDKA) ESAIC / FDA / EMA Güvenlik Kılavuzu',
          society: 'ESAIC & DGAI Empfehlungen Perioperativer Diabetes',
          awmf: 'ESAIC Guideline Perioperative Glycemic Management',
          year: '2023',
          recommendation: 'SGLT2-Inhibitoren (Empagliflozin, Dapagliflozin) 3 Tage vor elektiven Operationen pausieren. Bei perioperativer metabolischer Azidose mit normalem Blutzucker IMMER an euDKA denken: BGA (Anionenlücke), Blutketone messen, Glukose-Insulin-Perfusor starten.',
          recommendation_tr: 'SGLT2 inhibitörleri elektif ameliyattan 3 gün önce kesilmelidir. Normal kan şekeri varlığında derin metabolik asidoz gelişirse öglisemik DKA düşünülmeli, keton ölçülmeli ve insülin-glukoz infüzyonu başlanmalıdır.'
        },
        dosages: [
          { drug: 'Präoperatives Absetzen', drug_tr: 'Preoperatif İlaç Kesimi', dose: 'Mindestens 72 Stunden (3 Tage) vor Op-Tag', dose_tr: 'Ameliyat gününden en az 72 saat (3 gün) önce kesilmelidir', route: 'p.o.', maxDose: 'Notfall-OP: Perioperatives Keton-Monitoring obligat', maxDose_tr: 'Acil ameliyatlarda perioperatif keton takibi zorunludur', limits: 'Forxiga, Jardiance', limits_tr: 'Forxiga (Dapagliflozin), Jardiance (Empagliflozin)' },
          { drug: 'Therapie der euDKA', drug_tr: 'euDKA Nedensel Tedavisi', dose: 'Insulin i.v. (0,05–0,1 IE/kg/h) + Glukose 10% (100–150 ml/h)', dose_tr: 'İnsülin i.v. (0,05–0,1 IU/kg/saat) + %10 Glukoz (100–150 ml/saat)', route: 'i.v.', maxDose: 'Stoppt Ketogenese ohne Hypoglykämie zu induzieren', maxDose_tr: 'Hipoglisemiye yol açmadan ketogenezi baskılar', limits: 'Kalium engmaschig kontrollieren!', limits_tr: 'Potasyum (K⁺) yakından takip edilmelidir!' },
          { drug: 'Volumensubstitution', drug_tr: 'Volüm Replasmanı', dose: 'Vollelektrolytlösung 1.000–2.000 ml i.v.', dose_tr: 'Dengeli tam elektrolit solüsyonu 1.000–2.000 ml i.v.', route: 'i.v.', maxDose: 'Korrektur des osmotischen Flüssigkeitsdefizits', maxDose_tr: 'Osmotik diüreze bağlı sıvı açığının kapatılması', limits: 'Keine HES', limits_tr: 'HES (kolloid) kullanılmaz' }
        ],
        koPitfalls: [
          { mistake: 'Ausschluss einer Ketoazidose wegen normalem Blutzucker (< 200 mg/dl)', mistake_tr: 'Kan şekeri normal (< 200 mg/dl) olduğu için ketoasidozu dışlamak', whyFatal: 'SGLT2-Hemmer führen über renale Glukoseausscheidung zu normalen Glukosewerten trotz lebensbedrohlicher Ketoazidose!', whyFatal_tr: 'SGLT2 inhibitörleri renal glukozüri yoluyla hayatı tehdit eden ketoasidoza rağmen kan şekerini normal tutar!', correctAction: 'BGA-Anionenlücke berechnen und Serum-Ketonkörper (Beta-Hydroxybutyrat) bestimmen.', correctAction_tr: 'Kan gazında anyon açığını hesaplayın ve kanda keton cisimciklerini (Beta-hidroksibütirat) ölçün.' }
        ]
      };
    }

    // Post-Dural-Puncture-Headache (PDPH) & Epiduraler Blutpatch (EBP)
    if (text.includes('pdph') || text.includes('postpunktioneller') || text.includes('blutpatch') || text.includes('postdural')) {
      return {
        topic: 'Postpunktioneller Kopfschmerz (PDPH) & Epiduraler Blutpatch',
        topic_tr: 'Postdural Ponksiyon Baş Ağrısı (PDPH) & Epidural Kan Yaması (EBP)',
        firstDrugTR: 'Epidural Kan Yaması (EBP) (15-20 ml otolog kan)',
        guideline: {
          title: 'S1-Leitlinie Diagnostik und Therapie des postpunktionellen Kopfschmerzes',
          title_tr: 'Postpunksiyonel Baş Ağrısı (PDPH) Tanı ve Tedavisi S1 Kılavuzu',
          society: 'DGAI / BDA / DGN',
          awmf: 'AWMF-Registernummer 030-113',
          year: '2023',
          recommendation: 'Konservativer Versuch (Flüssigkeit, Paracetamol, Koffein) maximal 24–48h. Bei persistierendem ortostatischer Kopfschmerz ist der autologe epidurale Blutpatch (EBP) Goldstandard (85-90% Erfolgsrate).',
          recommendation_tr: 'Konservatif tedavi en fazla 24-48 saat denenir. Devam eden ortostatik baş ağrısında altın standart otolog epidural kan yamasıdır (EBP, %85-90 başarı).'
        },
        dosages: [
          { drug: 'Autologer Epiduraler Blutpatch (EBP)', drug_tr: 'Otolog Epidural Kan Yaması (EBP)', dose: '15–20 ml patienteneigenes Venenblut (steril abgenommen)', dose_tr: '15–20 ml hastanın kendi venöz kanı (tam steril şartlarda alınmış)', route: 'epidural', maxDose: 'Injektion stoppen bei Druckgefühl im Rücken/Beinen', maxDose_tr: 'Sırtta veya bacaklarda basınç/ağrı hissedildiğinde enjeksiyonu durdur', limits: 'Strikte Asepsis; Kontraindikation: Lokale Infektion, Sepsis, Gerinnungsstörung', limits_tr: 'Mutlak asepsi; Kontrendikasyon: Lokal enfeksiyon, sepsis, koagülopati' },
          { drug: 'Koffein i.v. / p.o.', drug_tr: 'Kafein i.v. / p.o.', dose: 'Koffein 200–300 mg p.o. / Koffeincitrat i.v.', dose_tr: 'Kafein 200–300 mg p.o. veya Kafein sitrat i.v.', route: 'p.o. / i.v.', maxDose: 'Zerebrale Vasokonstriktion mildert Liquorunterdruck', maxDose_tr: 'Serebral vazokonstriksiyon ile BOS düşük basıncı semptomlarını hafifletir', limits: 'Nur vorübergehende Symptomlinderung', limits_tr: 'Yalnızca geçici semptomatik rahatlama sağlar' }
        ],
        koPitfalls: [
          { mistake: 'Verkennen von Red Flags (Fieber, Nackensteife, fokal-neurologische Ausfälle)', mistake_tr: 'Kırmızı Bayrak (Red Flags: Ateş, ense sertliği, fokal nörolojik defisit) bulgularını gözden kaçırmak', whyFatal: 'Es droht eine Verwechslung von PDPH mit epiduralem Hämatom, Abszess oder Meningitis mit irreversibler Lähmung!', whyFatal_tr: 'PDPH nin epidural hematom, apse veya menenjit ile karıştırılması kalıcı parapleji veya ölüme yol açar!', correctAction: 'Bei neurologischen Defiziten oder Fieber sofortiges Notfall-MRT der Wirbelsäule.', correctAction_tr: 'Nörolojik defisit veya ateş varlığında derhal acil spinal MRG çekilmelidir.' }
        ]
      };
    }

    // Lokalanästhetika-Intoxikation (LAST)
    if (/\b(last|intralipid|lipidemulsion)\b/i.test(text) || (text.includes('lokalanästhetik') && (text.includes('intoxikation') || text.includes('toxizität') || text.includes('krampfanfall') || text.includes('überdosierung')))) {
      return {
        topic: 'Lokalanästhetika-Intoxikation (LAST)',
        topic_tr: 'Lokal Anestezik Sistemik Toksisitesi (LAST)',
        firstDrugTR: 'Lipid Emülsiyonu %20 (İntralipid) (1,5 ml/kg i.v. bolus 1 dakikada)',
        guideline: {
          title: 'DGAI-Handlungsempfehlung: Systemische Toxizität von Lokalanästhetika (LAST)',
          title_tr: 'Lokal Anestezik Sistemik Toksisitesi (LAST) DGAI Uygulama Kılavuzu',
          society: 'DGAI / BDA / ESAIC / ASRA-Standard',
          awmf: 'DGAI SOP Lokalanästhetika-Intoxikation',
          year: '2023',
          recommendation: 'Injektion sofort stoppen, Hilfe rufen, Atemweg sichern (100% O2 zur Azidosevermeidung), Krampfanfall mit Benzodiazepin/Propofol kupieren, frühzeitige Lipid-Rettung (Lipid 20%).',
          recommendation_tr: 'Enjeksiyonu derhal durdur, yardım çağır, havayolunu emniyete al (asidozu önlemek için %100 O2), nöbeti benzodiazepin/propofol ile sonlandır, erken lipid kurtarma tedavisi (%20 İntralipid).'
        },
        dosages: [
          { drug: 'Lipidemulsion 20% (Intralipid)', drug_tr: '%20 Lipid Emülsiyonu (İntralipid)', dose: '1,5 ml/kg i.v. Bolus über 1 min (~100 ml bei 70 kg)', dose_tr: '1 dk içinde 1,5 ml/kg i.v. bolus (70 kg hastada ~100 ml)', route: 'i.v.', maxDose: 'Bolus max. 2x wdh. alle 5 min, anschl. 0,25–0,5 ml/kg/min; Max: 10–12 ml/kg', maxDose_tr: 'Bolus 5 dk arayla maks. 2 kez tekrarlanabilir, ardından 0,25–0,5 ml/kg/dk infüzyon; Maks: 10–12 ml/kg', limits: 'Propofol ist KEIN Lipidersatz!', limits_tr: 'Propofol KESİNLİKLE lipid emülsiyonu yerine geçmez!' },
          { drug: 'Adrenalin (bei Reanimation/Kollaps)', drug_tr: 'Adrenalin (KPR / Kollaps durumunda)', dose: 'Niedrig dosiert: 10–50 µg i.v. Boli (≤ 1 µg/kg)', dose_tr: 'Düşük dozda: 10–50 µg i.v. bolus (≤ 1 µg/kg)', route: 'i.v.', maxDose: 'KEINE Standard-1-mg-Boli (Arrhythmiegefahr & Lungenödem!)', maxDose_tr: 'Standart 1 mg bolus YAPILMAZ (Ağır aritmi ve akciğer ödemi tehlikesi!)', limits: 'Vasopressin, Ca-Blocker und Lidocain KONTRAINDIZIERT', limits_tr: 'Vazopressin, Kalsiyum kanal blokerleri ve Lidokain KONTRENDİKEDİR' },
          { drug: 'Krampfkupierung', drug_tr: 'Konvülziyon (Nöbet) Kontrolü', dose: 'Midazolam 0,05–0,1 mg/kg i.v.', dose_tr: 'Midazolam 0,05–0,1 mg/kg i.v.', route: 'i.v.', maxDose: 'Propofol nur niedrig dosiert bei stabilen Kreislaufverhältnissen', maxDose_tr: 'Propofol yalnızca dolaşım stabilse düşük dozda kullanılabilir', limits: 'Azidose drastisch verschlechtert LAST', limits_tr: 'Asidoz ve hipoksi LAST tablosunu dramatik şekilde ağırlaştırır' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Lidocain oder anderen Antiarrhythmika der Klasse I', mistake_tr: 'Lidokain veya diğer Sınıf I antiaritmiklerin verilmesi', whyFatal: 'Addiert zusätzliche Natriumkanal-Blockade und führt zu irreversiblem Asystolie-Kreislaufstillstand!', whyFatal_tr: 'Ek sodyum kanal blokajı yaratarak geri dönüşümsüz asistoli ve kardiyak arreste yol açar!', correctAction: 'Ausschließlich Lipid 20%, Amiodaron bei ventrikulären Rhythmusstörungen, Reanimation nach modifiziertem ALS.', correctAction_tr: 'Yalnızca %20 Lipid emülsiyonu, ventriküler aritmilerde Amiodaron ve modifiye ALS ile uzamış KPR uygulanır.' },
          { mistake: 'Standard-Adrenalin-Bolus von 1 mg i.v.', mistake_tr: 'Standart 1 mg i.v. Adrenalin bolusu uygulanması', whyFatal: 'Erhöht den myokardialen Sauerstoffverbrauch und triggert therapierefraktäre Kammerrhythmusstörungen.', whyFatal_tr: 'Miyokardiyal oksijen tüketimini artırır, lipid resüsitasyonunu bozar ve dirençli ventriküler aritmilere neden olur.', correctAction: 'Adrenalin streng titriert in Mini-Boli (< 1 µg/kg, d.h. 10–50 µg).', correctAction_tr: 'Adrenalin mutlaka düşük mini-boluslar (< 1 µg/kg, yani 10–50 µg) halinde titre edilmelidir.' }
        ]
      };
    }

    // Schwieriger Atemweg / CICO / eFONA
    if (text.includes('cico') || text.includes('cannot intubate') || text.includes('koniotomie') || text.includes('efona') || text.includes('schwieriger atemweg') || text.includes('videolaryngoskop') || (text.includes('atemweg') && text.includes('notfall'))) {
      return {
        topic: 'Atemwegsmanagement & Can-Not-Intubate-Can-Not-Oxygenate (CICO)',
        topic_tr: 'Havayolu Yönetimi & Entübe Edilemiyor-Oksijenlenemiyor (CICO)',
        firstDrugTR: 'Sugammadex (Roküronyumda CICO kurtarma için 16 mg/kg i.v. ani bolus)',
        guideline: {
          title: 'S1-Leitlinie Atemwegsmanagement (Präoperativ, Notfall, CICO)',
          title_tr: 'Havayolu Yönetimi S1 Kılavuzu (Preoperatif, Acil, CICO)',
          society: 'DGAI / BDA Arbeitskreis Atemwegsmanagement',
          awmf: 'AWMF-Registernummer 001-028',
          year: '2023',
          recommendation: 'Strikter DGAI 4-Stufen-Plan: Plan A (Maske & Videolaryngoskopie, max. 3 Versuche), Plan B (Supraglottischer Atemweg / Larynxmaske 2. Generation), Plan C (Aufwachen lassen / Beutel-Maske), Plan D (eFONA: Skalpell-Bougie-Tubus).',
          recommendation_tr: 'Katı DGAI 4 basamaklı planı: Plan A (Maske & Videolaringoskopi, en fazla 3 deneme), Plan B (Supraglottik havayolu / 2. nesil LMA), Plan C (Uyandırma / Balon-Maske), Plan D (eFONA: Skalpel-Buji-Tüp).'
        },
        dosages: [
          { drug: 'Sugammadex (CICO-Rescue bei Rocuronium)', drug_tr: 'Sugammadex (Roküronyumda CICO Kurtarma)', dose: '16 mg/kg i.v. Notfall-Sofortbolus', dose_tr: '16 mg/kg i.v. acil ani bolus', route: 'i.v.', maxDose: 'Vollständige Aufhebung der neuromuskulären Blockade in < 3 min', maxDose_tr: '< 3 dakikada nöromüsküler blokajın tam geri döndürülmesi', limits: 'Funktioniert nur bei Rocuronium/Vecuronium', limits_tr: 'Yalnızca Roküronyum/Veküronyum blokajında etkilidir' },
          { drug: 'eFONA (Emergency Front of Neck Airway)', drug_tr: 'eFONA (Acil Cerrahi Koniotomi)', dose: 'Skalpell Nr. 10 (horizontaler Schnitt) + Bougie + Ch. 6.0 Tubus', dose_tr: 'No. 10 Bistüri (yatay kesi) + Buji + İç çapı 6.0 mm kaflı tüp', route: 'Koniotomie', maxDose: 'Keine Nadelpunktion bei Erwachsenen (Versagerquote > 60%)', maxDose_tr: 'Yetişkinde iğne koniotomisi önerilmez (başarısızlık oranı > %60)', limits: 'Durchführung bei SpO₂-Abfall < 80% im CICO', limits_tr: 'CICO tablosunda SpO₂ < %80 altına düşerken derhal uygulanır' },
          { drug: 'Sauerstoff-Insufflation', drug_tr: 'Oksijen İnsüflasyonu', dose: '100% FiO2 High-Flow (bis 60 l/min)', dose_tr: '%100 FiO₂ Yüksek Akım (60 l/dk ya kadar)', route: 'Nasal / Maske', maxDose: 'Apnoische Oxygenierung während Intubationsversuchen', maxDose_tr: 'Entübasyon denemeleri sırasında apneik oksijenasyon sağlar', limits: 'Voroxygenierung mit EtO2 > 90%', limits_tr: 'EtO₂ > %90 olana dek preoksijenasyon' }
        ],
        koPitfalls: [
          { mistake: 'Mehr als 3 Intubationsversuche ohne Verfahrenswechsel', mistake_tr: 'Yöntem değiştirmeden 3 ten fazla entübasyon denemesi yapmak', whyFatal: 'Verursacht Schwellung, Blutung und konvertiert eine "Can-Ventilate"-Situation in ein tödliches CICO!', whyFatal_tr: 'Larenkste ödem ve kanamaya yol açarak "havalandırılabilir" hastayı ölümcül CICO tablosuna dönüştürür!', correctAction: 'Maximal 3 Versuche (nur 1 mit direkter Laryngoskopie, sofortiger Wechsel auf Videolaryngoskop & Plan B Larynxmaske).', correctAction_tr: 'Maksimum 3 deneme (direkt laringoskopi ile en fazla 1 deneme, derhal videolaringoskop ve Plan B LMA ya geçiş).' },
          { mistake: 'Zögern bei der chirurgischen Koniotomie (eFONA) im CICO-Fall', mistake_tr: 'CICO durumunda cerrahi koniotomi (eFONA) için tereddüt etmek', whyFatal: 'Führt zu hypoxischem Hirnschaden und Herzkreislaufstillstand innerhalb von 3-4 Minuten.', whyFatal_tr: '3–4 dakika içinde hipoksik beyin hasarı ve kardiyak arreste yol açar.', correctAction: 'Sofortige Ansage: "CICO-Notfall - Koniotomie-Besteck öffnen!" Skalpell-Bougie-Tubus-Technik.', correctAction_tr: 'Net komut: "CICO acil durumu – Koniotomi setini açın!" Bistüri-Buji-Tüp tekniği uygulanır.' }
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
          title_tr: 'Kardiyak Riskli Hastaların Perioperatif Yönetimi DGAI / ESC Kılavuzu',
          society: 'DGAI / BDA / ESC / ESAIC',
          awmf: 'AWMF-Registernummer 001-016',
          year: '2023',
          recommendation: 'Hämodynamische Trias: SVR hoch-normal, Sinusrhythmus 60–80/min, Vorlast hoch-normal. Invasive Blutdruckmessung vor Narkoseeinleitung.',
          recommendation_tr: 'Hemodinamik Triad: SVR yüksek-normal, Sinüs ritmi 60–80/dk, Ön yük yüksek-normal. Anestezi indüksiyonundan önce invaziv arteriyel kan basıncı ölçümü şarttır.'
        },
        dosages: [
          { drug: 'Noradrenalin (Vasopressor der 1. Wahl)', drug_tr: 'Noradrenalin (1. Tercih Vazopressör)', dose: '2–10 µg i.v. Boli oder 0,02–0,2 µg/kg/min Perfusor', dose_tr: '2–10 µg i.v. bolus veya 0,02–0,2 µg/kg/dk perfüzör', route: 'i.v.', maxDose: 'Ziel-MAP ≥ 75–80 mmHg', maxDose_tr: 'Hedef MAP ≥ 75–80 mmHg', limits: 'Periphere Vasokonstriktion sichert Koronardurchblutung', limits_tr: 'Periferik vazokonstriksiyon koroner perfüzyonu güvenceye alır' },
          { drug: 'Phenylephrin (reiner Alpha-1-Agonist)', drug_tr: 'Fenilefrin (Saf Alfa-1 Agonisti)', dose: '50–100 µg i.v. Boli', dose_tr: '50–100 µg i.v. bolus', route: 'i.v.', maxDose: 'Reflexbradykardie beachten', maxDose_tr: 'Refleks bradikardiye dikkat edilmeli', limits: 'Günstig bei Tachyarrhythmie', limits_tr: 'Taşiaritmi varlığında tercih edilir' },
          { drug: 'Volumenbelastung (Vorlastsicherung)', drug_tr: 'Volüm Yüklemesi (Ön Yükün Korunması)', dose: 'Vollelektrolytlösung 250–500 ml Boli', dose_tr: 'Dengeli tam elektrolit solüsyonu 250–500 ml bolus', route: 'i.v.', maxDose: 'Hypovolämie führt sofort zum Kreislaufzusammenbruch', maxDose_tr: 'Hipovolemi derhal dolaşım kollapsına yol açar', limits: 'Starrer hypertrophierter Ventrikel braucht Füllungsdruck', limits_tr: 'Sert hipertrofik ventrikül yüksek dolum basıncına ihtiyaç duyar' }
        ],
        koPitfalls: [
          { mistake: 'Durchführung einer Spinalanästhesie (SPA)', mistake_tr: 'Spinal anestezi (SPA) uygulanması', whyFatal: 'Die akute Sympathikolyse führt zum SVR-Kollaps. Da das Schlagvolumen über der fixierten Stenose nicht steigen kann, bricht die Koronarperfusion zusammen -> Asystolie!', whyFatal_tr: 'Akut sempatikoliz SVR kollapsına yol açar; sabit darlık nedeniyle atım hacmi artamayacağından koroner perfüzyon çöker -> Asistoli!', correctAction: 'Spinalanästhesie ist absolut KONTRAINDIZIERT. Schonende Allgemeinanästhesie mit Etomidat/Sufentanil oder vorsichtige, langsam aufdosierte Epiduralanästhesie.', correctAction_tr: 'Spinal anestezi KESİNLİKLE KONTRENDİKEDİR. İnvaziv arter monitörizasyonu altında Etomidat/Sufentanil ile nazik genel anestezi uygulanır.' },
          { mistake: 'Tolerieren von Tachykardie (> 90/min)', mistake_tr: 'Taşikardiye (> 90/dk) izin verilmesi', whyFatal: 'Verkürzt die Diastolendauer drastisch und erzeugt tödliche Myokardischämie des hypertrophierten linken Ventrikels.', whyFatal_tr: 'Diyastol süresini kısaltarak hipertrofik sol ventrikülde ölümcül subendokardiyal miyokard iskemisine yol açar.', correctAction: 'Sinusrhythmus strikt bei 60–80/min halten. Tachyarrhythmie sofort kardiovertieren.', correctAction_tr: 'Sinüs ritmi sıkı şekilde 60–80/dk arasında tutulmalı, yeni taşiaritmi derhal kardiyoverte edilmelidir.' }
        ]
      };
    }

    // Anaphylaxie & Schock
    if (text.includes('anaphylax') || text.includes('allergischer schock') || (text.includes('allergie') && (text.includes('schock') || text.includes('reaktion') || text.includes('grad ii') || text.includes('grad iii') || text.includes('mastzell'))) || text.includes('bronchospasmus') || text.includes('tryptase')) {
      return {
        topic: 'Perioperative Anaphylaxie',
        topic_tr: 'Perioperatif Anafilaksi ve Şok',
        firstDrugTR: 'Adrenalin (0,5 mg i.m. veya 10-50 µg i.v. titre)',
        guideline: {
          title: 'S2k-Leitlinie Akuttherapie und Management anaphylaktischer Reaktionen',
          title_tr: 'Anafilaktik Reaksiyonların Akut Tedavisi ve Yönetimi S2k Kılavuzu',
          society: 'DGAI / BDA / DGAKI / AWMF',
          awmf: 'AWMF-Registernummer 061-025',
          year: '2023',
          recommendation: 'Sofortiges Absetzen aller verdächtigen Substanzen, 100% O2, Adrenalin als Medikament der 1. Wahl, massive Volumentherapie mit kristalloiden Lösungen.',
          recommendation_tr: 'Tüm şüpheli ajanların derhal kesilmesi, %100 O2, ilk tercih olarak derhal Adrenalin, kristalloid solüsyonlarla agresif volüm replasmanı.'
        },
        dosages: [
          { drug: 'Adrenalin i.m. (Grad II–III, Spontanatmung)', drug_tr: 'Adrenalin i.m. (Evre II–III, Spontan Solunum)', dose: '0,5 mg i.m. (ungestreckt 1:1000)', dose_tr: '0,5 mg i.m. (sulandırılmamış 1:1000)', route: 'i.m. M. vastus lat.', maxDose: 'Wiederholung alle 5–10 min bei Persistenz', maxDose_tr: 'Semptomlar sürerse 5–10 dakikada bir tekrarlanır', limits: 'Schnellste Resorption und sicherster Weg', limits_tr: 'En hızlı emilim ve en güvenli uygulama yolu' },
          { drug: 'Adrenalin i.v. titriert (Narkose / Kreislaufkollaps)', drug_tr: 'Adrenalin i.v. titre (Anestezi / Dolaşım Kollapsı)', dose: '10–50 µg i.v. Boli (1:10.000 oder 1:100.000 verdünnt)', dose_tr: '10–50 µg i.v. bolus (1:10.000 veya 1:100.000 seyreltilmiş)', route: 'i.v.', maxDose: 'Perfusor 0,05–0,5 µg/kg/min nach Ansprechen', maxDose_tr: 'Yanıt sonrası perfüzör 0,05–0,5 µg/kg/dk', limits: 'Nur verdünnt titrieren bei liegendem Monitoring', limits_tr: 'Yalnızca monitörize hastada seyreltilerek titre edilmelidir' },
          { drug: 'Kristalloide Infusion', drug_tr: 'Kristalloid İnfüzyon', dose: 'Vollelektrolytlösung 1000–2000 ml Druckinfusion', dose_tr: 'Dengeli tam elektrolit solüsyonu 1000–2000 ml basınçlı infüzyon', route: 'i.v.', maxDose: 'Bis zu 30–50 ml/kg in der ersten Stunde', maxDose_tr: 'İlk 1 saatte 30–50 ml/kg a kadar', limits: 'Kompensiert kapilläres Leck & Vasodilatation', limits_tr: 'Kapiller kaçak ve vazodilatasyonu dengeler' },
          { drug: 'Zweitlinien-Therapie (erst nach Adrenalin)', drug_tr: 'İkinci Basamak Tedavi (Yalnızca Adrenalinden Sonra)', dose: 'Dimetinden 0,1 mg/kg + Prednisolon 250–500 mg i.v.', dose_tr: 'Dimetinden 0,1 mg/kg + Prednizolon 250–500 mg i.v.', route: 'i.v.', maxDose: 'Wirkeintritt erst nach 20–30 min', maxDose_tr: 'Etki başlangıcı ancak 20–30 dakika sonradır', limits: 'Verzögern Sie NIEMALS die Adrenalingabe dafür!', limits_tr: 'Bunun için Adrenalin uygulamasını ASLA geciktirmeyin!' }
        ],
        koPitfalls: [
          { mistake: 'Zuwarten mit Adrenalin und primäre Gabe von Kortison oder Antihistaminika', mistake_tr: 'Adrenalini geciktirip öncelikle kortizon veya antihistaminik verilmesi', whyFatal: 'Kortikoide und Antihistaminika stoppen den akuten Kreislaufkollaps und Bronchospasmus NICHT! Der Patient stirbt im Asphyxie-Schock.', whyFatal_tr: 'Kortikosteroidler ve antihistaminikler akut dolaşım kollapsını ve bronkospazmı DURDURMAZ! Hasta asfiksi ve şoktan kaybedilir.', correctAction: 'Adrenalin ist das EINZIGE lebensrettende Kausaltherapeutikum und MUSS sofort gegeben werden.', correctAction_tr: 'Adrenalin hayat kurtaran TEK nedensel tedavidir ve derhal uygulanmalıdır.' }
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
          title_tr: 'Sepsis – Önleme, Tanı, Tedavi ve İzlem S3 Kılavuzu',
          society: 'DGAI / DIVI / DSG / AWMF',
          awmf: 'AWMF-Registernummer 079-001',
          year: '2023',
          recommendation: 'Surviving Sepsis 1-Hour-Bundle: Blutkulturen VOR Antibiose, kalkulierte Breitspektrumantibiose innerhalb 60 min, 30 ml/kg Kristalloide, Noradrenalin Ziel-MAP ≥ 65 mmHg, Laktat-Clearance.',
          recommendation_tr: 'Surviving Sepsis 1 Saat Paketi: Antibiyotikten ÖNCE kan kültürü, 60 dk içinde geniş spektrumlu antibiyotik, 30 ml/kg kristalloid, hedef MAP ≥ 65 mmHg için Noradrenalin, laktat klirensi.'
        },
        dosages: [
          { drug: 'Noradrenalin (Vasopressor 1. Wahl)', drug_tr: 'Noradrenalin (1. Tercih Vazopressör)', dose: '0,05–0,5 µg/kg/min titriert', dose_tr: '0,05–0,5 µg/kg/dk titre edilerek', route: 'i.v. (ZVK / Perfusor)', maxDose: 'Ziel-MAP ≥ 65 mmHg (bei chronischer Hypertonie 70–75 mmHg)', maxDose_tr: 'Hedef MAP ≥ 65 mmHg (kronik hipertansiyonda 70–75 mmHg)', limits: 'Frühzeitig parallel zur Volumengabe starten', limits_tr: 'Sıvı resüsitasyonuna paralel olarak erken dönemde başlanır' },
          { drug: 'Vasopressin (Argipressin / Second-Line)', drug_tr: 'Vazopressin (Argipressin / İkinci Basamak)', dose: '0,03 IE/min fixer Perfusor', dose_tr: '0,03 IU/dk sabit hızlı perfüzör', route: 'i.v.', maxDose: 'Keine Dosissteigerung > 0,04 IE/min', maxDose_tr: 'Doz > 0,04 IU/dk üzerine çıkarılmaz (iskemi riski)', limits: 'Additiv bei hohem Noradrenalin-Bedarf', limits_tr: 'Yüksek Noradrenalin ihtiyacında ek (additif) olarak başlanır' },
          { drug: 'Kristalloide Flüssigkeitstherapie', drug_tr: 'Kristalloid Sıvı Tedavisi', dose: '30 ml/kg balancierte Vollelektrolyte in 3h', dose_tr: 'İlk 3 saatte 30 ml/kg dengeli tam elektrolit solüsyonu', route: 'i.v.', maxDose: 'Dynamische Parameter (SVV/PPV) zur Steuerung nutzen', maxDose_tr: 'Yönetimde dinamik parametreler (SVV/PPV, PLR) kullanılır', limits: 'Überwässerung und Lungenödem vermeiden', limits_tr: 'Aşırı sıvı yüklenmesi ve akciğer ödeminden kaçınılmalıdır' }
        ],
        koPitfalls: [
          { mistake: 'Verzögerung der kalkulierten Antibiose (> 1 Stunde nach Diagnosestellung)', mistake_tr: 'Ampirik antibiyotik tedavisinin geciktirilmesi (tanıdan > 1 saat sonra)', whyFatal: 'Jede Stunde Verzögerung erhöht die Letalität im septischen Schock um bis zu 7%!', whyFatal_tr: 'Septik şokta antibiyotikteki her 1 saatlik gecikme mortaliteyi yaklaşık %7 artırır!', correctAction: 'Breitspektrum-Antibiotikum innerhalb von 60 Minuten infundieren (nach zügiger Blutkulturentnahme).', correctAction_tr: 'Geniş spektrumlu antibiyotik (hızlı kan kültürü alındıktan hemen sonra) 60 dakika içinde infüze edilmelidir.' }
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
          title_tr: 'Peripartum Kanamalar (PPH) Tanı ve Tedavisi S2k Kılavuzu',
          society: 'DGAI / DGGG / OEGGG / SGGG',
          awmf: 'AWMF-Registernummer 015-063',
          year: '2023',
          recommendation: 'Stufenweises Vorgehen (4T: Tonus, Trauma, Tissue, Thrombin). Uterotonika, Tranexamsäure frühzeitig, Fibrinogen Ziel ≥ 2 g/l, Bakri-Ballon / chirurgische Kompression.',
          recommendation_tr: 'Basamaklı yaklaşım (4T: Tonus, Travma, Doku, Trombin). Uterotonikler, erken Traneksamik asit, hedef Fibrinojen ≥ 2 g/l, Bakri balonu / cerrahi kompresyon.'
        },
        dosages: [
          { drug: 'Oxytocin (Syntocinon)', drug_tr: 'Oksitosin (Syntocinon)', dose: '3–5 IE langsam i.v. über 1–2 min, dann Perfusor 10–20 IE in 500 ml', dose_tr: '1–2 dk içinde 3–5 IU yavaş i.v., ardından 500 ml içinde 10–20 IU infüzyon', route: 'i.v.', maxDose: 'KEIN schneller Bolus (Hypotonie & Tachykardie!)', maxDose_tr: 'Hızlı i.v. bolus YAPILMAZ (Ağır hipotansiyon ve taşikardi!)', limits: '1. Wahl bei Uterusatonie', limits_tr: 'Uterus atonisinde 1. tercih ilaç' },
          { drug: 'Sulproston (Nalador / Prostaglandin E2)', drug_tr: 'Sulproston (Nalador / Prostaglandin E2)', dose: '500 µg in 500 ml NaCl (initial 100–500 µg/h)', dose_tr: '500 ml NaCl içinde 500 µg (başlangıç 100–500 µg/saat)', route: 'i.v. Perfusor', maxDose: 'Max. 500 µg in 4 Stunden / 1500 µg in 24h', maxDose_tr: '4 saatte maks. 500 µg / 24 saatte maks. 1500 µg', limits: 'Kontraindikation: schweres Asthma bronchiale!', limits_tr: 'Kontrendikasyon: Ağır bronşiyal astım!' },
          { drug: 'Tranexamsäure (TXA)', drug_tr: 'Traneksamik Asit (TXA)', dose: '1 g i.v. Kurzinfusion (100 ml über 10 min)', dose_tr: '1 g i.v. kısa infüzyon (100 ml içinde 10 dakikada)', route: 'i.v.', maxDose: 'Wiederholung von 1 g nach 30 min bei fortbestehender Blutung', maxDose_tr: 'Kanama devam ederse 30 dk sonra 1 g tekrarlanır', limits: 'Gabe MUSS innerhalb von 3 Stunden nach Geburt erfolgen', limits_tr: 'Doğumdan sonraki ilk 3 saat içinde verilmelidir' },
          { drug: 'Fibrinogen-Konzentrat', drug_tr: 'Fibrinojen Konsantresi', dose: '2–4 g i.v. nach ROTEM (FIBTEM A10 < 10 mm)', dose_tr: 'ROTEM e göre 2–4 g i.v. (FIBTEM A10 < 10 mm ise)', route: 'i.v.', maxDose: 'Zielwert Fibrinogen ≥ 2 g/l (200 mg/dl)', maxDose_tr: 'Hedef Fibrinojen ≥ 2 g/l (200 mg/dl)', limits: 'Fibrinogen ist der erste verbrauchte Gerinnungsfaktor bei PPH', limits_tr: 'PPH tablosunda ilk tükenen pıhtılaşma faktörü fibrinojendir' }
        ],
        koPitfalls: [
          { mistake: 'Verabreichung von Oxytocin als unverdünnter schneller i.v.-Bolus', mistake_tr: 'Oksitosinin sulandırılmadan hızlı i.v. bolus olarak verilmesi', whyFatal: 'Löst akuten systemischen Gefäßwiderstandsabfall mit schwerer Hypotonie, Koronarspasmen und Kreislaufstillstand aus!', whyFatal_tr: 'Akut sistemik vazodilatasyon ile ağır hipotansiyon, koroner spazm ve kardiyak arreste yol açar!', correctAction: 'Oxytocin streng fraktioniert und langsam über 2 Minuten i.v. verabreichen.', correctAction_tr: 'Oksitosin mutlaka fraksiyone ve en az 2 dakika içinde yavaş i.v. infüzyonla verilmelidir.' },
          { mistake: 'Vergessen der 15–30° Linksseitenkippung bei Schwangeren', mistake_tr: 'Gebede 15–30° sol yan eğimin (Linksseitenkippung) unutulması', whyFatal: 'Aortokavales Kompressionssyndrom mit drastischem Abfall des venösen Rückstroms und fetaler Asphyxie.', whyFatal_tr: 'Aortokaval kompresyon sendromu nedeniyle venöz dönüş dramatik düşer ve fetal asfiksi gelişir.', correctAction: 'Obligate Linksseitenlagerung des Beckens / Keilkissen bis zur Kindsentwicklung.', correctAction_tr: 'Bebek çıkana dek pelvisin 15–30° sola eğilmesi (kama yastık / masa eğimi) zorunludur.' }
        ]
      };
    }

    // Schädel-Hirn-Trauma & Neuroanästhesie (ICP / CPP)
    if (text.includes('schädel-hirn') || text.includes('hirndruck') || /\b(icp|cpp)\b/i.test(text) || text.includes('mannitol') || text.includes('hypertoner nacl') || text.includes('hypertone kochsalz') || text.includes('craniotomie') || text.includes('kraniotomie')) {
      return {
        topic: 'Schädel-Hirn-Trauma & Hirndruckmanagement',
        topic_tr: 'Travmatik Beyin Hasarı & KİBAS Yönetimi',
        firstDrugTR: 'NaCl %3 (2 ml/kg i.v. bolus) veya Mannitol %20 (0,5–1 g/kg)',
        guideline: {
          title: 'DGN / DGAI S2k-Leitlinie Schädel-Hirn-Trauma & Neurotrauma',
          title_tr: 'Travmatik Beyin Hasarı ve Nörotravma DGN / DGAI S2k Kılavuzu',
          society: 'DGAI / DGN / DGNC / Brain Trauma Foundation (BTF)',
          awmf: 'AWMF-Registernummer 008-001',
          year: '2024',
          recommendation: 'Ziel-CPP ≥ 60–70 mmHg (MAP ≥ 80–90 mmHg), ICP < 20–22 mmHg, strikte Normokapnie (PaCO2 35–38 mmHg). Oberkörperhochlage 30°, Osmotherapie mit hypertoner Kochsalzlösung (NaCl 3%) oder Mannitol 20%.',
          recommendation_tr: 'Hedef CPP ≥ 60–70 mmHg (MAP ≥ 80–90 mmHg), ICP < 20–22 mmHg, kesin normokapni (PaCO2 35–38 mmHg). 30° baş yukarı pozisyon, hipertonik NaCl %3 veya Mannitol ile osmotik tedavi.'
        },
        dosages: [
          { drug: 'NaCl 3% hyperton', drug_tr: 'Hipertonik NaCl %3', dose: '2 ml/kg i.v. Kurzinfusion über 15 min (ca. 150 ml)', dose_tr: '15 dk içinde 2 ml/kg i.v. kısa infüzyon (~150 ml)', route: 'i.v. (ZVK bevorzugt)', maxDose: 'Serum-Osmolarität max. 320 mosm/kg, Na max. 155 mmol/l', maxDose_tr: 'Serum osmolaritesi maks. 320 mosm/kg, Na⁺ maks. 155 mmol/l', limits: 'Keine Hypovolämie induzierend', limits_tr: 'Hipovolemiye yol açmadan ICP yi düşürür' },
          { drug: 'Mannitol 20%', drug_tr: 'Mannitol %20', dose: '0,5–1,0 g/kg i.v. über 15–30 min', dose_tr: '15–30 dk içinde 0,5–1,0 g/kg i.v.', route: 'i.v.', maxDose: 'Osmolaritätslücke überwachen (< 10 mosm/kg)', maxDose_tr: 'Osmolarite açığı takip edilmelidir (< 10 mosm/kg)', limits: 'Gefahr der osmotischen Hypovolämie & Nierenversagen', limits_tr: 'Osmotik diüreze bağlı hipovolemi ve böbrek hasarı riski' },
          { drug: 'Noradrenalin (CPP-Sicherung)', drug_tr: 'Noradrenalin (CPP Güvencesi)', dose: '0,05–0,5 µg/kg/min Perfusor', dose_tr: '0,05–0,5 µg/kg/dk perfüzör', route: 'i.v.', maxDose: 'Ziel: MAP ≥ 80–90 mmHg bei ICP 20 mmHg (CPP = MAP - ICP)', maxDose_tr: 'Hedef: ICP 20 mmHg iken MAP ≥ 80–90 mmHg (CPP = MAP − ICP)', limits: 'Permissive Hypotonie STRENG KONTRAINDIZIERT!', limits_tr: 'Permissif hipotansiyon KESİNLİKLE KONTRENDİKEDİR!' }
        ],
        koPitfalls: [
          { mistake: 'Permissive Hypotonie beim Schädel-Hirn-Trauma tolerieren', mistake_tr: 'Travmatik beyin hasarında permissif hipotansiyona izin verilmesi', whyFatal: 'Bricht den zerebralen Perfusionsdruck (CPP < 50 mmHg) zusammen und verursacht irreversible sekundäre ischämische Hirnschäden (K.O.-Kriterium!).', whyFatal_tr: 'Serebral perfüzyon basıncını (CPP < 50 mmHg) çökertir ve geri dönüşümsüz ikincil iskemik beyin hasarına yol açar (K.O. kriteri!).', correctAction: 'Strikte CPP-Führung: MAP durch Noradrenalin und balancierte Kristalloide ≥ 80–90 mmHg halten!', correctAction_tr: 'Sıkı CPP yönetimi: Noradrenalin ve dengeli kristalloidlerle MAP ≥ 80–90 mmHg tutulmalıdır!' },
          { mistake: 'Dauerhafte prophylaktische Hyperventilation (PaCO2 < 30 mmHg)', mistake_tr: 'Sürekli profilaktik hiperventilasyon (PaCO₂ < 30 mmHg) uygulanması', whyFatal: 'Führt über zerebrale Vasokonstriktion zur drastischen Minderperfusion und fokalen Hirninfarkten.', whyFatal_tr: 'Serebral vazokonstriksiyon yoluyla ciddi hipoperfüzyon ve fokal beyin enfarktlarına neden olur.', correctAction: 'Normokapnie (PaCO2 35–38 mmHg) anstreben; milde Hyperventilation (PaCO2 30–35) nur als Notfallüberbrückung bei akuter Herniation.', correctAction_tr: 'Normokapni (PaCO₂ 35–38 mmHg) hedeflenmeli; hafif hiperventilasyon (PaCO₂ 30–35) yalnızca akut herniasyonda köprüleme amacıyla kullanılmalıdır.' }
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
          title_tr: 'Politravma / Ağır Yaralı Tedavisi S3 Kılavuzu & Avrupa Travma Rehberi',
          society: 'DGU / DGAI / DIVI / ESAIC Trauma Taskforce',
          awmf: 'AWMF-Registernummer 187-023',
          year: '2023',
          recommendation: 'Frühzeitige Gabe von Tranexamsäure (TXA 1 g Bolus innerhalb von 3h), zielgerichtete Gerinnungstherapie nach Thrombelastometrie (ROTEM/TEG), Vermeidung der tödlichen Trias (Hypothermie, Azidose, Hypokalzämie).',
          recommendation_tr: 'İlk 3 saatte erken Traneksamik asit (TXA 1 g bolus), ROTEM/TEG rehberliğinde hedefe yönelik faktör konsantresi (Fibrinojen, PCC), ölümcül triadın (hipotermi, asidoz, hipokalsemi) engellenmesi.'
        },
        dosages: [
          { drug: 'Tranexamsäure (TXA)', drug_tr: 'Traneksamik Asit (TXA)', dose: '1 g i.v. Bolus über 10 min, gefolgt von 1 g über 8h', dose_tr: '10 dk içinde 1 g i.v. bolus, ardından 8 saatte 1 g infüzyon', route: 'i.v.', maxDose: 'Gabe MUSS innerhalb von 3 Stunden nach Trauma erfolgen', maxDose_tr: 'Travmadan sonraki ilk 3 saat içinde uygulanmalıdır', limits: 'CRASH-2: Nach > 3h erhöht TXA die Mortalität!', limits_tr: 'CRASH-2: 3 saatten sonra verilen TXA mortaliteyi artırır!' },
          { drug: 'Fibrinogen-Konzentrat', drug_tr: 'Fibrinojen Konsantresi', dose: '2–4 g i.v. bei FIBTEM A10 < 10 mm (bzw. A5 < 9 mm)', dose_tr: 'FIBTEM A10 < 10 mm (veya A5 < 9 mm) ise 2–4 g i.v.', route: 'i.v.', maxDose: 'Ziel: FIBTEM A10 ≥ 10–12 mm (Fibrinogen > 200 mg/dl)', maxDose_tr: 'Hedef: FIBTEM A10 ≥ 10–12 mm (Fibrinojen > 200 mg/dl)', limits: 'Erster verbrauchter Faktor im schweren Schock', limits_tr: 'Ağır şokta ilk tükenen pıhtılaşma faktörüdür' },
          { drug: 'Prothrombinkomplex (PPSB / PCC)', drug_tr: 'Protrombin Kompleks Konsantresi (PPSB / PCC)', dose: '20–30 IE/kg i.v. bei EXTEM CT > 80–100 s', dose_tr: 'EXTEM CT > 80–100 sn ise 20–30 IU/kg i.v.', route: 'i.v.', maxDose: 'Nur bei gesichertem Fibrinogenspiegel applizieren', maxDose_tr: 'Yalnızca yeterli fibrinojen düzeyi sağlandıktan sonra verilir', limits: 'Gefahr von Mikrothromben ohne Fibrinogen-Substrat', limits_tr: 'Fibrinojen substratı olmadan tromboz tehlikesi' },
          { drug: 'Kalziumchlorid 10%', drug_tr: 'Kalsiyum Klorür %10', dose: '10–20 ml i.v. (1–2 g)', dose_tr: '10–20 ml i.v. (1–2 g)', route: 'i.v.', maxDose: 'Ziel: ionisiertes Kalzium > 1,1–1,2 mmol/l', maxDose_tr: 'Hedef: İyonize kalsiyum (Ca²⁺) > 1,1–1,2 mmol/l', limits: 'Citrat-Toxizität durch EK-Transfusionen neutralisieren', limits_tr: 'Kan transfüzyonuna bağlı sitrat toksisitesini nötralize eder' }
        ],
        koPitfalls: [
          { mistake: 'Ungezielte Gabe von FFP (Fresh Frozen Plasma) statt Faktorkonzentraten', mistake_tr: 'Faktör konsantreleri yerine hedef gözetmeden TDP (FFP) verilmesi', whyFatal: 'Verursacht massive Volumenüberladung, Dilutionskoagulopathie und erhöht das Risiko für TACO und TRALI erheblich.', whyFatal_tr: 'Masif volüm yüklenmesi, dilüsyonel koagülopati ve yüksek TACO/TRALI riskine yol açar.', correctAction: 'Zielgerichtete Hämostase mit TXA, Fibrinogen und PCC nach ROTEM/TEG-Algorithmus.', correctAction_tr: 'ROTEM/TEG algoritmasına göre TXA, Fibrinojen ve PCC ile hedefe yönelik hemostaz sağlanmalıdır.' },
          { mistake: 'Missachtung von Hypothermie (< 35°C) und Hypokalzämie (< 1,1 mmol/l)', mistake_tr: 'Hipotermi (< 35°C) ve hipokalseminin (< 1,1 mmol/l) göz ardı edilmesi', whyFatal: 'Gerinnungsenzyme sind temperatur- und kalziumabhängig; unterhalb 35°C versagen alle Gerinnungsfaktoren.', whyFatal_tr: 'Pıhtılaşma enzimleri ısıya ve kalsiyuma bağımlıdır; 35°C altında tüm koagülasyon kaskadı durur.', correctAction: 'Konsequentes Wärmemanagement (Wärmedecken, Fluid-Warmer 41°C) und Kalziumsubstitution nach jedem 2. EK.', correctAction_tr: 'Aktif ısıtma (ısıtıcı battaniye, 41°C sıvı ısıtıcı) ve her 2 ES sonrası kalsiyum replasmanı şarttır.' }
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
          title_tr: 'Acil ve Yoğun Bakımda Elektrolit Bozuklukları ERC / DGAI / DIVI Önerileri',
          society: 'DGAI / ERC / DIVI / DGIM',
          awmf: 'SOP Notfall-Elektrolytmanagement',
          year: '2023',
          recommendation: '3-Säulen-Therapie der Hyperkaliämie: 1. Membranstabilisierung (Kalzium), 2. Shift nach intrazellulär (Glukose-Insulin, Salbutamol, Bikarbonat), 3. Elimination (Dialyse, Kationenaustauscher). TURP: NaCl 3% bei Natrium < 120 mmol/l mit ZNS-Symptomen (max. 8–10 mmol/l/24h).',
          recommendation_tr: 'Hiperkalemide 3 basamak: 1. Membran stabilizasyonu (Kalsiyum), 2. Hücre içine kaydırma (Glukoz-İnsülin, Salbutamol, Bikarbonat), 3. Eliminasyon (Diyaliz). TURP: Sodyum < 120 mmol/l ve nörolojik semptomda %3 NaCl (maks. 8-10 mmol/l/24saat).'
        },
        dosages: [
          { drug: 'Calciumgluconat 10%', drug_tr: 'Kalsiyum Glukonat %10', dose: '10 ml i.v. langsam über 3–5 min (oder CaCl2 10% 5–10 ml über ZVK)', dose_tr: '3–5 dk içinde 10 ml yavaş i.v. (veya SVK dan %10 CaCl₂ 5–10 ml)', route: 'i.v.', maxDose: 'Wiederholung nach 5–10 min bei persistierenden EKG-Zeichen', maxDose_tr: 'EKG bulguları sürerse 5–10 dk sonra tekrarlanır', limits: 'Membranstabilisierung hält nur 30–60 min an; senkt Kalium NICHT!', limits_tr: 'Membran stabilizasyonu yalnızca 30–60 dk sürer; potasyumu DÜŞÜRMEZ!' },
          { drug: 'Glukose 20% + Alt-Insulin', drug_tr: '%20 Glukoz + Regüler İnsülin', dose: '50 ml Glukose 20% + 10 IE Normalinsulin i.v. über 15–30 min', dose_tr: '50 ml %20 Glukoz + 10 IU kristalize insülin 15–30 dk içinde i.v.', route: 'i.v.', maxDose: 'Blutzuckerkontrollen engmaschig alle 30–60 min', maxDose_tr: '30–60 dakikada bir sıkı kan şekeri kontrolü', limits: 'Senkt Serumkalium um ca. 0,5–1,2 mmol/l', limits_tr: 'Serum potasyumunu yaklaşık 0,5–1,2 mmol/l düşürür' },
          { drug: 'Salbutamol (Inhalation / i.v.)', drug_tr: 'Salbutamol (İnhalasyon / i.v.)', dose: '10–20 mg vernebelt oder 0,5 mg i.v. über 15 min', dose_tr: '10–20 mg nebül veya 15 dk içinde 0,5 mg i.v.', route: 'Inhalativ / i.v.', maxDose: 'Beta-2-vermittelte Na-K-ATPase Aktivierung', maxDose_tr: 'Beta-2 aracılı Na⁺/K⁺-ATPaz aktivasyonu sağlar', limits: 'Vorsicht bei schwerer koronarer Herzkrankheit', limits_tr: 'Ağır koroner arter hastalığında taşikardiye dikkat' },
          { drug: 'NaCl 3% hyperton (bei TURP / Na < 120)', drug_tr: 'Hipertonik NaCl %3 (TURP / Na⁺ < 120 mmol/l)', dose: '100 ml i.v. Kurzinfusion über 10–15 min', dose_tr: '10–15 dk içinde 100 ml i.v. kısa infüzyon', route: 'i.v.', maxDose: 'Max. Anstieg 8–10 mmol/l in 24h (Prävention der ODS / Myelinolyse)', maxDose_tr: '24 saatte maks. 8–10 mmol/l artış (Osmotik demiyelinizasyon / ODS önlemi)', limits: 'Stopp bei Sistieren von Krämpfen und Koma', limits_tr: 'Konvülziyon ve koma gerilediğinde hipertonik infüzyon durdurulur' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Succinylcholin bei Dialysepatienten oder vorbestehender Hyperkaliämie', mistake_tr: 'Diyaliz hastasında veya mevcut hiperkalemide Süksinilkolin verilmesi', whyFatal: 'Succinylcholin steigert das Serumkalium akut um 0,5–1,0 mmol/l und führt unmittelbar zur Kammerasystolie!', whyFatal_tr: 'Süksinilkolin serum potasyumunu akut olarak 0,5–1,0 mmol/l artırır ve doğrudan ventriküler fibrilasyon/asistoliye yol açar!', correctAction: 'Succinylcholin ist strikt kontraindiziert. RSI mit Rocuronium 1,2 mg/kg durchführen (Reversierung mit Sugammadex).', correctAction_tr: 'Süksinilkolin kesinlikle kontrendikedir. RSI Roküronyum 1,2 mg/kg ile yapılmalıdır (geri döndürme: Sugammadex).' },
          { mistake: 'Zu rascher Ausgleich einer chronischen Hyponatriämie (> 10–12 mmol/l/24h)', mistake_tr: 'Kronik hiponatremide sodyumun çok hızlı düzeltilmesi (> 10–12 mmol/l/24 saat)', whyFatal: 'Führt zur gefürchteten osmotischen Demyelinisierung (pontine Myelinolyse) mit irreversibler spastischer Tetraplegie und Locked-in-Syndrom.', whyFatal_tr: 'Korkulan osmotik demiyelinizasyon sendromuna (santral pontin miyelinozis) ve kalıcı kuadripleji / Locked-in sendromuna yol açar.', correctAction: 'Streng limitierter Ausgleich: maximal 8–10 mmol/l innerhalb der ersten 24 Stunden!', correctAction_tr: 'Sıkı kontrollü düzeltme: İlk 24 saat içinde maksimum 8–10 mmol/l artış!' }
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
          title_tr: 'Kardiyak İmplantların (CIED) Perioperatif Yönetimi DGAI / DGK Uzlaşı Önerisi',
          society: 'DGAI / BDA / Deutsche Gesellschaft für Kardiologie (DGK)',
          awmf: 'Kardiologie Leitlinien CIED Perioperativ',
          year: '2023',
          recommendation: 'ICD: Magnetauflage schaltet NUR die Schocktherapie ab (Antitachykardie-Funktion AUS, verhindert Fehlshocks durch Kauter-EMI). Schrittmacherfunktion bleibt unverändert! Herzschrittmacher: Magnet schaltet in asynchronen Starrfrequenzmodus (VOO/DOO 85–100/min). Klebe-Defibrillatorelektroden VOR Narkoseeinleitung anbringen.',
          recommendation_tr: 'İCD: Mıknatıs SADECE şok fonksiyonunu devre dışı bırakır (koter girişimini şok sanmayı engeller), pili asenkron moda geçirmez! Kalp pili: Mıknatıs asenkron sabit hıza (VOO/DOO 85-100/dk) geçirir. Harici pedler indüksiyondan ÖNCE yapıştırılmalıdır.'
        },
        dosages: [
          { drug: 'Externe Defibrillations-Pads', drug_tr: 'Harici Defibrilasyon Pedleri', dose: 'Anterior-posterior vor Narkoseeinleitung kleben', dose_tr: 'Anestezi indüksiyonundan önce anterior-posterior yapıştırılır', route: 'Kutan', maxDose: 'Immer einsatzbereit bei deaktiviertem ICD', maxDose_tr: 'İCD devre dışı bırakıldığında daima kullanıma hazır tutulmalıdır', limits: 'Pflichtstandard bei jeder ICD-Operation', limits_tr: 'Her İCD hastasının ameliyatında zorunlu güvenlik standardıdır' },
          { drug: 'Bipolare Diathermie / Kauter', drug_tr: 'Bipolar Koter / Diyatermi', dose: 'Kurze Impulse (< 2 s), Neutralelektrode am Oberschenkel', dose_tr: 'Kısa akım darbeleri (< 2 sn), nötr elektrot uyluk bölgesine', route: 'Chirurgisch', maxDose: 'Strompfad darf niemals über das Aggregat oder die Sonden fließen', maxDose_tr: 'Akım yolu asla batarya veya elektrotlar üzerinden geçmemelidir', limits: 'Abstand Kauter zu Aggregat > 15 cm', limits_tr: 'Koter ile cihaz arasındaki mesafe > 15 cm olmalıdır' },
          { drug: 'Atropin / Adrenalin / Isoprenalin', drug_tr: 'Atropin / Adrenalin / İzoprenalin', dose: 'Atropin 0,5–1 mg, Adrenalin 10–50 µg bei Ausfall', dose_tr: 'Pil kaybında Atropin 0,5–1 mg, Adrenalin 10–50 µg i.v.', route: 'i.v.', maxDose: 'Pharmakologische Notfall-Frequenzstützung', maxDose_tr: 'Farmakolojik acil kalp hızı desteği', limits: 'Temporäre transkutane Schrittmacherbereitschaft', limits_tr: 'Geçici transkütan pacing hazırlığı şarttır' }
        ],
        koPitfalls: [
          { mistake: 'Annahme, dass ein Ringmagnet den ICD in einen asynchronen Schrittmachermodus versetzt', mistake_tr: 'Halka mıknatısın İCD yi asenkron pil moduna (VOO) geçirdiğini sanmak', whyFatal: 'Kardinaler Denkfehler! Der Magnet deaktiviert beim ICD ausschließlich die Schocktherapie. Ist der Patient schrittmacherabhängig, kann Kauter-EMI zur Asystolie führen.', whyFatal_tr: 'Kritik bilgi hatası! Mıknatıs İCD de yalnızca şok tedavisini kapatır. Hasta pil bağımlıysa koter paraziti (EMI) inhibisyon ve asistoliye yol açar.', correctAction: 'Schrittmacherabhängige ICD-Patienten müssen präoperativ durch Kardiotechnik/Programmiergerät in VOO/DOO umprogrammiert werden.', correctAction_tr: 'Pil bağımlı İCD hastaları ameliyat öncesinde programlayıcı cihaz ile VOO/DOO moduna alınmalıdır.' },
          { mistake: 'Verzicht auf externe Defibrillationselektroden bei deaktiviertem ICD', mistake_tr: 'İCD devre dışıyken harici defibrilatör pedlerinin takılmaması', whyFatal: 'Tritt intraoperativ Kammerflimmern auf, kann der Patient nicht sofort defibrilliert werden -> anoxischer Hirnschaden.', whyFatal_tr: 'İntraoperatif ventriküler fibrilasyon gelişirse hasta anında defibrile edilemez -> anoksik beyin hasarı.', correctAction: 'Vor Schnittbeginn Defibrillator-Pads kleben und Defibrillator betriebsbereit im Saal vorhalten.', correctAction_tr: 'Cerrahi kesi başlamadan önce harici pedler yapıştırılmalı ve defibrilatör odada açık hazır tutulmalıdır.' }
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
          title_tr: 'Toraks Anestezisi ve Tek Akciğer Ventilasyonu (OLV) DGAI / EACTAIC Önerileri',
          society: 'DGAI / Arbeitskreis Thoraxanästhesie / EACTAIC',
          awmf: 'Leitlinie Thoraxanästhesie & Lungenisolation',
          year: '2023',
          recommendation: 'Lungenprotektive OLV: Tidalvolumen 4–5 ml/kg PBW, PEEP 5–8 cmH2O, Driving Pressure ≤ 14 cmH2O. 5-Stufen-Algorithmus bei Hypoxämie: 1. FiO2 1.0, 2. Fiberoptische Lagekontrolle des DLT, 3. PEEP-Optimierung der ventilierten Lunge, 4. CPAP (1–5 cmH2O mit O2) an die nicht-ventilierte Lunge, 5. Re-Ventilation beider Lungen.',
          recommendation_tr: 'Akciğer koruyucu OLV: Vt 4-5 ml/kg PBW, PEEP 5-8 cmH2O, Driving pressure <= 14. Hipoksemide 5 basamak: 1. %100 FiO2, 2. Fiberoptik DLT kontrolü, 3. Ventilasyon akciğerine PEEP, 4. Kollabe akciğere CPAP (1-5 cmH2O O2), 5. İki akciğeri tekrar havalandır.'
        },
        dosages: [
          { drug: 'Sauerstoff-Insufflation (FiO2 1.0)', drug_tr: 'Oksijen İnsüflasyonu (FiO₂ 1,0)', dose: '100% O2 bei akutem SpO2-Abfall', dose_tr: 'Akut SpO₂ düşüşünde %100 O₂', route: 'Beatmung', maxDose: 'Reduktion nach Stabilisierung auf FiO2 0,6–0,8', maxDose_tr: 'Stabilizasyon sonrası FiO₂ 0,6–0,8 düzeyine çekilir', limits: 'Resorptionsatelektasen beachten', limits_tr: 'Rezorpsiyon atelektazilerine dikkat edilmelidir' },
          { drug: 'CPAP-System an kollabierte Lunge', drug_tr: 'Kollabe Akciğere CPAP Uygulaması', dose: '1–5 cmH2O kontinuierlicher O2-Flow (2–5 l/min)', dose_tr: '1–5 cmH₂O sürekli O₂ akımı (2–5 l/dk)', route: 'Kollabierter DLT-Schenkel', maxDose: 'Sehr effektiv zur Shunt-Reduktion ohne Sichtbehinderung für Operateur', maxDose_tr: 'Cerrahın görüşünü bozmadan şantı azaltmada çok etkilidir', limits: 'Operateur vorab informieren', limits_tr: 'Uygulamadan önce cerrah bilgilendirilmelidir' },
          { drug: 'Protektive Ventilation (PBW)', drug_tr: 'Akciğer Koruyucu Ventilasyon (PBW)', dose: 'Vt 4–5 ml/kg bezogen auf Idealgewicht (PBW) + PEEP 5–8 cmH2O', dose_tr: 'İdeal kiloya (PBW) göre Vt 4–5 ml/kg + PEEP 5–8 cmH₂O', route: 'Ventilator', maxDose: 'Spitzendruck < 25–30 mbar, Driving Pressure < 14 mbar', maxDose_tr: 'Tepe basınç < 25–30 mbar, Driving Pressure < 14 mbar', limits: 'Hyperkapnie permissiv tolerieren (pH ≥ 7,20)', limits_tr: 'Permissif hiperkapni tolere edilir (pH ≥ 7,20)' }
        ],
        koPitfalls: [
          { mistake: 'Blindes Weiterprobieren ohne fiberoptische DLT-Lagekontrolle bei Hypoxie', mistake_tr: 'Hipokside fiberoptik DLT yerleşim kontrolü yapmadan körlemesine müdahale etmek', whyFatal: 'Die häufigste Ursache einer akuten intraoperativen Hypoxie während OLV ist eine Dislokation des DLT (z.B. durch Umlagerung). Blindes Erhöhen von Beatmungsdrücken führt zum Barotrauma.', whyFatal_tr: 'OLV sırasında akut hipoksinin en sık nedeni DLT dislokasyonudur (örn. yan pozisyon verme sonrası). Körlemesine basınç artırmak barotravmaya yol açar.', correctAction: 'Sofortige fiberoptische Kontrolle der Tubusspitze und der Karina über beide Schenkel!', correctAction_tr: 'Her iki lümenden tüp ucunun ve karinanın derhal fiberoptik bronkoskop ile kontrol edilmesi!' },
          { mistake: 'Ventilation der operierten Einzellunge mit Normal-Tidalvolumen (8–10 ml/kg)', mistake_tr: 'Tek akciğerin normal tidal volümle (8–10 ml/kg) havalandırılması', whyFatal: 'Erzeugt massives Volu- und Barotrauma mit tödlichem akutem Lungenschaden (ARDS / ALI nach Thorakotomie).', whyFatal_tr: 'Masif volü- ve barotravma yaratarak torakotomi sonrası ölümcül akut akciğer hasarına (ARDS / ALI) yol açar.', correctAction: 'Tidalvolumen strikt auf 4–5 ml/kg PBW der Einzellunge reduzieren!', correctAction_tr: 'Tek akciğer ventilasyonunda tidal volüm kesinlikle 4–5 ml/kg PBW düzeyine indirilmelidir!' }
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
          title_tr: 'Pediyatrik Havayolu Yönetimi DGAI / ESPA Uygulama Önerisi',
          society: 'DGAI / Arbeitskreis Kinderanästhesie & ESPA',
          awmf: 'Leitlinie Pädiatrisches Atemwegsmanagement',
          year: '2023',
          recommendation: 'Stufenplan Laryngospasmus: 1. Narkosevertiefung/Reizunterbrechung + 100% O2 mit dicht sitzender Maske & CPAP (10–15 cmH2O), 2. Larson-Punkt (Druck hinter den Kieferwinkeln), 3. Propofol (0,5–1 mg/kg i.v.), 4. Succinylcholin (0,5–1 mg/kg i.v. IMMER zusammen mit Atropin 0,02 mg/kg bei Kindern < 8 Jahren). Tubusgröße: (Alter/4) + 3,5 mm (gecufft).',
          recommendation_tr: 'Laringospazm basamakları: 1. %100 O2, maskeyle sıkı CPAP (10-15 cmH2O), 2. Larson manevrası (çene köşesi arkasına bası), 3. Propofol (0.5-1 mg/kg), 4. Süksinilkolin (0.5-1 mg/kg i.v. + Atropin 0.02 mg/kg). Kafli tüp: (Yaş/4) + 3.5 mm.'
        },
        dosages: [
          { drug: 'Sauerstoff-CPAP', drug_tr: 'Oksijen-CPAP', dose: '100% O2 mit PEEP/CPAP 10–15 cmH2O via dichte Maske', dose_tr: 'Yüze tam oturan maske ile %100 O₂ ve 10–15 cmH₂O PEEP/CPAP', route: 'Maske', maxDose: 'Überwindet leichten bis mäßigen Glottisschluss', maxDose_tr: 'Hafif ve orta dereceli glottik spazmı çözer', limits: 'Vorsicht vor Magenüberblähung', limits_tr: 'Mide distansiyonuna dikkat edilmelidir' },
          { drug: 'Propofol (Krampflösung)', drug_tr: 'Propofol (Spazm Çözücü)', dose: '0,5–1,0 mg/kg i.v. Bolus', dose_tr: '0,5–1,0 mg/kg i.v. bolus', route: 'i.v.', maxDose: 'Durchbricht Laryngospasmus oft ohne Relaxierung', maxDose_tr: 'Kas gevşeticiye gerek kalmadan laringospazmı sıklıkla kırar', limits: 'Nur bei stabiler Hämodynamik', limits_tr: 'Yalnızca hemodinami stabilse uygulanır' },
          { drug: 'Succinylcholin (Notfall-Rescue)', drug_tr: 'Süksinilkolin (Acil Kurtarma)', dose: '0,5–1,0 mg/kg i.v. (oder 3–4 mg/kg i.m. bei fehlendem ZVK/Viggo)', dose_tr: '0,5–1,0 mg/kg i.v. (damar yolu yoksa 3–4 mg/kg i.m.)', route: 'i.v. / i.m.', maxDose: 'Zwingend zusammen mit Atropin 0,02 mg/kg i.v.!', maxDose_tr: 'Mutlaka Atropin 0,02 mg/kg i.v. ile BİRLİKTE!', limits: 'Verhindert vagale Asystolie des hypoxischen Kindes', limits_tr: 'Hipoksik çocukta vagal asistoliyi önler' },
          { drug: 'Atropin (Bradykardieschutz)', drug_tr: 'Atropin (Bradikardi Koruması)', dose: '0,02 mg/kg i.v. (Mindestdosis 0,1 mg)', dose_tr: '0,02 mg/kg i.v. (Minimum doz 0,1 mg)', route: 'i.v.', maxDose: 'Max. 0,5 mg Einzeldosis', maxDose_tr: 'Maksimum tek doz 0,5 mg', limits: 'Essentiell bei pädiatrischer Hypoxie-Bradykardie', limits_tr: 'Pediyatrik hipoksi-bradikardi kısır döngüsünü önlemek için şarttır' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von Succinylcholin beim hypoxischen Kind OHNE Atropin', mistake_tr: 'Hipoksik çocukta Atropin OLMADAN Süksinilkolin verilmesi', whyFatal: 'Führt bei vorbestehendem Vagotonus und Hypoxie zur unmittelbaren, letalen bradykarden Asystolie (K.O.-Fehler!).', whyFatal_tr: 'Mevcut yüksek vagal tonus ve hipoksi zemininde doğrudan ölümcül bradikardik asistoliye yol açar (K.O. hatası!).', correctAction: 'Succinylcholin und Atropin müssen beim Kind immer gemeinsam aufgezogen und gespritzt werden!', correctAction_tr: 'Çocuklarda Süksinilkolin ve Atropin daima birlikte çekilmeli ve uygulanmalıdır!' },
          { mistake: 'Blinde Überdruckbeatmung bei vermuteter Fremdkörperaspiration', mistake_tr: 'Yabancı cisim aspirasyonu şüphesinde körlemesine pozitif basınçlı ventilasyon yapılması', whyFatal: 'Keilt den Fremdkörper tiefer im Bronchialbaum ein und konvertiert einen partiellen Verschluss in einen totalen Ventilpneumothorax.', whyFatal_tr: 'Yabancı cismi bronş ağacında daha derine iter ve kısmi tıkanıklığı tam tıkanıklığa / tansiyon pnömotoraksa çevirir.', correctAction: 'Spontanatmung unter Sevofluran erhalten; starre Bronchoskopie im OP durchführen.', correctAction_tr: 'Sevofluran ile spontan solunum korunmalı ve ameliyathanede rijit bronchoskopi yapılmalıdır.' }
        ]
      };
    }

    // PiCCO & Erweitertes Hämodynamisches Monitoring (Thermodilution / Pulskontur)
    if (text.includes('picco') || text.includes('thermodilution') || text.includes('elwi') || text.includes('gedi') || text.includes('itbi') || text.includes('schlagvolumenvariation') || text.includes('pulskontur')) {
      return {
        topic: 'Erweitertes Hämodynamik-Monitoring (PiCCO, GEDI, ELWI, SVV)',
        topic_tr: 'İleri Hemodinamik Monitörizasyon (PiCCO, Transpulmoner Termodilüsyon, GEDI, ELWI, SVV)',
        firstDrugTR: 'GEDI/SVV ile Volüm Yanıtlılığı Analizi + ELWI ile Akciğer Ödemi Ayrımı',
        guideline: {
          title: 'S3-Leitlinie Intravasale Volumentherapie & Hämodynamisches Monitoring auf der Intensivstation',
          title_tr: 'Yoğun Bakımda İntravasküler Volüm Tedavisi ve Hemodinamik Monitörizasyon S3 Kılavuzu',
          society: 'DGAI / DIVI',
          awmf: 'AWMF-Registernummer 001-020',
          year: '2023',
          recommendation: 'Dynamische Vorlastparameter (SVV/PPV > 12–13%) und volumetrische Thermodilutionsparameter (GEDI, ITBI) sind statischen Füllungsdrücken (ZVD) zur Steuerung der Volumentherapie klar überlegen. ELWI quantifiziert das extravaskuläre Lungenwasser am Krankenbett.',
          recommendation_tr: 'Sıvı tedavisinin yönetiminde dinamik ön yük parametreleri (SVV/PPV > %12–13) ve volümetrik termodilüsyon indeksleri (GEDI, ITBI), statik dolum basınçlarına (SVB/ZVD) göre açıkça üstündür. ELWI yatak başında ekstravasküler akciğer suyunu ölçer.'
        },
        dosages: [
          { drug: 'GEDI (Globaler Enddiastolischer Volumenindex)', drug_tr: 'GEDI (Global Enddiyastolik Volüm İndeksi)', dose: 'Normwert: 680–800 ml/m² (ITBI Norm: 850–1000 ml/m²)', dose_tr: 'Normal değer: 680–800 ml/m² (ITBI Normal: 850–1000 ml/m²)', route: 'Thermodilution', maxDose: '< 680 ml/m² = Volumetrischer Vorlastmangel', maxDose_tr: '< 680 ml/m² = Volümetrik ön yük (preload) eksikliği', limits: 'Unabhängig vom intrathorakalen Beatmungsdruck', limits_tr: 'İntratorasik ventilasyon basıncından bağımsızdır' },
          { drug: 'ELWI (Extravaskulärer Lungenwasserindex)', drug_tr: 'ELWI (Ekstravasküler Akciğer Suyu İndeksi)', dose: 'Normwert: 3–7 ml/kg PBW (> 10 ml/kg = manifestes Lungenödem)', dose_tr: 'Normal değer: 3–7 ml/kg PBW (> 10 ml/kg = aşikar akciğer ödemi)', route: 'Thermodilution', maxDose: 'PVPI > 3,0 spricht für Permeabilitätsödem (ARDS) statt kardiales Ödem', maxDose_tr: 'PVPI > 3,0 kardiyojenik ödem yerine permeabilite ödemini (ARDS) gösterir', limits: 'Steuert restriktive Flüssigkeitsbilanz / Negativbilanzierung', limits_tr: 'Restriktif sıvı dengesi / negatif balans yönetimini yönlendirir' },
          { drug: 'SVV / PPV (Schlagvolumen-/Pulsdruckvariation)', drug_tr: 'SVV / PPV (Atım Hacmi / Nabız Basıncı Varyasyonu)', dose: '> 12–13 % = Volumenreagibilität positiv (Fluid Responder)', dose_tr: '> %12–13 = Pozitif sıvı yanıtlılığı (Fluid Responder)', route: 'Pulskonturanalyse', maxDose: 'Passive Leg Raising (PLR) Test als Alternative bei Vorhofflimmern', maxDose_tr: 'Atriyal fibrilasyonda alternatif olarak Pasif Bacak Kaldırma (PLR) testi kullanılır', limits: 'Voraussetzung: Sinusrhythmus, kontrollierte Beatmung Vt ≥ 8 ml/kg, geschlossener Thorax!', limits_tr: 'Ön koşul: Sinüs ritmi, kontrollü ventilasyon Vt ≥ 8 ml/kg, kapalı toraks!' }
        ],
        koPitfalls: [
          { mistake: 'Steuerung der Volumentherapie anhand von SVV/PPV bei Vorhofflimmern oder Spontanatmung', mistake_tr: 'Atriyal fibrilasyon veya spontan solunumda SVV/PPV ye göre sıvı tedavisi yönetmek', whyFatal: 'Unter Arrhythmie oder Spontanatmung schwankt das Schlagvolumen Schlag-zu-Schlag unabhängig vom Volumenstatus -> falsch-positive SVV führt zu massiver Überwässerung und Lungenödem!', whyFatal_tr: 'Aritmi veya spontan solunumda atım hacmi volüm durumundan bağımsız dalgalanır -> yanlış pozitif SVV masif sıvı yüklenmesi ve akciğer ödemine yol açar!', correctAction: 'Bei Vorhofflimmern oder Spontanatmung GEDI/ITBI aus der Thermodilution oder den Passive-Leg-Raising-Test (PLR mit HZV-Anstieg > 10%) nutzen.', correctAction_tr: 'Atriyal fibrilasyon veya spontan solunumda termodilüsyon GEDI/ITBI değerini veya Pasif Bacak Kaldırma (PLR ile kalp debisinde > %10 artış) testini kullanın.' }
        ]
      };
    }

    // Rupturiertes Bauchaortenaneurysma (rBAA) & Aortenchirurgie (Cross-Clamping / Declamping)
    if (text.includes('bauchaorten') || text.includes('aortenaneurysma') || text.includes('aortendissektion') || text.includes('declamping') || text.includes('cross-clamping') || text.includes('evar')) {
      return {
        topic: 'Bauchaortenaneurysma (rBAA) & Aortales Cross-Clamping / Declamping',
        topic_tr: 'Rüptüre Abdominal Aort Anevrizması (rBAA) & Aort Klempleme / Declamping Yönetimi',
        firstDrugTR: 'Permissif Hipotansiyon (RRsyst 70–90 mmHg) + Steril Örtüm Sonrası RSI ("Schnittbereit")',
        guideline: {
          title: 'S3-Leitlinie Bauchaortenaneurysma & ESVS Vascular Surgery Guidelines',
          title_tr: 'Abdominal Aort Anevrizması S3 Kılavuzu & ESVS Damar Cerrahisi Rehberi',
          society: 'DGG / DGAI / ESVS',
          awmf: 'AWMF-Registernummer 004-014',
          year: '2024',
          recommendation: 'Bei rBAA vor Aortenklemme strikte permissive Hypotonie (RRsyst 70–90 mmHg bei erhaltener Vigilanz) zur Vermeidung einer Thrombussprengung („Popping the clot“). Narkoseeinleitung (RSI) erst am schnittbereiten, steril abgewaschenen und abgedeckten Patienten! Vor Declamping Volumenvorladung und Noradrenalin-Erhöhung gegen den Ischämie-Reperfusions-Schock.',
          recommendation_tr: 'rBAA da aort klemplenmeden önce pıhtının kopmasını ("Popping the clot") önlemek için sıkı permissif hipotansiyon (bilinç açıkken sistolik TA 70–90 mmHg) uygulanır. Anestezi indüksiyonu (RSI) yalnızca hasta steril boyanıp örtüldükten ve cerrah kesmeye hazır olduğunda ("Schnittbereit") yapılır! Klemp açılmadan (Declamping) önce reperfüzyon şokuna karşı volüm doldurulur ve Noradrenalin artırılır.'
        },
        dosages: [
          { drug: 'Permissive Hypotonie (vor Klemme)', drug_tr: 'Permissif Hipotansiyon (Klemp Öncesi)', dose: 'Ziel-RRsyst 70–90 mmHg (MAP 50–65 mmHg)', dose_tr: 'Hedef Sistolik TA 70–90 mmHg (MAP 50–65 mmHg)', route: 'Hämodynamik', maxDose: 'Restriktive Volumengabe bis Aortenklemme sitzt', maxDose_tr: 'Aort klempi konana dek restriktif sıvı yönetimi', limits: 'Verhindert freie Ruptur aus retroperitonealem Hämatom', limits_tr: 'Retroperitoneal hematomun serbest rüptüre dönüşmesini önler' },
          { drug: 'RSI am schnittbereiten Patienten', drug_tr: 'Cerrahiye Hazır Hastada ("Schnittbereit") RSI', dose: 'Etomidat 0,2–0,3 mg/kg (oder Ketamin/Sufentanil) + Rocuronium 1,2 mg/kg', dose_tr: 'Etomidat 0,2–0,3 mg/kg (veya Ketamin/Sufentanil) + Roküronyum 1,2 mg/kg', route: 'i.v.', maxDose: 'Chirurg steht mit Skalpell schnittbereit am Tisch', maxDose_tr: 'Cerrah elinde bistüri ile masada kesmeye hazır bekler', limits: 'Relaxierung hebt Bauchdeckentamponade sofort auf!', limits_tr: 'Kas gevşemesi karın duvarı tamponadını anında ortadan kaldırır!' },
          { drug: 'Unfraktioniertes Heparin (vor Clamping Elektiv)', drug_tr: 'Fraksiyone Olmayan Heparin (Elektif Klemp Öncesi)', dose: '3.000–5.000 IE i.v. (ca. 70–100 IE/kg) 3–5 min vor Klemme', dose_tr: 'Klempten 3–5 dk önce 3.000–5.000 IU i.v. (~70–100 IU/kg)', route: 'i.v.', maxDose: 'Ziel-ACT > 200–250 s (bei freier Ruptur individuell nach Chirurg)', maxDose_tr: 'Hedef ACT > 200–250 sn (serbest rüptürde cerrahla bireysel karar)', limits: 'Mindestens 1h Abstand zu vorangehender PDK-Anlage!', limits_tr: 'Öncesinde epidural kateter takıldıysa en az 1 saat ara verilmelidir!' },
          { drug: 'Declamping-Management', drug_tr: 'Declamping (Klemp Açma) Yönetimi', dose: 'Noradrenalin-Perfusor steigern + Kalziumchlorid 10% 10 ml + Vollelektrolyt-Bolus', dose_tr: 'Noradrenalin perfüzörünü artır + %10 Kalsiyum klorür 10 ml + Kristalloid bolusu', route: 'i.v.', maxDose: 'Schrittweises Öffnen der Aortenklemme durch Operateur', maxDose_tr: 'Cerrah tarafından aort klempinin kademeli olarak açılması', limits: 'Fängt Laktat-/Kalium-/H+-Washout aus unterer Körperhälfte ab', limits_tr: 'Alt vücut yarısından gelen laktat, potasyum ve H⁺ washout şokunu karşılar' }
        ],
        koPitfalls: [
          { mistake: 'Narkoseeinleitung und Muskelrelaxierung im Einleitungsraum VOR sterilem Abwaschen beim rBAA', mistake_tr: 'rBAA hastasında steril boyama ve örtüm ÖNCESİNDE hazırlık odasında anestezi indüksiyonu ve kas gevşetici yapılması', whyFatal: 'Die Muskelrelaxierung nimmt den kompensatorischen intraabdominellen Gegendruck (Bauchdeckentamponade) weg -> sofortige freie Massenblutung und pulslose elektrische Aktivität (PEA) noch vor Schnitt!', whyFatal_tr: 'Kas gevşemesi kompensatuar karın içi karşı basıncı (karın duvarı tamponadını) ortadan kaldırır -> daha kesi yapılmadan serbest masif kanama ve NEA arresti gelişir!', correctAction: 'Patient wach im OP lagern, großlumige Zugänge + Arterie legen, steril abwaschen/abdecken und erst bei „Schnittbereit“-Ansage des Operateurs RSI durchführen!', correctAction_tr: 'Hastayı ameliyat masasına uyanık yatırın, geniş damar yolları ve arter takın, steril boyayıp örtün ve yalnızca cerrah "kesmeye hazır" dediğinde RSI yapın!' },
          { mistake: 'Aggressives Anheben des Blutdrucks auf Normwerte (> 120 mmHg systolisch) vor Aortenklemme', mistake_tr: 'Aort klempi öncesinde kan basıncının agresif şekilde normal değerlere (> 120 mmHg sistolik) çıkarılması', whyFatal: 'Erhöht nach dem Laplace-Gesetz die Wandspannung exponentiell und sprengt den schützenden Thrombus („Popping the clot“).', whyFatal_tr: 'Laplace yasasına göre damar duvar gerilimini katlayarak koruyucu pıhtıyı patlatır ("Popping the clot").', correctAction: 'Permissive Hypotonie (RRsyst 70–90 mmHg) bis zum Setzen der Aortenklemme strikt einhalten.', correctAction_tr: 'Aort klempi yerleşene kadar permissif hipotansiyona (Sistolik TA 70–90 mmHg) sıkı şekilde uyulmalıdır.' }
        ]
      };
    }

    // Intraoperative Reanimation & ACLS (4H & HITS)
    if (text.includes('reanimation') || text.includes('acls') || text.includes('kammerflimmern') || text.includes('asystolie') || text.includes('pea') || text.includes('herzdruckmassage')) {
      return {
        topic: 'Advanced Life Support (ACLS) & Intraoperativer Kreislaufstillstand (4H & HITS)',
        topic_tr: 'İleri Yaşam Desteği (ACLS) & İntraoperatif Kardiyak Arrest (4H & HITS)',
        firstDrugTR: 'Yüksek Kaliteli KPR + Şoklanabilir Ritimde Erken Defibrilasyon + Adrenalin 1 mg / Amiodaron 300 mg',
        guideline: {
          title: 'ERC / GRC Leitlinien zur Reanimation (Adult Advanced Life Support)',
          title_tr: 'Reanimasyon ERC / GRC Kılavuzları (Erişkin İleri Yaşam Desteği / ALS)',
          society: 'European Resuscitation Council (ERC) / GRC / DGAI',
          awmf: 'ERC Guidelines ALS 2021/2025',
          year: '2024',
          recommendation: 'Ununterbrochene Herzdruckmassage (Tiefe 5–6 cm, Frequenz 100–120/min), Kapnographie (EtCO2 > 15–20 mmHg als Qualitätsmarker & plötzlicher Sprung bei ROSC). Bei VF/pVT sofortige Defibrillation; Adrenalin 1 mg und Amiodaron 300 mg nach dem 3. Schock. Bei Asystolie/PEA Adrenalin 1 mg sofort. Systematische Suche nach 4H & HITS.',
          recommendation_tr: 'Kesintisiz göğüs kompresyonu (derinlik 5–6 cm, hız 100–120/dk), kapnografi takibi (kaliteli KPR için EtCO2 > 15–20 mmHg ve ROSC anında ani sıçrama). VF/nVT de derhal defibrilasyon; 3. şoktan sonra Adrenalin 1 mg ve Amiodaron 300 mg. Asistoli/NEA da Adrenalin 1 mg derhal verilir; 4H ve HITS nedenleri sistematik taranır.'
        },
        dosages: [
          { drug: 'Adrenalin 1 mg i.v./i.o. (ALS)', drug_tr: 'Adrenalin 1 mg i.v./i.o. (ALS)', dose: '1 mg alle 3–5 min (jeder 2. Zyklus)', dose_tr: '3–5 dakikada bir 1 mg (her 2. siklusta bir)', route: 'i.v. / i.o.', maxDose: 'VF/pVT: erst NACH dem 3. erfolglosen Schock! Asystolie/PEA: SOFORT!', maxDose_tr: 'VF/nVT: Yalnızca 3. başarısız şoktan SONRA! Asistoli/NEA: DERHAL!', limits: 'Sichert koronaren und zerebralen Perfusionsdruck über Alpha-1', limits_tr: 'Alfa-1 etki ile koroner ve serebral perfüzyon basıncını sağlar' },
          { drug: 'Amiodaron i.v./i.o.', drug_tr: 'Amiodaron i.v./i.o.', dose: '300 mg Bolus nach dem 3. Schock, weitere 150 mg nach dem 5. Schock', dose_tr: '3. şoktan sonra 300 mg bolus, 5. şoktan sonra ek 150 mg', route: 'i.v. / i.o.', maxDose: 'Alternativ Lidocain 100 mg (1–1,5 mg/kg) nach 3. Schock', maxDose_tr: 'Alternatif olarak 3. şoktan sonra Lidokain 100 mg (1–1,5 mg/kg)', limits: 'Nur bei schockbarem Rhythmus (VF / pVT)', limits_tr: 'Yalnızca şoklanabilir ritimlerde (VF / nabızsız VT)' },
          { drug: 'Systemische Thrombolyse (bei LAE-Reanimation)', drug_tr: 'Sistemik Tromboliz (Akciğer Embolisi KPR)', dose: 'Alteplase (rt-PA) 50–100 mg i.v. Bolus/Kurzinfusion', dose_tr: 'Alteplaz (rt-PA) 50–100 mg i.v. bolus / kısa infüzyon', route: 'i.v.', maxDose: 'Zwingend mindestens 60–90 Minuten CPR nach Lysegabe fortführen!', maxDose_tr: 'Trombolitik verildikten sonra KPR ye en az 60–90 dakika devam edilmelidir!', limits: 'Bei „T“ = Thrombose (Lungenembolie / Koronarthrombose)', limits_tr: '"T" = Tromboz (Masif pulmoner emboli / koroner tromboz) varlığında' }
        ],
        koPitfalls: [
          { mistake: 'Gabe von 1 mg Adrenalin und 300 mg Amiodaron direkt nach dem 1. Schock bei Kammerflimmern', mistake_tr: 'Ventriküler fibrilasyonda 1. şoktan hemen sonra 1 mg Adrenalin ve 300 mg Amiodaron verilmesi', whyFatal: 'Widerspricht dem ERC-Algorithmus! Frühe Katecholamingabe bei primärem Kammerflimmern verschlechtert die Mikrozirkulation und erhöht post-ROSC-Arrhythmien.', whyFatal_tr: 'ERC algoritmasına aykırıdır! Primer VF de erken katekolamin verilmesi mikrosirkülasyonu bozar ve ROSC sonrası aritmileri artırır.', correctAction: 'Bei VF/pVT werden Adrenalin 1 mg und Amiodaron 300 mg erst NACH dem 3. erfolglosen Defibrillationsversuch appliziert!', correctAction_tr: 'VF/nVT tablosunda Adrenalin 1 mg ve Amiodaron 300 mg yalnızca 3. başarısız defibrilasyondan SONRA uygulanır!' }
        ]
      };
    }

    // Inhalationsanästhetika & TIVA Pharmakokinetik (MAC, Blut-Gas-Koeffizient, Kontextsensitive Halbwertszeit)
    if (text.includes('sevofluran') || text.includes('desfluran') || text.includes('isofluran') || text.includes('lachgas') || text.includes('blut-gas') || text.includes('mac-wert') || text.includes('kontextsensitive') || text.includes('remifentanil') || text.includes('propofol')) {
      return {
        topic: 'Pharmakokinetik & First-Principles der Inhalationsanästhetika & TIVA',
        topic_tr: 'İnhalasyon Anestezikleri & TİVA Farmakokinetiği (MAC, Kan/Gaz Katsayısı, Bağlama Duyarlı Yarı Ömür)',
        firstDrugTR: 'Kan/Gaz Dağılım Katsayısı (Desfluran 0,42 vs Sevofluran 0,65) + MAC Titrasyonu',
        guideline: {
          title: 'DGAI Empfehlungen zur Inhalationsanästhesie, TIVA & EEG-Monitoring',
          title_tr: 'İnhalasyon Anestezisi, TİVA ve EEG Monitörizasyonu DGAI Önerileri',
          society: 'DGAI / BDA',
          awmf: 'DGAI S2e / Klinische Pharmakologie',
          year: '2023',
          recommendation: 'Die An- und Abflutungsgeschwindigkeit volatiler Anästhetika wird primär durch den Blut-Gas-Verteilungskoeffizienten (λ_B/G) und das Herzzeitvolumen bestimmt, während die Wirkstärke (Potenz) über die Lipidlöslichkeit (Öl-Gas-Koeffizient / Meyer-Overton-Regel) mit dem MAC-Wert korreliert.',
          recommendation_tr: 'Uçucu anesteziklerin indüksiyon ve uyanma hızı öncelikle kan-gaz dağılım katsayısı (λ_B/G) ve kardiyak debi ile belirlenirken, anestezik güç (potens) yağda çözünürlük (yağ-gaz katsayısı / Meyer-Overton kuralı) üzerinden MAC değeri ile koreledir.'
        },
        dosages: [
          { drug: 'Sevofluran', drug_tr: 'Sevofluran', dose: 'MAC₅₀ ≈ 2,0 Vol-% (Blut-Gas-Koeffizient λ_B/G = 0,65)', dose_tr: 'MAC₅₀ ≈ %2,0 Vol (Kan-Gaz Dağılım Katsayısı λ_B/G = 0,65)', route: 'Inhalativ', maxDose: 'Nicht-irritierend -> ideal zur Maskeneinleitung beim Kind', maxDose_tr: 'Havayolunu irrite etmez -> çocukta maske indüksiyonu için idealdir', limits: 'Flussrate & FGF beachten; epileptogene Potenziale bei hoher Konzentration', limits_tr: 'Taze gaz akımına dikkat; yüksek konsantrasyonda epileptojenik potansiyel' },
          { drug: 'Desfluran', drug_tr: 'Desfluran', dose: 'MAC₅₀ ≈ 6,0 Vol-% (Blut-Gas-Koeffizient λ_B/G = 0,42)', dose_tr: 'MAC₅₀ ≈ %6,0 Vol (Kan-Gaz Dağılım Katsayısı λ_B/G = 0,42)', route: 'Inhalativ (Spezial-Siedeverdampfer 39°C / 2 bar)', maxDose: 'Schnellstes An-/Abfluten aller volatilen Gase', maxDose_tr: 'Tüm uçucu gazlar içinde en hızlı uyuma ve uyanma kinetiği', limits: 'Kontraindiziert zur Maskeneinleitung (Atemwegsreizung, Laryngospasmus, Sympathikusaktivierung bei > 1 MAC Sprung)!', limits_tr: 'Maske indüksiyonunda KONTRENDİKEDİR (Havayolu irritasyonu, laringospazm, > 1 MAC sıçramada sempatik fırtına)!' },
          { drug: 'Remifentanil (TIVA)', drug_tr: 'Remifentanil (TİVA)', dose: '0,1–0,5 µg/kg/min Perfusor', dose_tr: '0,1–0,5 µg/kg/dk perfüzör', route: 'i.v.', maxDose: 'Kontextsensitive Halbwertszeit (CSHT) konstant 3–4 Minuten unabhängig von Infusionsdauer!', maxDose_tr: 'Bağlama duyarlı yarı ömür (CSHT) infüzyon süresinden bağımsız sabit 3–4 dakikadır!', limits: 'Unspezifische Plasma-/Gewebeesterasen; rechtzeitige postoperative Übergangsanalgesie (Piritramid/Morphin) zwingend!', limits_tr: 'Non-spesifik plazma/doku esterazlarıyla yıkılır; ekstübasyon öncesi geçiş analjezisi (Piritramid/Morfin) şarttır!' }
        ],
        koPitfalls: [
          { mistake: 'Inhalative Maskeneinleitung eines Kindes mit Desfluran wegen des niedrigen Blut-Gas-Koeffizienten', mistake_tr: 'Düşük kan-gaz katsayısı nedeniyle çocukta Desfluran ile inhalasyon maske indüksiyonu yapılması', whyFatal: 'Desfluran wirkt stark stechend/atemwegsreizend und löst bei wachen Kindern sofortigen schweren Laryngospasmus, Bronchospasmus und Hustenstöße bis zur Hypoxie aus!', whyFatal_tr: 'Desfluran keskin kokulu ve şiddetli havayolu irritanıdır; uyanık çocukta anında ağır laringospazm, bronkospazm ve hipoksiye yol açar!', correctAction: 'Zur inhalativen Einleitung ausschließlich Sevofluran verwenden; Desfluran nur zur Narkoseaufrechterhaltung über gesicherten Atemweg.', correctAction_tr: 'İnhalasyon indüksiyonunda yalnızca Sevofluran kullanılır; Desfluran sadece güvenli havayolu sağlandıktan sonra idamede kullanılır.' },
          { mistake: 'Verwechslung von Blut-Gas-Koeffizient (Geschwindigkeit) und Öl-Gas-Koeffizient (Potenz / MAC)', mistake_tr: 'Kan-Gaz katsayısı (hız) ile Yağ-Gaz katsayısının (potens / MAC) karıştırılması', whyFatal: 'Klassische Prüfungsfalle: Ein hoher Blut-Gas-Koeffizient bedeutet hohe Löslichkeit im Blut = großer Speicher = LANGSAME Einleitung, da der alveoläre Partialdruck (P_A/P_I) langsamer ansteigt.', whyFatal_tr: 'Klasik sınav tuzağı: Yüksek kan-gaz katsayısı kanda yüksek çözünürlük = büyük rezervuar = YAVAŞ indüksiyon demektir, çünkü alveoler parsiyel basınç (P_A/P_I) daha yavaş yükselir.', correctAction: 'Merksatz für die Prüfung: Niedriges λ_B/G (Desfluran 0,42 < Sevofluran 0,65 < Isofluran 1,4) = rascher alveolärer Partialdruckaufbau = schnelles Einschlafen und Aufwachen!', correctAction_tr: 'Sınav kuralı: Düşük λ_B/G (Desfluran 0,42 < Sevofluran 0,65 < İzofluran 1,4) = hızlı alveoler parsiyel basınç artışı = hızlı uyuma ve uyanma!' }
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
        title_tr: 'DGAI / BDA Önerileri & S3 Kılavuz Standartları',
        society: 'Deutsche Gesellschaft für Anästhesiologie und Intensivmedizin (DGAI)',
        awmf: 'AWMF Leitlinienportal Anästhesie & Intensivmedizin',
        year: '2023',
        recommendation: 'Strukturierte Priorisierung nach dem ABCDE-Schema, Patientensicherheit vor Detailwissen, evidenzbasierte DGAI-Algorithmen.',
        recommendation_tr: 'ABCDE şemasına göre yapılandırılmış önceliklendirme, detay bilgiden önce hasta güvenliği ve kanıta dayalı DGAI algoritmaları.'
      },
      dosages: [
        { drug: 'Adrenalin (Notfall-Rescue)', drug_tr: 'Adrenalin (Acil Kurtarma)', dose: '10–50 µg i.v. titriert / 1 mg bei ALS-CPR', dose_tr: '10–50 µg i.v. titre / ALS-KPR de 1 mg', route: 'i.v. / i.o.', maxDose: 'Ziel-MAP ≥ 65 mmHg', maxDose_tr: 'Hedef MAP ≥ 65 mmHg', limits: 'Titration nach Wirkung', limits_tr: 'Etkiye göre dikkatli titrasyon' },
        { drug: 'Atropin (Symptomatische Bradykardie)', drug_tr: 'Atropin (Semptomatik Bradikardi)', dose: '0,5 mg i.v. Bolus', dose_tr: '0,5 mg i.v. bolus', route: 'i.v.', maxDose: 'Wiederholung bis max. 3 mg', maxDose_tr: 'Maks. 3 mg a kadar tekrarlanabilir', limits: 'Paradoxer Effekt bei Dosis < 0,5 mg', limits_tr: '< 0,5 mg dozlarda paradoksal bradikardi etkisi' },
        { drug: 'Kristalloide Infusion', drug_tr: 'Kristalloid İnfüzyon', dose: 'Vollelektrolytlösung 500–1000 ml Bolus', dose_tr: 'Dengeli tam elektrolit solüsyonu 500–1000 ml bolus', route: 'i.v.', maxDose: 'Normovolämie sichern', maxDose_tr: 'Normovoleminin sağlanması', limits: 'Balancierte Lösungen bevorzugen', limits_tr: 'Dengeli (balanse) solüsyonlar tercih edilir' }
      ],
      koPitfalls: [
        { mistake: 'Unstrukturiertes Agieren ohne ABCDE-Priorisierung bei vitaler Gefährdung', mistake_tr: 'Hayati tehlike altında ABCDE önceliklendirmesi olmadan düzensiz hareket etmek', whyFatal: 'Führt zum Übersehen lebensbedrohlicher Basiskomplikationen (Hypoxie, Spannungspneu, Verblutung).', whyFatal_tr: 'Hayatı tehdit eden temel komplikasyonların (hipoksi, tansiyon pnömotoraks, masif kanama) gözden kaçmasına yol açar.', correctAction: 'Immer laut und klar: "Ich arbeite strikt nach ABCDE. Punkt A ist gesichert..."', correctAction_tr: 'Daima yüksek sesle ve net: "ABCDE şemasına göre ilerliyorum. A (Havayolu) güvende..."' },
        { mistake: 'Unterlassen von Hilfeanforderung (Team-Kommunikation)', mistake_tr: 'Yardım çağırmamak (Ekip İletişimi Eksikliği)', whyFatal: 'Überlastung in kritischen Notfallsituationen ist einer der häufigsten Durchfallgründe in der ÄKNO.', whyFatal_tr: 'Kritik acil durumlarda tek başına kalmak ÄKNO sözlü sınavında en sık kalma nedenlerinden biridir.', correctAction: 'Sofortige Ansage: "Ich rufe den Oberarzt hinzu und weise die Pflege im Closed-Loop an."', correctAction_tr: 'Derhal net ifade: "Kıdemli/uzman hekimi (Oberarzt) çağırıyorum ve ekibe Closed-Loop talimat veriyorum."' }
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
        limit_tr: d.maxDose_tr || d.limit_tr || '',
        maxDose_tr: d.maxDose_tr || d.limit_tr || '',
        note: d.limits || d.note || (d.route ? `Applikation: ${d.route}` : 'Strikte Leitlinienüberwachung'),
        limits: d.limits || d.note || (d.route ? `Applikation: ${d.route}` : 'Strikte Leitlinienüberwachung'),
        note_tr: d.limits_tr || d.note_tr || '',
        limits_tr: d.limits_tr || d.note_tr || ''
      }));
    }
    if (res.guideline) {
      res.guideline.org = res.guideline.society || res.guideline.org || 'DGAI / BDA';
      res.guideline.society = res.guideline.society || res.guideline.org || 'DGAI / BDA';
      res.guideline.title_tr = res.guideline.title_tr || 'DGAI / BDA Uzmanlık Kılavuzu';
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
      systematicSteps_tr: {
        step1_oxygenation: '4 l O2 altında hipoksemi (PaO2 64 mmHg). Horovitz indeksi düşmüş (~170 mmHg) -> Akciğer tutulumu / başlangıç evre ARDS.',
        step2_acidBase: 'Ağır asidemi (pH 7,18 < 7,35).',
        step3_compensation: 'Kısmi solunumsal kompanzasyonlu primer metabolik asidoz (pCO2 hiperventilasyonla 28 mmHg\'ye düşürülmüş, HCO3 11, BE -14).',
        step4_anionGap: 'Anyon açığı: AG = 136 - (101 + 11) = 24 mmol/l (artmış, > 12). Neden: Septik şokta doku hipoperfüzyonuna bağlı ağır hiperlaktatemi (7,4 mmol/l).'
      },
      clinicalAction: 'Fokussanierung, Noradrenalin Ziel-MAP ≥ 65, 30 ml/kg Kristalloide, kalkulierte Breitspektrum-Antibiose innerhalb 1 Stunde.',
      clinicalAction_tr: 'Odak kontrolü/cerrahi, Noradrenalin hedef MAP ≥ 65, 30 ml/kg dengeli kristaloid, ilk 1 saat içinde geniş spektrumlu antibiyotik.'
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
      systematicSteps_tr: {
        step1_oxygenation: 'Ağır arteryel hipoksemi (PaO2 54 mmHg).',
        step2_acidBase: 'Belirgin asidemi (pH 7,24).',
        step3_compensation: 'Kronik zemin üzerine akut solunumsal asidoz. Kronik renal ön kompanzasyon (HCO3 31 mmol/l, BE +6), akut CO2 retansiyonu ile dekompanse (pCO2 72 mmHg).',
        step4_anionGap: 'Normal anyon açığı, normal laktat (1,4). Saf ventilasyon yetersizliği (solunum pompası tükenmesi).'
      },
      clinicalAction: 'Sofortige Nicht-invasive Beatmung (NIV) mit PEEP 4–5 und PS 8–12 cmH2O. Keine unkontrollierte Hyperoxie! Intubationsbereitschaft bei Vigilanzminderung.',
      clinicalAction_tr: 'Derhal non-invaziv mekanik ventilasyon (NIV) PEEP 4–5 ve PS 8–12 cmH2O. Kontrolsüz hiperoksiden kaçın! Bilinç bozulursa entübasyon hazırlığı.'
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
      systematicSteps_tr: {
        step1_oxygenation: 'O2 parsiyel basıncı normal (oda havasında PaO2 98 mmHg).',
        step2_acidBase: 'Hayati tehlike oluşturan derin asidemi (pH 7,08).',
        step3_compensation: 'Maksimal respiratuar Kussmaul kompanzasyonu gösteren en ağır metabolik asidoz (HCO3 6 mmol/l, pCO2 18 mmHg\'ye düşmüş).',
        step4_anionGap: 'Masif artmış anyon açığı: AG = 132 - (96 + 6) = 30 mmol/l. Neden: Keton cisimleri (Beta-hidroksibütirat & Asetoasetat).'
      },
      clinicalAction: 'Flüssigkeitssubstitution (NaCl 0,9% / Vollelektrolyt), Normalinsulin 0,1 IE/kg/h i.v. Perfusor (erst wenn Kalium > 3,5 mmol/l!), engmaschige Kaliumkontrolle.',
      clinicalAction_tr: 'Sıvı resüsitasyonu (%0,9 NaCl / dengeli elektrolit), i.v. regüler insülin perfüzörü 0,1 IU/kg/sa (yalnızca Potasyum > 3,5 mmol/l olduğunda!), yakın potasyum takibi.'
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
      systematicSteps_tr: {
        step1_oxygenation: 'Orta derece oksijenasyon bozukluğu (PaO2 82 mmHg), hipervolemiye bağlı akciğer ödemi riski.',
        step2_acidBase: 'Hafif asidemi (pH 7,32).',
        step3_compensation: 'Hafif dilüsyon (seyrelme) asidozu.',
        step4_anionGap: 'Akut ağır hiponatremi (Na 112 mmol/l) ve elektrolitsiz yıkama sıvısının (Glisin/Sorbitol) masif intravasküler emilimine bağlı ani hemoglobin düşüşü.'
      },
      clinicalAction: 'OP sofort stoppen! Furosemid 20–40 mg i.v., bei neurologischen Symptomen/Krämpfen hypertones Kochsalz NaCl 3% (100 ml über 10–15 min). Maximaler Na-Anstieg: 8–10 mmol/l in 24h zur Vermeidung einer pontinen Myelinolyse!',
      clinicalAction_tr: 'Ameliyatı DERHAL durdurun! Furosemid 20–40 mg i.v., nörolojik bulgu/nöbette hipertonik tuzlu su %3 NaCl (10–15 dakikada 100 ml). Pontin miyelinolizisten kaçınmak için 24 saatte maksimum Na artışı: 8–10 mmol/l!'
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
      systematicSteps_tr: {
        step1_oxygenation: 'İntrapulmoner şant ve ventilasyon-perfüzyon uyumsuzluğuna bağlı ağır arteryel hipoksemi (oda havasında PaO2 52 mmHg).',
        step2_acidBase: 'Belirgin alkademi (pH 7,52 > 7,45).',
        step3_compensation: 'Masif refleks hiperventilasyona bağlı akut solunumsal alkaloz (pCO2 26 mmHg). Renal kompanzasyon henüz yok (BE ve HCO3 normal).',
        step4_anionGap: 'Normal anyon açığı (AG 12 mmol/l). Miyokard ve periferik perfüzyon bozukluğuna bağlı orta derecede laktat artışı.'
      },
      clinicalAction: '100% Sauerstoffgabe, Notfall-Echokardiographie (FATE: Rechtsherzbelastung, McConnell-Zeichen), therapeutische Antikoagulation (Heparin 5000 IE Bolus), bei Kreislaufinstabilität/Schock sofortige systemische Fibrinolyse (Alteplase rt-PA 100 mg).',
      clinicalAction_tr: '%100 oksijen tedavisi, acil odaklanmış ekokardiyografi (FATE: sağ kalp yüklenmesi, McConnell belirtisi), terapötik antikoagülasyon (Heparin 5000 IU bolus), hemodinamik instabilite/şokta derhal sistemik fibrinoliz (Alteplase rt-PA 100 mg).'
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
      systematicSteps_tr: {
        step1_oxygenation: 'Normal arteryel oksijenasyon (PaO2 94 mmHg).',
        step2_acidBase: 'Normal/sınırda pH (7,39); ancak bu değer hayati tehlike oluşturan ağır bir mikst bozukluğu gizlemektedir!',
        step3_compensation: 'Eşzamanlı primer solunumsal alkaloz (solunum merkezinin doğrudan uyarılmasıyla pCO2 21 mmHg) VE primer metabolik asidoz.',
        step4_anionGap: 'Masif artmış anyon açığı: AG = 140 - (105 + 12) = 23 mmol/l (> 12). Neden: Oksidatif fosforilasyonun bozulmasıyla laktat, salisilat ve ketoasit birikimi.',
      },
      clinicalAction: 'Urin-Alkalisierung mit Natriumbikarbonat 8,4% (Ziel-Urin-pH 7,5–8,0 zur Ionenfalle und renalen Ausscheidung), Kaliumsubstitution, bei Spiegeln > 80–100 mg/dl oder Enzephalopathie sofortige Hämodialyse!',
      clinicalAction_tr: 'Sodyum bikarbonat %8,4 ile idrar alkalinizasyonu (iyon tuzağı ve böbrekten atılım için hedef idrar pH 7,5–8,0), potasyum replasmanı, kan düzeyi > 80–100 mg/dl veya ensefalopatide derhal hemodiyaliz!'
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
      systematicSteps_tr: {
        step1_oxygenation: 'İyi oksijenasyon (PaO2 92 mmHg).',
        step2_acidBase: 'Belirgin alkademi (pH 7,56 > 7,45).',
        step3_compensation: 'Hipoventilasyonla kısmi kompanzasyon gösteren ağır metabolik alkaloz (HCO3 40 mmol/l, BE +15, pCO2 46 mmHg\'ye yükselmiş).',
        step4_anionGap: 'Normal anyon açığı. Sitratın kalsiyumu bağlaması nedeniyle kritik iyonize hipokalsemi (0,78 mmol/l) ve hipokalemi.'
      },
      clinicalAction: 'Sofortige Kalziumsubstitution mit Kalziumchlorid 10% (10–20 ml i.v.), Kaliumsubstitution, vorsichtige Beatmung (keine Hyperventilation, da Alkalose die Hypokalzämie verschlimmert).',
      clinicalAction_tr: 'Kalsiyum klorür %10 (10–20 ml i.v.) ile derhal kalsiyum replasmanı, potasyum desteği, dikkatli ventilasyon (hiperventilasyondan kaçının; alkaloz hipokalsemiyi daha da derinleştirir).'
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
      systematicSteps_tr: {
        step1_oxygenation: 'Yeterli oksijenasyon (2 l O2 altında PaO2 88 mmHg).',
        step2_acidBase: 'Hayati tehlike oluşturan derin asidemi (pH 7,12).',
        step3_compensation: 'Solunumsal karşı düzenleme gösteren ağır metabolik asidoz (HCO3 9 mmol/l, BE -18, pCO2 29 mmHg).',
        step4_anionGap: 'Sülfat, fosfat, miyoglobin ve laktat birikimine bağlı artmış anyon açığı (AG 28 mmol/l). Hayati tehdit oluşturan hiperkalemi (7,4 mmol/l!).'
      },
      clinicalAction: '1. Kardiale Membranstabilisierung: Kalziumchlorid 10% 10 ml i.v., 2. Shift-Therapie: 10 IE Altinsulin in 50 ml G40% + Salbutamol inhalativ, 3. Forcierte Hydratation mit Natriumbikarbonat (Harnalkalisierung pH > 6,5 zum Schutz vor Myoglobinzylindern), 4. Notfall-Hämodialysebereitschaft.',
      clinicalAction_tr: '1. Kardiyak membran stabilizasyonu: Kalsiyum klorür %10 10 ml i.v., 2. Hücre içi kaydırma: 50 ml %40 Dekstroz içine 10 IU regüler insülin + Salbutamol inhalasyonu, 3. Sodyum bikarbonat ile zorlu hidrasyon (miyoglobin tübüler tıkaçlarını önlemek için hedef idrar pH > 6,5), 4. Acil hemodiyaliz hazırlığı.'
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
      systematicSteps_tr: {
        step1_oxygenation: 'Hayati tehlike oluşturan ağır hipoksemi (oda havasında PaO2 42 mmHg).',
        step2_acidBase: 'Akut derin asidemi (pH 7,06 < 7,10).',
        step3_compensation: 'Saf akut kompanse edilmemiş solunumsal asidoz (pCO2 94 mmHg ile CO2 narkozu). Normal bikarbonat (26) ve BE (+0,2); çünkü böbrek kompanzasyonu 24–48 saat sürer.',
        step4_anionGap: 'Normal anyon açığı (AG 11 mmol/l). Saf hipoventilasyon bozukluğu.'
      },
      clinicalAction: 'Sofortige Beutel-Masken-Beatmung mit 100% O2! Naloxon titriert i.v. (0,04–0,08 mg alle 2 Minuten bis zum Wiedereintritt der Spontanatmung). Cave: Naloxon-Halbwertszeit (45–60 min) ist kürzer als die vieler Opioide -> Rebound-Überwachung auf Intensivstation!',
      clinicalAction_tr: '%100 O2 ile derhal balon-valf-maske ventilasyonu! Titre edilerek i.v. Nalokson (spontan solunum dönene kadar her 2 dakikada 0,04–0,08 mg). Dikkat: Nalokson yarı ömrü (45–60 dk) birçok opioidden kısadır -> Yoğun bakımda rebound izlemi!'
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
      systematicSteps_tr: {
        step1_oxygenation: '%100 O2 ile oksijenasyon şimdilik korunuyor (PaO2 120 mmHg).',
        step2_acidBase: 'Uç düzeyde, ölümcül asidemi (pH 6,98 < 7,0).',
        step3_compensation: 'Patlayıcı sitozolik kalsiyum akışına bağlı ağır kombine solunumsal (pCO2 98 mmHg) VE metabolik laktik asidoz (Laktat 12,5 mmol/l, BE -16).',
        step4_anionGap: 'Masif artmış anyon açığı (AG 30 mmol/l) ve akut öldürücü hiperkalemi (7,2 mmol/l).'
      },
      clinicalAction: 'Trigger SOFORT STOPPEN (Vapor abdrehen!), Hyperventilation mit 100% O2 maximaler Flow, Dantrolen 2,5 mg/kg i.v. Bolus sofort (wiederholen bis zu 10 mg/kg), aktive Kühlung, Kalziumchlorid + Glukose/Insulin. K.O.-Kriterium: NIEMALS Kalziumkanalblocker!',
      clinicalAction_tr: 'Tetikleyici ajanları DERHAL DURDURUN (Vaporu kapatın!), maksimum akışla %100 O2 ile hiperventilasyon, derhal Dantrolen 2,5 mg/kg i.v. bolus (10 mg/kg\'a kadar tekrar), aktif soğutma, kalsiyum klorür + glukoz/insülin. K.O. Kriteri: ASLA kalsiyum kanal blokeri vermeyin!'
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
      systematicSteps_tr: {
        step1_oxygenation: 'Hiperoksemiden kaçının! FiO2 0,6 altında PaO2 110 mmHg.',
        step2_acidBase: 'Ağır asidemi (pH 7,02).',
        step3_compensation: 'Tüm vücut dolaşım durmasına bağlı mikst metabolik (Laktat 10,8, BE -17) ve ılımlı solunumsal asidoz (pCO2 56 mmHg).',
        step4_anionGap: 'Hipoksik doku iskemisine bağlı masif genişlemiş anyon açığı (AG 22 mmol/l).'
      },
      clinicalAction: 'Zielgerichtetes Temperaturmanagement (TTM 32–36 °C), Vermeidung von Hyperoxie (Ziel SpO2 94–98%) und Hypokapnie (Normokapnie 35–45 mmHg zur Hirnperfusion), unverzüglicher Transfer ins Herzkatheterlabor (PTCA).',
      clinicalAction_tr: 'Hedefe yönelik sıcaklık yönetimi (TTM 32–36 °C), hiperoksiden (hedef SpO2 %94–98) ve hipokapniden (beyin perfüzyonu için normokapni 35–45 mmHg) kaçınma, derhal anjiyografi laboratuvarına nakil (primer PKG).'
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
      systematicSteps_tr: {
        step1_oxygenation: 'Normal oksijenasyon (PaO2 96 mmHg).',
        step2_acidBase: 'Belirgin asidemi (pH 7,22).',
        step3_compensation: 'Yeterli solunumsal kompanzasyon gösteren metabolik asidoz (HCO3 13 mmol/l, BE -12, pCO2 32 mmHg).',
        step4_anionGap: 'NORMAL anyon açığı: AG = 144 - (122 + 13) = 9 mmol/l (< 12). Laktik asidoz YOKTUR (Laktat 1,2 normal!), tablo saf dilüsyon ve klor yüklenmesidir (Cl 122 mmol/l).'
      },
      clinicalAction: 'Infusionsumstellung von NaCl 0,9% auf balancierte Vollelektrolytlösungen mit metabolisierbarem Anion (z.B. Jonosteril / Sterofundin), renale Säureausscheidung abwarten, keine Pufferung mit NaHCO3 indiziert!',
      clinicalAction_tr: 'İnfüzyon tedavisini %0,9 NaCl\'den metabolize edilebilir anyon içeren dengeli elektrolit solüsyonlarına (örn. Jonosteril / Sterofundin) çevirin, böbreğin asit atılımını bekleyin, NaHCO3 tamponlaması KONTRENDİKEDİR!'
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
        titleTR: 'Yehova Şahitleri & Kan Ürünlerinin Reddi',
        topic: 'Zeugen Jehovas & Ablehnung von Blutprodukten',
        scenario: 'Der Patient verweigert schriftlich die Gabe allogener Bluttransfusionen.',
        scenarioTR: 'Hasta allojenik kan transfüzyonunu yazılı olarak reddetmektedir.',
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
        titleTR: 'Acil Sezaryende Aydınlatma ve Onam (EEZ ≤ 20 dk)',
        topic: 'Aufklärung bei Notsectio (EEZ ≤ 20 min)',
        scenario: 'Akute fetale Bradykardie, Notsectio-Alarm im Kreißsaal.',
        scenarioTR: 'Akut fetal bradikardi, doğumhanede acil sezaryen alarmı.',
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
        titleTR: 'Hasta Vasiyeti & Sağlık Vekaletnamesi (§ 1827 / § 1901a BGB)',
        topic: 'Patientenverfügung & Vorsorgevollmacht (§ 1827 / § 1901a BGB)',
        scenario: 'Schwerstkranker Intensivpatient mit schriftlicher Patientenverfügung zum Verzicht auf Reanimation und Beatmung.',
        scenarioTR: 'Reanimasyon ve mekanik ventilasyonu reddeden yazılı hasta vasiyeti bulunan kritik yoğun bakım hastası.',
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
        titleTR: 'Fiziksel Tespit & NRW Alıkoyma Hukuku (§ 1831 BGB / PsychKG NRW)',
        topic: 'Fixierung & Unterbringungsrecht in NRW (§ 1831 BGB / PsychKG NRW)',
        scenario: 'Akut delirianter, fremdgefährdender Patient zieht an Kathetern und Tubus.',
        scenarioTR: 'Kateterlerini ve endotrakeal tüpünü çekmeye çalışan akut deliryumdaki ajite hasta.',
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
        titleTR: 'Geri Dönüşümsüz Beyin Fonksiyon Kaybı (IHA) & Organ Bağışı (TPG)',
        topic: 'Irreversibler Hirnfunktionsausfall (IHA) & Organspende (TPG)',
        scenario: 'Feststellung des Hirntodes bei potenziellem Organspender auf der Intensivstation.',
        scenarioTR: 'Yoğun bakımda potansiyel organ donöründe beyin ölümünün tespiti.',
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
        titleTR: 'Hekim Sır Saklama Yükümlülüğü & Bildirim Yetkisi (§ 203 StGB)',
        topic: 'Ärztliche Schweigepflicht & Offenbarungsbefugnis (§ 203 StGB)',
        scenario: 'Polizeiliche Ermittler verlangen auf der Intensivstation Auskunft oder Blutproben eines intoxikierten Patienten.',
        scenarioTR: 'Polis memurları yoğun bakımda entoksikasyonlu bir hastanın bilgilerini veya kan örneğini talep etmektedir.',
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
      titleTR: res.titleTR || '',
      topic: res.topic || res.title || 'ÄKNO Rechtsfrage & Aufklärung',
      rule: res.rule || res.ruleDE || 'Gemäß Berufsordnung & BGB',
      ruleDE: res.ruleDE || res.rule || 'Gemäß Berufsordnung & BGB',
      ruleTR: res.ruleTR || '',
      scenario: res.scenario || 'Klinische Entscheidungssituation',
      scenarioTR: res.scenarioTR || '',
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
  // 8. MELIS PEDAGOGICAL ENGINE (ST. ANTONIUS-HOSPITAL ESCHWEILER / ÄKNO)
  //    - Data-First Diagnostic Interpretation (Vitals, BGA, ECG, PiCCO/ROTEM/ICP)
  //    - Immediate First 3 Actions Challenge & Prüfer Follow-Up
  //    - First-Principles Physiology & Pharmacology (Why behind decisions)
  //    - Oral Exam, Frühbesprechung, Prämedikationsgespräch & Klinik-Jargon
  //    - Structured 3-Tier Exam Synthesis (Sofortmaßnahmen · Diagnostik · Pharmakologie)
  // ─────────────────────────────────────────────────────────────────────────────

  function _detectScenarioProfile(q) {
    if (!q) q = {};
    const text = ((q.stem_de || '') + ' ' + (q.question_de || '') + ' ' + (q.oral_question_de || '') + ' ' + (q.answer_de || '') + ' ' + (q.oral_answer_de || '') + ' ' + (q.category || '')).toLowerCase();

    if (text.includes('picco') || text.includes('thermodilution') || text.includes('elwi') || text.includes('gedi') || text.includes('itbi') || text.includes('schlagvolumenvariation') || text.includes('pulskontur')) {
      return 'picco';
    }
    if (text.includes('bauchaorten') || text.includes('aortenaneurysma') || text.includes('aortendissektion') || text.includes('declamping') || text.includes('cross-clamping') || text.includes('evar')) {
      return 'rbaa';
    }
    if (text.includes('schrittmacher') || text.includes('icd') || text.includes('kardioverter') || text.includes('magnetauflage') || text.includes('voo') || text.includes('do0')) {
      return 'pacemaker';
    }
    if (text.includes('reanimation') || text.includes('acls') || text.includes('kammerflimmern') || text.includes('asystolie') || text.includes('herzdruckmassage')) {
      return 'acls';
    }
    if (text.includes('maligne hyperthermie') || text.includes('dantrolen') || text.includes('masseterspasmus')) {
      return 'mh';
    }
    if (text.includes('last') || text.includes('lokalanästhetika-intox') || text.includes('intralipid') || text.includes('lipid-rescue') || (text.includes('bupivacain') && text.includes('krampf'))) {
      return 'last';
    }
    if (text.includes('anaphylax') || text.includes('allergisch') || text.includes('bronchospasmus')) {
      return 'anaphylaxis';
    }
    if (text.includes('postpartale blutung') || text.includes('atonie') || text.includes('präeklampsie') || text.includes('eklampsie') || text.includes('hellp') || text.includes('sectio') || text.includes('fruchtwasserembolie') || text.includes('schwangere')) {
      return 'obstetrics';
    }
    if (text.includes('kind') || text.includes('pädiatr') || text.includes('säugling') || text.includes('krughusten') || text.includes('epiglottitis') || text.includes('fremdkörperaspiration')) {
      return 'pediatrics';
    }
    if (text.includes('hirndruck') || text.includes('icp') || text.includes('schädel-hirn') || text.includes('sht') || text.includes('anisokorie') || text.includes('sab') || text.includes('subarachnoidal')) {
      return 'icp';
    }
    if (text.includes('sevofluran') || text.includes('desfluran') || text.includes('isofluran') || text.includes('lachgas') || text.includes('blut-gas') || text.includes('mac-wert') || text.includes('kontextsensitive') || text.includes('remifentanil')) {
      return 'pharmacology';
    }
    if (text.includes('atemweg') || text.includes('intubation') || text.includes('cico') || text.includes('koniotomie') || text.includes('laryngospasmus') || text.includes('videolaryngoskop')) {
      return 'airway';
    }
    if (text.includes('polytrauma') || text.includes('schockraum') || text.includes('massivtransfusion') || text.includes('rotem') || text.includes('fibrinogen')) {
      return 'trauma';
    }
    if (text.includes('sepsis') || text.includes('septisch') || text.includes('ards') || text.includes('lungenembolie') || text.includes('anionenlücke') || text.includes('ketoazidose') || text.includes('säure-base')) {
      return 'icu_sepsis';
    }
    if (text.includes('peridural') || text.includes('pdk') || text.includes('spinalanästhesie') || text.includes('regionalanästhesie') || text.includes('epidural')) {
      return 'regional';
    }
    return 'general';
  }

  // 8.1 DATA-FIRST DIAGNOSTIC INTERPRETATION (Monitor, BGA, ECG, Advanced Trends)
  function getDataFirstDiagnosticMonitor(q) {
    const profile = _detectScenarioProfile(q);

    const monitors = {
      rbaa: {
        scenarioBadgeDE: 'OP-Saal / Schockraum · Rupturiertes BAA (Cross-Clamping / Declamping)',
        scenarioBadgeTR: 'Ameliyathane / Şok Odası · Rüptüre AAA (Klempleme / Declamping)',
        vitals: {
          hr: '124 /min',
          bp: '78/44 mmHg',
          map: '55 mmHg (Permissiv!)',
          spo2: '95 % (O₂-Maske)',
          etco2: '29 mmHg',
          temp: '35,4 °C',
          rhythmDE: 'Sinustachykardie, flache T-Wellen, kaltschweißig',
          rhythmTR: 'Sinüs taşikardisi, düz T dalgaları, soğuk terleme'
        },
        bga: {
          ph: '7,21',
          pco2: '31 mmHg',
          po2: '86 mmHg',
          hco3: '12 mmol/l',
          be: '-13,5 mmol/l',
          lactate: '6,8 mmol/l',
          hb: '7,4 g/dl',
          electrolytes: 'Ca²⁺ 0,89 mmol/l · K⁺ 5,4 mmol/l (post-Declamping: 6,3 mmol/l!)'
        },
        advanced: {
          labelDE: 'Hämodynamik & Gerinnung (ROTEM / ZVD / Aortenklemme)',
          labelTR: 'Hemodinami & Koagülasyon (ROTEM / SVB / Aort Klempi)',
          valuesDE: 'Vor Klemme: RRsyst strikt 70–90 mmHg · Nach Cross-Clamping: SVR ↑↑, Nachlast ↑ · Nach Declamping: SVR ↓↓, Laktat-/K⁺-Washout · FIBTEM A10: 6 mm (< 10 mm)',
          valuesTR: 'Klemp öncesi: Sistolik TA 70–90 mmHg · Klemp sonrası: SVR ↑↑, Afterload ↑ · Declamping sonrası: SVR ↓↓, Laktat/K⁺ washout · FIBTEM A10: 6 mm (< 10 mm)'
        },
        patternDE: 'Mustererkennung: Retroperitoneale Tamponade mit hämorrhagischer Laktatazidose (Laktat 6,8 mmol/l) und kritischer Hypokalzämie (Ca²⁺ 0,89 mmol/l). Keine Normotension erzwingen (Gefahr: „Popping the clot“)!',
        patternTR: 'Patern Tanıma: Hemorajik laktik asidoz (Laktat 6,8 mmol/l) ve kritik hipokalsemi (Ca²⁺ 0,89 mmol/l) ile giden retroperitoneal tamponad. Klemp öncesi normotansiyona zorlama ("Popping the clot" riski)!'
      },
      picco: {
        scenarioBadgeDE: 'Intensivstation · Erweitertes Hämodynamik-Monitoring (PiCCO)',
        scenarioBadgeTR: 'Yoğun Bakım · İleri Hemodinamik Monitörizasyon (PiCCO)',
        vitals: {
          hr: '112 /min (Sinusrhythmus)',
          bp: '84/46 mmHg',
          map: '58 mmHg',
          spo2: '91 % (FiO₂ 0,65)',
          etco2: '38 mmHg',
          temp: '38,6 °C',
          rhythmDE: 'Sinustachykardie (kontrollierte Beatmung Vt 8 ml/kg PBW)',
          rhythmTR: 'Sinüs taşikardisi (kontrollü ventilasyon Vt 8 ml/kg PBW)'
        },
        bga: {
          ph: '7,26',
          pco2: '41 mmHg',
          po2: '68 mmHg',
          hco3: '17 mmol/l',
          be: '-8,2 mmol/l',
          lactate: '4,6 mmol/l',
          hb: '9,6 g/dl',
          electrolytes: 'ScvO₂ 61 % · Na⁺ 138 mmol/l · K⁺ 4,4 mmol/l'
        },
        advanced: {
          labelDE: 'Transpulmonale Thermodilution & Pulskonturanalyse (PiCCO)',
          labelTR: 'Transpulmoner Termodilüsyon & Nabız Kontur Analizi (PiCCO)',
          valuesDE: 'CI: 4,2 l/min/m² (↑) · SVRI: 1120 dyn·s·cm⁻⁵·m² (↓↓) · GEDI: 540 ml/m² (↓↓ Norm 680–800) · SVV: 19 % (> 13 %!) · ELWI: 13 ml/kg (↑↑ Norm 3–7) · PVPI: 3,6 (> 3,0)',
          valuesTR: 'CI: 4,2 l/dk/m² (↑) · SVRI: 1120 (↓↓) · GEDI: 540 ml/m² (↓↓ Normal 680–800) · SVV: %19 (> %13!) · ELWI: 13 ml/kg (↑↑ Normal 3–7) · PVPI: 3,6 (> 3,0)'
        },
        patternDE: 'Mustererkennung: Hyperdynamer distributiver Schock (CI ↑, SVRI ↓↓) mit intravasalem Volumenmangel (GEDI 540 ml/m², SVV 19 % = Fluid Responder), ABER gleichzeitigem ARDS-Permeabilitätslungenödem (ELWI 13 ml/kg, PVPI 3,6 > 3)!',
        patternTR: 'Patern Tanıma: İntravasküler hipovolemi (GEDI 540 ml/m², SVV %19 = Sıvı yanıtlı) ile birlikte hiperdinamik distributif şok (CI ↑, SVRI ↓↓), ANCAK eşlik eden ARDS permeabilite akciğer ödemi (ELWI 13 ml/kg, PVPI 3,6 > 3)!'
      },
      pacemaker: {
        scenarioBadgeDE: 'OP-Saal · Intraoperatives Schrittmacher- / ICD-Management',
        scenarioBadgeTR: 'Ameliyathane · İntraoperatif Kalp Pili (SM) / ICD Yönetimi',
        vitals: {
          hr: '34 /min (während monopolarer Kauterung)',
          bp: '68/38 mmHg',
          map: '48 mmHg',
          spo2: '94 %',
          etco2: '26 mmHg',
          temp: '36,3 °C',
          rhythmDE: 'EKG: Elektromagnetische Interferenz (EMI) -> Oversensing mit Asystolie-Pausen bei Schrittmacherabhängigkeit!',
          rhythmTR: 'EKG: Elektromanyetik İnterferans (EMİ) -> Pil bağımlı hastada Oversensing kaynaklı asistoli duraklamaları!'
        },
        bga: {
          ph: '7,34',
          pco2: '40 mmHg',
          po2: '115 mmHg',
          hco3: '21 mmol/l',
          be: '-3,0 mmol/l',
          lactate: '2,4 mmol/l',
          hb: '11,8 g/dl',
          electrolytes: 'K⁺ 4,6 mmol/l · Mg²⁺ 0,9 mmol/l · Ca²⁺ 1,18 mmol/l'
        },
        advanced: {
          labelDE: 'Aggregat-Antwort auf Ringmagnet-Auflage (SM vs. ICD)',
          labelTR: 'Halka Mıknatıs Uygulamasına Cihaz Yanıtı (Kalp Pili vs. ICD)',
          valuesDE: 'Schrittmacher + Magnet = Asynchrones Pacing (VOO/DOO, ca. 85–100/min, kein Oversensing) · ICD + Magnet = NUR Antitachykardie-/Schockfunktion (VT/VF) deaktiviert, antibradykarder SM bleibt im Bedarfsmodus (VVI/DDD)!',
          valuesTR: 'Kalp Pili + Mıknatıs = Asenkron Pacing (VOO/DOO, ~85–100/dk, oversensing durur) · ICD + Mıknatıs = SADECE antitakikardi/şok fonksiyonu devre dışı kalır, antibradikardik pil VVI/DDD modunda kalır!'
        },
        patternDE: 'Mustererkennung: Intraoperative EMI durch monopolare Diathermie täuscht dem Aggregat Eigenaktionen vor (Oversensing) -> bei SM: Inhibition/Asystolie; bei ICD: inadäquater Schock!',
        patternTR: 'Patern Tanıma: Monopolar koter kaynaklı EMİ cihazda yanlış algılamaya (Oversensing) yol açar -> Kalp pilinde inhibisyon/asistoli; ICD de ise uygunsuz şok!'
      },
      acls: {
        scenarioBadgeDE: 'OP / Schockraum · Intraoperativer Kreislaufstillstand (ERC ALS)',
        scenarioBadgeTR: 'Ameliyathane / Şok Odası · İntraoperatif Kardiyak Arrest (ERC ALS)',
        vitals: {
          hr: '0 /min (Kammerflimmern / PEA)',
          bp: 'Nicht messbar (Arterie flach)',
          map: '< 20 mmHg (unter HDM: diastolisch > 30 mmHg)',
          spo2: 'Kein Puls-Signal',
          etco2: '18 mmHg unter HDM (-> Sprung auf 42 mmHg = ROSC!)',
          temp: '35,8 °C',
          rhythmDE: 'EKG: Grobwelliges Kammerflimmern (VF) bzw. Pulslose Elektrische Aktivität (PEA)',
          rhythmTR: 'EKG: Kaba dalgalı Ventriküler Fibrilasyon (VF) veya Nabızsız Elektriksel Aktivite (NEA)'
        },
        bga: {
          ph: '7,04',
          pco2: '64 mmHg',
          po2: '88 mmHg',
          hco3: '13 mmol/l',
          be: '-16,0 mmol/l',
          lactate: '9,8 mmol/l',
          hb: '10,5 g/dl',
          electrolytes: 'K⁺ 6,4 mmol/l · Ca²⁺ 1,04 mmol/l · Glukose 145 mg/dl'
        },
        advanced: {
          labelDE: 'CPR-Qualitätsmonitoring & 4H / HITS Screening',
          labelTR: 'KPR Kalite Monitörizasyonu & 4H / HITS Taraması',
          valuesDE: 'HDM-Tiefe: 5–6 cm (100–120/min) · EtCO₂ > 15–20 mmHg bestätigt suffiziente Perfusion · Invasiver RR diastolisch ≥ 25–30 mmHg (= koronarer Perfusionsdruck) · 3. Schock -> Adrenalin 1 mg + Amiodaron 300 mg',
          valuesTR: 'Kompresyon: 5–6 cm (100–120/dk) · EtCO₂ > 15–20 mmHg kaliteli perfüzyonu doğrular · İnvaziv diyastolik TA ≥ 25–30 mmHg (= koroner perfüzyon basıncı) · 3. Şok sonrası -> Adrenalin 1 mg + Amiodaron 300 mg'
        },
        patternDE: 'Mustererkennung: Kreislaufstillstand mit kombinierter respiratorisch-metabolischer Laktatazidose. Kapnographie (EtCO₂) dient als Echtzeit-HZV-Monitor unter Herzdruckmassage und zeigt ROSC sofort durch steilen Sprung (> 35–40 mmHg) an.',
        patternTR: 'Patern Tanıma: Kombine respiratuar-metabolik laktik asidozlu kardiyak arrest. Kapnografi (EtCO₂) KPR sırasında gerçek zamanlı debi monitörüdür ve ROSC anında ani sıçrama (> 35–40 mmHg) gösterir.'
      },
      mh: {
        scenarioBadgeDE: 'OP-Saal · Akute Maligne Hyperthermie (MH-Krise)',
        scenarioBadgeTR: 'Ameliyathane · Akut Malign Hipertermi (MH Krizi)',
        vitals: {
          hr: '148 /min',
          bp: '155/92 mmHg -> fallend auf 82/45 mmHg',
          map: '57 mmHg',
          spo2: '91 % (fallend)',
          etco2: '84 mmHg (trotz Atemminutenvolumen 16 l/min!)',
          temp: '39,6 °C (+1 °C alle 5 min)',
          rhythmDE: 'Tachykarde Rhythmusstörungen, gehäufte VES, spitz-hohe T-Wellen',
          rhythmTR: 'Taşikardik ritim bozukluğu, sık VES, sivri T dalgaları'
        },
        bga: {
          ph: '6,98',
          pco2: '96 mmHg',
          po2: '92 mmHg',
          hco3: '15 mmol/l',
          be: '-16,5 mmol/l',
          lactate: '11,4 mmol/l',
          hb: '14,1 g/dl',
          electrolytes: 'K⁺ 7,1 mmol/l (Rhabdomyolyse!) · CK > 25.000 U/l · Myoglobinurie'
        },
        advanced: {
          labelDE: 'Narkosegerät & Metabolik (RYR1-Rezeptor-Entkopplung)',
          labelTR: 'Anestezi Cihazı & Metabolizma (RYR1 Reseptör Bozukluğu)',
          valuesDE: 'Inspiratorisch Sevofluran 2,0 Vol-% -> SOFORT 0 % (Vapor abnehmen!) · FGF > 10–15 l/min 100 % O₂ · Aktivkohlefilter (Vapor-Clean) · Masseterspasmus + generalisierte Muskelrigidität',
          valuesTR: 'İnspiratuar Sevofluran %2,0 -> DERHAL %0 (Vaporizatörü çıkar!) · Taze gaz > 10–15 l/dk %100 O₂ · Aktif karbon filtre · Masseter spazmı + jeneralize rijidite'
        },
        patternDE: 'Mustererkennung: Explosiver EtCO₂-Anstieg (> 60–80 mmHg trotz Hyperventilation) + Sinustachykardie als früheste Leitsymptome! Kombinierte respiratorisch-metabolische Azidose (pH 6,98) + letale Hyperkaliämie (7,1 mmol/l).',
        patternTR: 'Patern Tanıma: Hiperventilasyona rağmen patlayıcı EtCO₂ artışı (> 60–80 mmHg) + taşikardi en erken bulgulardır! Kombine respiratuar-metabolik asidoz (pH 6,98) + ölümcül hiperkalemi (7,1 mmol/l).'
      },
      last: {
        scenarioBadgeDE: 'Regionalanästhesie / Aufwachraum · LAST (Lokalanästhetika-Intoxikation)',
        scenarioBadgeTR: 'Rejyonel Anestezi / Derlenme · LAST (Lokal Anestezik Toksisitesi)',
        vitals: {
          hr: '42 /min -> polymorphe VT',
          bp: '64/32 mmHg',
          map: '43 mmHg',
          spo2: '89 %',
          etco2: '24 mmHg',
          temp: '36,5 °C',
          rhythmDE: 'EKG: PR-Verlängerung, breiter QRS-Komplex (180 ms), AV-Block III° -> Torsades / VT',
          rhythmTR: 'EKG: PR uzaması, geniş QRS kompleksi (180 ms), AV Blok III° -> Torsades / VT'
        },
        bga: {
          ph: '7,19',
          pco2: '52 mmHg',
          po2: '68 mmHg',
          hco3: '18 mmol/l',
          be: '-9,0 mmol/l',
          lactate: '5,2 mmol/l',
          hb: '12,8 g/dl',
          electrolytes: 'Na⁺ 139 mmol/l · K⁺ 4,8 mmol/l · Azidose erhöht ungebundene LA-Fraktion!'
        },
        advanced: {
          labelDE: 'ZNS-Prodromi & Kardiale Natriumkanal-Blockade (Bupivacain/Ropivacain)',
          labelTR: 'MSS Prodromu & Kardiyak Sodyum Kanal Blokajı',
          valuesDE: 'Prodromi: Metallischer Geschmack, periorale Taubheit, Tinnitus, verwaschene Sprache -> Generalisierter tonisch-klonischer Krampfanfall -> Refraktärer kardiogener Schock',
          valuesTR: 'Prodrom: Ağızda metalik tat, perioral uyuşma, kulak çınlaması, dizartri -> Jeneralize tonik-klonik nöbet -> Dirençli kardiyojenik şok'
        },
        patternDE: 'Mustererkennung: Biphasischer Verlauf (1. ZNS-Exzitation/Krampf -> 2. ZNS-Depression + schwere kardiale Leitungsblockade durch Na⁺-Kanal-Arrest). Hypoxie und Azidose unbedingt vermeiden (Ion-Trapping verstärkt Kardiotoxizität)!',
        patternTR: 'Patern Tanıma: Bifazik seyir (1. MSS eksitasyonu/nöbet -> 2. MSS depresyonu + Na⁺ kanal blokajına bağlı ağır iletim bloğu). Hipoksi ve asidoz kesinlikle önlenmelidir (İyon tuzağı kardiyotoksisiteyi katlar)!'
      },
      anaphylaxis: {
        scenarioBadgeDE: 'OP-Einleitung · Perioperative Anaphylaxie Grad III/IV',
        scenarioBadgeTR: 'Anestezi İndüksiyonu · Perioperatif Anafilaksi Evre III/IV',
        vitals: {
          hr: '138 /min',
          bp: '54/28 mmHg',
          map: '37 mmHg',
          spo2: '84 %',
          etco2: '19 mmHg (steil ansteigende Kapnographie-Rampe / „Shark-Fin“)',
          temp: '36,4 °C',
          rhythmDE: 'Massive Sinustachykardie, Niedervoltage durch kapilläres Leck',
          rhythmTR: 'Masif sinüs taşikardisi, kapiller kaçak kaynaklı düşük voltaj'
        },
        bga: {
          ph: '7,23',
          pco2: '54 mmHg',
          po2: '56 mmHg',
          hco3: '20 mmol/l',
          be: '-6,5 mmol/l',
          lactate: '4,9 mmol/l',
          hb: '16,2 g/dl (Hämokonzentration durch Plasmaextravasation!)',
          electrolytes: 'Serum-Tryptase nach 1–2 h abnehmen! · K⁺ 4,2 mmol/l'
        },
        advanced: {
          labelDE: 'Beatmungsmechanik & Hämodynamik (Distributiv + Bronchospasmus)',
          labelTR: 'Ventilasyon Mekaniği & Hemodinami (Distributif + Bronkospazm)',
          valuesDE: 'Spitzendruck Ppeak: 46 mbar (↑↑) · Plateaudruck Pplat: 24 mbar · Flush / Urtikaria / Angioödem · Bis zu 35 % des Intravasalvolumens extravasiert binnen 10 Minuten!',
          valuesTR: 'Pik basınç Ppeak: 46 mbar (↑↑) · Plato basıncı Pplat: 24 mbar · Flush / Ürtiker / Anjiyoödem · 10 dakikada intravasküler hacmin %35 i damar dışına kaçar!'
        },
        patternDE: 'Mustererkennung: Unmittelbar nach Narkoseinduktion (Rocuronium / Antibiotikum): Ppeak ↑↑ + „Shark-Fin“-Kapnogramm (schwerer Bronchospasmus) + tiefer Blutdrucksturz mit Hämokonzentration (Hb 16,2 g/dl).',
        patternTR: 'Patern Tanıma: İndüksiyondan hemen sonra (Roküronyum / Antibiyotik): Ppeak ↑↑ + "Shark-Fin" kapnogram (ağır bronkospazm) + hemokonsantrasyonlu (Hb 16,2 g/dl) derin hipotansiyon.'
      },
      obstetrics: {
        scenarioBadgeDE: 'Kreißsaal / Sectio-OP · Geburtshilflicher Notfall (PPH / Präeklampsie / EEZ)',
        scenarioBadgeTR: 'Doğumhane / Sezaryen · Obstetrik Acil (PPH / Preeklampsi / Acil Sezaryen)',
        vitals: {
          hr: '128 /min (bei PPH) bzw. 105 /min (bei Eklampsie)',
          bp: '76/42 mmHg (PPH) bzw. 185/115 mmHg (Schwere Präeklampsie)',
          map: '53 mmHg (PPH) / 138 mmHg (Präeklampsie)',
          spo2: '93 %',
          etco2: '30 mmHg (Schwangerschaftsnorm: 28–32 mmHg!)',
          temp: '36,1 °C',
          rhythmDE: 'Sinustachykardie (Schockindex HF/RRsyst > 1,1 = manifester PPH-Schock!)',
          rhythmTR: 'Sinüs taşikardisi (Şok İndeksi KAH/Sistolik TA > 1,1 = aşikar PPH şoku!)'
        },
        bga: {
          ph: '7,28',
          pco2: '30 mmHg',
          po2: '89 mmHg',
          hco3: '15 mmol/l',
          be: '-9,8 mmol/l',
          lactate: '4,8 mmol/l',
          hb: '6,9 g/dl',
          electrolytes: 'Fibrinogen 1,1 g/l (kritisch < 2,0 g/l!) · Thrombozyten 62 G/l · Ca²⁺ 0,94 mmol/l'
        },
        advanced: {
          labelDE: 'ROTEM & Uteroplazentare Physiologie',
          labelTR: 'ROTEM & Uteroplasental Fizyoloji',
          valuesDE: 'FIBTEM A5: 7 mm (< 12 mm bei PPH pathologisch!) · Schwangeren-Fibrinogen-Norm am Termin: 4–6 g/l! · 15° Linksseitenlage gegen Vena-cava-Kompressionssyndrom · EEZ bei Notsectio ≤ 20 min',
          valuesTR: 'FIBTEM A5: 7 mm (PPH de < 12 mm patolojik!) · Termde gebelik fibrinojen normali: 4–6 g/l! · Aortokaval kompresyona karşı 15° sol yan pozisyon · Acil sezaryende EEZ ≤ 20 dk'
        },
        patternDE: 'Mustererkennung: Ein Fibrinogen von 2,0 g/l ist bei einer Nicht-Schwangeren normal, bei einer Kreißenden mit PPH jedoch bereits Ausdruck einer schweren Koagulopathie (Frühmarker der Hyperfibrinolyse)!',
        patternTR: 'Patern Tanıma: Gebe olmayan birinde normal sayılan 2,0 g/l fibrinojen, doğum sonu kanamalı (PPH) bir gebede ağır koagülopatinin ve hiperfibrinolizin erken göstergesidir!'
      },
      pediatrics: {
        scenarioBadgeDE: 'Kinder-OP / Schockraum · Pädiatrischer Atemwegs- & Kreislaufnotfall',
        scenarioBadgeTR: 'Pediatrik Ameliyathane · Çocuk Havayolu & Dolaşım Acili',
        vitals: {
          hr: '165 /min -> kritischer Abfall auf 56 /min (Hypoxie-Bradykardie!)',
          bp: '62/34 mmHg',
          map: '43 mmHg',
          spo2: '78 % (rasant fallend wegen hoher O₂-Verbrauchsrate + kleiner FRC)',
          etco2: 'Kein Plateau (Laryngospasmus) bzw. 62 mmHg',
          temp: '36,2 °C',
          rhythmDE: 'EKG: Hypoxie-induzierte Sinusbradykardie (< 60/min beim Säugling/Kleinkind = CPR-Indikation!)',
          rhythmTR: 'EKG: Hipoksi kaynaklı sinüs bradikardisi (< 60/dk süt çocuğunda = KPR endikasyonu!)'
        },
        bga: {
          ph: '7,18',
          pco2: '64 mmHg',
          po2: '48 mmHg',
          hco3: '21 mmol/l',
          be: '-5,5 mmol/l',
          lactate: '3,8 mmol/l',
          hb: '11,2 g/dl',
          electrolytes: 'Glukose 54 mg/dl · Na⁺ 137 mmol/l · K⁺ 4,7 mmol/l'
        },
        advanced: {
          labelDE: 'Pädiatrische Physiologie & Dosierungs-Sicherheit',
          labelTR: 'Pediatrik Fizyoloji & Doz Güvenliği',
          valuesDE: 'O₂-Verbrauch Kind: 6–8 ml/kg/min (Erwachsener: 3 ml/kg/min) · Closing Capacity > FRC -> rascher Alveolarkollaps · PEEP + CPAP mit 100 % O₂ + Larson-Handgriff · Adrenalin CPR: 10 µg/kg (0,01 mg/kg)',
          valuesTR: 'Çocuk O₂ tüketimi: 6–8 ml/kg/dk (Erişkin: 3 ml/kg/dk) · Closing Capacity > FRC -> hızlı alveoler kollaps · %100 O₂ CPAP + Larson manevrası · Adrenalin KPR: 10 µg/kg'
        },
        patternDE: 'Mustererkennung: Beim Kind ist die Bradykardie (HF < 60/min) fast immer die direkte Folge einer schweren Hypoxie! Das HZV des Kleinkindes ist streng herzfrequenzabhängig (unelastisches Myokard, fixes Schlagvolumen).',
        patternTR: 'Patern Tanıma: Çocukta bradikardi (KAH < 60/dk) neredeyse her zaman ağır hipoksinin doğrudan sonucudur! Küçük çocuğun kalp debisi tamamen kalp hızına bağımlıdır (sabit atım hacmi).'
      },
      icp: {
        scenarioBadgeDE: 'Schockraum / Neuro-ITS · Schweres SHT & Intrakranielle Hypertension (ICP)',
        scenarioBadgeTR: 'Şok Odası / Nöro-YBÜ · Ağır Kafa Travması & KİBAS (ICP)',
        vitals: {
          hr: '48 /min (Cushing-Reflex!)',
          bp: '178/96 mmHg (Cushing-Hypertonie)',
          map: '123 mmHg -> bei Abfall auf 70 mmHg droht Einklemmung!',
          spo2: '97 %',
          etco2: '36 mmHg (Ziel-PaCO₂: 35–38 mmHg!)',
          temp: '36,6 °C',
          rhythmDE: 'Cushing-Trias: Arterielle Hypertonie + Sinusbradykardie + unregelmäßige Atmung',
          rhythmTR: 'Cushing Triadı: Arteriyel hipertansiyon + Sinüs bradikardisi + düzensiz solunum'
        },
        bga: {
          ph: '7,38',
          pco2: '37 mmHg',
          po2: '112 mmHg',
          hco3: '22 mmol/l',
          be: '-1,5 mmol/l',
          lactate: '2,2 mmol/l',
          hb: '11,5 g/dl',
          electrolytes: 'Na⁺ 146 mmol/l (Ziel 145–155 mmol/l unter Osmotherapie) · Glukose 135 mg/dl'
        },
        advanced: {
          labelDE: 'Neuro-Monitoring (Monro-Kellie-Doktrin & CPP-Steuerung)',
          labelTR: 'Nöro-Monitörizasyon (Monro-Kellie Doktrini & CPP Yönetimi)',
          valuesDE: 'ICP: 28 mmHg (pathologisch > 20–22 mmHg!) · Ziel-CPP (CPP = MAP − ICP): 60–70 mmHg (daher MAP ≥ 90 mmHg nötig!) · Pupillen: Anisokorie rechts weit/lichtstarr · 30°-Oberkörperhochlagerung achsengerecht',
          valuesTR: 'ICP: 28 mmHg (patolojik > 20–22 mmHg!) · Hedef CPP (CPP = MAP − ICP): 60–70 mmHg (bu yüzden MAP ≥ 90 mmHg şart!) · Pupiller: Sağda anizokori · 30° baş nötral elevasyon'
        },
        patternDE: 'Mustererkennung: Cushing-Trias + Anisokorie = drohende transtentorielle Herniation bei ICP 28 mmHg! Nach CPP = MAP − ICP darf der hohe Blutdruck NICHT aggressiv gesenkt werden, sonst bricht die zerebrale Perfusion zusammen.',
        patternTR: 'Patern Tanıma: Cushing triadı + anizokori = ICP 28 mmHg ile yakın transtentoriyel herniasyon! CPP = MAP − ICP formülü gereği yüksek tansiyon agresif düşürülmemelidir, aksi halde beyin perfüzyonu çöker.'
      },
      pharmacology: {
        scenarioBadgeDE: 'OP-Saal · Narkosetiefe, Gas-Kinetik & Pharmakodynamik-Monitor',
        scenarioBadgeTR: 'Ameliyathane · Anestezi Derinliği, Gaz Kinetiği & Farmakodinami Monitörü',
        vitals: {
          hr: '68 /min',
          bp: '108/62 mmHg',
          map: '77 mmHg',
          spo2: '99 % (FiO₂ 0,40)',
          etco2: '36 mmHg',
          temp: '36,5 °C',
          rhythmDE: 'Normofrequenter Sinusrhythmus, stabile Hämodynamik',
          rhythmTR: 'Normofrekanslı sinüs ritmi, stabil hemodinami'
        },
        bga: {
          ph: '7,40',
          pco2: '38 mmHg',
          po2: '145 mmHg',
          hco3: '24 mmol/l',
          be: '+0,2 mmol/l',
          lactate: '1,1 mmol/l',
          hb: '13,2 g/dl',
          electrolytes: 'Na⁺ 140 mmol/l · K⁺ 4,1 mmol/l · Ca²⁺ 1,22 mmol/l'
        },
        advanced: {
          labelDE: 'Gasbank, BIS/EEG & Neuromuskuläres Monitoring (TOF)',
          labelTR: 'Gaz Analizörü, BİS/EEG & Nöromüsküler Monitörizasyon (TOF)',
          valuesDE: 'F_I/F_A Sevofluran: 2,2 / 1,8 Vol-% (MAC 0,9) · λ_B/G: Desfluran 0,42 vs. Sevofluran 0,65 vs. Isofluran 1,4 · BIS: 44 (Ziel 40–60) · Remifentanil CSHT: 3–4 min · TOF-Ratio vor Extubation zwingend > 0,90!',
          valuesTR: 'F_I/F_A Sevofluran: %2,2 / %1,8 (MAC 0,9) · λ_B/G: Desfluran 0,42 vs. Sevofluran 0,65 vs. İzofluran 1,4 · BİS: 44 (Hedef 40–60) · Remifentanil CSHT: 3–4 dk · Ekstübasyon öncesi TOF > 0,90 şart!'
        },
        patternDE: 'Mustererkennung: Das Verhältnis von alveolärer zu inspiratorischer Konzentration (F_A/F_I) bestimmt die Einschlafgeschwindigkeit: Niedriger Blut-Gas-Koeffizient (λ_B/G) + niedriges HZV = schneller Anstieg von F_A/F_I!',
        patternTR: 'Patern Tanıma: Alveoler konsantrasyonun inspiratuar konsantrasyona oranı (F_A/F_I) uyuma hızını belirler: Düşük kan-gaz katsayısı (λ_B/G) + düşük kalp debisi = hızlı F_A/F_I yükselişi!'
      },
      airway: {
        scenarioBadgeDE: 'OP-Einleitung / Schockraum · Schwieriger Atemweg & Oxygenierung',
        scenarioBadgeTR: 'Ameliyathane / Şok Odası · Zor Havayolu & Oksijenasyon',
        vitals: {
          hr: '118 /min -> Abfall auf 46 /min bei Hypoxie',
          bp: '142/88 mmHg',
          map: '106 mmHg',
          spo2: '76 % (kritische Desaturierung!)',
          etco2: '0 mmHg (flache Nulllinie = fehlende Alveolarventilation!)',
          temp: '36,4 °C',
          rhythmDE: 'Tachykardie mit Übergang in hypoxische Sinusbradykardie',
          rhythmTR: 'Hipoksik sinüs bradikardisine geçen taşikardi'
        },
        bga: {
          ph: '7,16',
          pco2: '72 mmHg (Anstieg +3–4 mmHg/min in Apnoe)',
          po2: '44 mmHg',
          hco3: '24 mmol/l',
          be: '-2,5 mmol/l',
          lactate: '3,2 mmol/l',
          hb: '13,5 g/dl',
          electrolytes: 'K⁺ 4,6 mmol/l (Cave: Succinylcholin +0,5 mmol/l!) · Ca²⁺ 1,20 mmol/l'
        },
        advanced: {
          labelDE: 'Kapnographie, Präoxygenierung & DGAI-Stufenplan',
          labelTR: 'Kapnografi, Preoksijenasyon & DGAI Basamaklı Planı',
          valuesDE: 'EtO₂ nach Präoxygenierung: Ziel ≥ 90 % · Kapnographie = Goldstandard zum Ausschluss der Ösophagusintubation · Max. 2–3 Intubationsversuche (VL) -> Plan B: Zweitgenerations-LMA -> Plan D bei CICO: eFONA (Skalpell-Bougie-Tubus 6.0)',
          valuesTR: 'Preoksijenasyon sonrası EtO₂: Hedef ≥ %90 · Kapnografi = Özofagus entübasyonunu dışlamada altın standart · Maks. 2–3 deneme (VL) -> Plan B: 2. Nesil LMA -> CICO da Plan D: eFONA (Skalpel-Buji-Tüp 6.0)'
        },
        patternDE: 'Mustererkennung: Fehlende EtCO₂-Kurve nach Intubation gilt bis zum Beweis des Gegenteils als Fehlintubation („No trace = wrong place“)! Bei CICO-Situation rettet nicht der 5. Laryngoskopieversuch, sondern die eFONA-Koniotomie das Leben.',
        patternTR: 'Patern Tanıma: Entübasyon sonrası EtCO₂ dalgasının olmaması aksi kanıtlanana kadar özofagus entübasyonudur ("No trace = wrong place")! CICO durumunda 5. laringoskopi değil, eFONA krikotiroidotomi hayat kurtarır.'
      },
      trauma: {
        scenarioBadgeDE: 'Schockraum · Polytrauma, Hämorrhagischer Schock & ROTEM',
        scenarioBadgeTR: 'Şok Odası · Politravma, Hemorajik Şok & ROTEM',
        vitals: {
          hr: '134 /min',
          bp: '72/40 mmHg',
          map: '51 mmHg',
          spo2: '92 %',
          etco2: '25 mmHg (niedriges HZV / vergrößerter Totraum)',
          temp: '34,6 °C (Hypothermie der tödlichen Trias!)',
          rhythmDE: 'Sinustachykardie, schmale Komplexe, hohes Pulsdruck-Variation-Signal',
          rhythmTR: 'Sinüs taşikardisi, dar kompleks, yüksek nabız basıncı varyasyonu'
        },
        bga: {
          ph: '7,17',
          pco2: '34 mmHg',
          po2: '78 mmHg',
          hco3: '12 mmol/l',
          be: '-14,8 mmol/l (Schock-Marker!)',
          lactate: '7,2 mmol/l',
          hb: '6,8 g/dl',
          electrolytes: 'Ca²⁺ ionisiert: 0,81 mmol/l (Zitrat-Hypokalzämie!) · K⁺ 5,3 mmol/l'
        },
        advanced: {
          labelDE: 'Viszkoelastische Point-of-Care-Gerinnung (ROTEM)',
          labelTR: 'Viskoelastik Yatak Başı Koagülasyon (ROTEM)',
          valuesDE: 'FIBTEM A10: 5 mm (Ziel ≥ 10–12 mm -> Fibrinogen 4–6 g i.v.!) · EXTEM CT: 112 s (Norm < 80 s -> PPSB / FFP) · EXTEM ML: > 15 % (Hyperfibrinolyse -> Tranexamsäure 1 g i.v. sofort!)',
          valuesTR: 'FIBTEM A10: 5 mm (Hedef ≥ 10–12 mm -> Fibrinojen 4–6 g i.v.!) · EXTEM CT: 112 sn (Normal < 80 sn -> PCC / TDP) · EXTEM ML: > %15 (Hiperfibrinoliz -> Traneksamik asit 1 g i.v. derhal!)'
        },
        patternDE: 'Mustererkennung: Manifeste tödliche Trias + Hypokalzämie (Raute des Todes: pH 7,17, Temp 34,6 °C, FIBTEM A10 5 mm, Ca²⁺ 0,81 mmol/l). Ohne Korrektur von Ca²⁺ ≥ 1,1 mmol/l und Temperatur ≥ 36 °C greift keine Gerinnungsfaktorengabe!',
        patternTR: 'Patern Tanıma: Aşikar ölümcül triad + hipokalsemi (Ölüm elması: pH 7,17, Isı 34,6 °C, FIBTEM A10 5 mm, Ca²⁺ 0,81 mmol/l). Ca²⁺ ≥ 1,1 mmol/l ve ısı ≥ 36 °C düzeltilmeden pıhtılaşma faktörleri çalışmaz!'
      },
      icu_sepsis: {
        scenarioBadgeDE: 'Intensivstation · Septischer Schock, ARDS & Säure-Basen-Haushalt',
        scenarioBadgeTR: 'Yoğun Bakım · Septik Şok, ARDS & Asit-Baz Dengesi',
        vitals: {
          hr: '122 /min',
          bp: '80/42 mmHg (unter Noradrenalin 0,25 µg/kg/min)',
          map: '55 mmHg (Ziel ≥ 65 mmHg)',
          spo2: '89 % (FiO₂ 0,70, PEEP 14 mbar)',
          etco2: '44 mmHg',
          temp: '38,9 °C',
          rhythmDE: 'Tachykarder Sinusrhythmus bzw. neu aufgetretenes Vorhofflimmern',
          rhythmTR: 'Taşikardik sinüs ritmi veya yeni başlayan atriyal fibrilasyon'
        },
        bga: {
          ph: '7,19',
          pco2: '48 mmHg (permissive Hyperkapnie bei ARDS)',
          po2: '63 mmHg (Horovitz PaO₂/FiO₂ = 90 mmHg = schweres ARDS!)',
          hco3: '14 mmol/l',
          be: '-12,0 mmol/l',
          lactate: '5,8 mmol/l',
          hb: '8,8 g/dl',
          electrolytes: 'Na⁺ 138 mmol/l · Cl⁻ 102 mmol/l · AG = 22 mmol/l (↑) · SID = 34 mmol/l (↓)'
        },
        advanced: {
          labelDE: 'Lungenprotektive Beatmung & Stewart-Säure-Basen-Status',
          labelTR: 'Akciğer Koruyucu Ventilasyon & Stewart Asit-Baz Analizi',
          valuesDE: 'Vt: 6 ml/kg PBW · Pplat: 26 mbar (Ziel ≤ 30) · Driving Pressure (ΔP = Pplat − PEEP): 12 mbar (Ziel < 15!) · Bauchlagerung ≥ 16 h bei PaO₂/FiO₂ < 150 mmHg',
          valuesTR: 'Vt: 6 ml/kg PBW · Pplat: 26 mbar (Hedef ≤ 30) · Driving Pressure (ΔP = Pplat − PEEP): 12 mbar (Hedef < 15!) · PaO₂/FiO₂ < 150 mmHg ise ≥ 16 saat yüzüstü (Prone) pozisyon'
        },
        patternDE: 'Mustererkennung: Schweres ARDS (Horovitz 90 mmHg) + septischer Schock mit vergrößerter Anionenlücke (AG 22 mmol/l) und erniedrigter Strong Ion Difference (SID) nach Stewart. Driving Pressure ΔP < 15 mbar ist der wichtigste Überlebensprädiktor der Beatmung!',
        patternTR: 'Patern Tanıma: Ağır ARDS (Horovitz 90 mmHg) + artmış anyon açıklı (AG 22 mmol/l) ve düşük Güçlü İyon Farklı (SID) septik şok. Driving Pressure ΔP < 15 mbar ventilasyonda sağkalımın en güçlü belirleyicisidir!'
      },
      regional: {
        scenarioBadgeDE: 'OP / Kreißsaal / Schmerzdienst · Neuroaxiale & Periphere Regionalanästhesie',
        scenarioBadgeTR: 'Ameliyathane / Doğumhane · Nöroaksiyel & Periferik Rejyonel Anestezi',
        vitals: {
          hr: '52 /min (Sympathikolyse / Bezold-Jarisch-Reflex)',
          bp: '82/46 mmHg',
          map: '58 mmHg',
          spo2: '98 %',
          etco2: '35 mmHg',
          temp: '36,4 °C',
          rhythmDE: 'Sinusbradykardie bei hoher Sympathikolyse (Th1–Th4 Nn. accelerantes)',
          rhythmTR: 'Yüksek sempatikolize (Th1–Th4 Nn. accelerantes) bağlı sinüs bradikardisi'
        },
        bga: {
          ph: '7,39',
          pco2: '38 mmHg',
          po2: '96 mmHg',
          hco3: '23 mmol/l',
          be: '-0,8 mmol/l',
          lactate: '1,3 mmol/l',
          hb: '12,4 g/dl',
          electrolytes: 'Quick 92 % · INR 1,0 · PTT 28 s · Thrombozyten 185 G/l'
        },
        advanced: {
          labelDE: 'DGAI-Antikoagulations-Zeitintervalle & Blockadeausbreitung',
          labelTR: 'DGAI Antikoagülasyon Zaman Aralıkları & Blok Dağılımı',
          valuesDE: 'NMH prophylaktisch: 12 h vor / 4 h nach Punktion · NMH therapeutisch: 24 h vor / 4 h nach · DOAK (Apixaban/Rivaroxaban): 72 h vor / 6 h nach · Red Flag epidurales Hämatom/Abszess: Neue Paraparese + Blasen-/Mastdarmstörung -> Notfall-MRT!',
          valuesTR: 'DMAH profilaktik: İşlemden 12 saat önce / 4 saat sonra · DMAH terapötik: 24 saat önce / 4 saat sonra · DOAK: 72 saat önce / 6 saat sonra · Epidural hematom/apse Red Flag: Yeni paraparezi + sfinkter kusuru -> Acil MRG!'
        },
        patternDE: 'Mustererkennung: Neuroaxialer Sympathikusblock führt zu venösem Pooling (Vorlast ↓) und bei Ausbreitung auf Th1–Th4 zum Ausfall der kardialen Nn. accelerantes mit Bezold-Jarisch-Reflex (Bradykardie + Hypotonie).',
        patternTR: 'Patern Tanıma: Nöroaksiyel sempatik blok venöz göllenmeye (ön yük ↓) ve Th1–Th4 seviyesine ulaştığında kardiyak Nn. accelerantes blokajıyla Bezold-Jarisch refleksine (bradikardi + hipotansiyon) yol açar.'
      },
      general: {
        scenarioBadgeDE: 'OP / Intensivstation · Perioperatives Akut- & Risikomanagement',
        scenarioBadgeTR: 'Ameliyathane / Yoğun Bakım · Perioperatif Akut & Risk Yönetimi',
        vitals: {
          hr: '108 /min',
          bp: '88/50 mmHg',
          map: '62 mmHg',
          spo2: '93 %',
          etco2: '34 mmHg',
          temp: '36,2 °C',
          rhythmDE: 'Sinustachykardie, kontinuierliches 5-Kanal-EKG & invasive Arterie',
          rhythmTR: 'Sinüs taşikardisi, 5 kanallı EKG ve invaziv arter monitörizasyonu'
        },
        bga: {
          ph: '7,31',
          pco2: '37 mmHg',
          po2: '82 mmHg',
          hco3: '18 mmol/l',
          be: '-6,2 mmol/l',
          lactate: '3,1 mmol/l',
          hb: '10,4 g/dl',
          electrolytes: 'Na⁺ 138 mmol/l · K⁺ 4,3 mmol/l · Ca²⁺ 1,15 mmol/l · Glukose 128 mg/dl'
        },
        advanced: {
          labelDE: 'Erweitertes Trend-Monitoring (DO₂ / VO₂ & Organperfusion)',
          labelTR: 'İleri Trend Monitörizasyonu (DO₂ / VO₂ & Organ Perfüzyonu)',
          valuesDE: 'Ziel-MAP ≥ 65 mmHg (bei Hypertonikern/KHK ≥ 70 mmHg) · Stundendiurese ≥ 0,5 ml/kg/h · Laktat-Clearance alle 2 h prüfen · DO₂ = HZV × (1,34 × Hb × SaO₂)',
          valuesTR: 'Hedef MAP ≥ 65 mmHg (Hipertansif/KAH hastada ≥ 70 mmHg) · Saatlik idrar ≥ 0,5 ml/kg/saat · 2 saatte bir laktat klirensi · DO₂ = Kalp Debisi × (1,34 × Hb × SaO₂)'
        },
        patternDE: 'Mustererkennung: Beginnende Gewebehypoperfusion (Laktat 3,1 mmol/l, BE −6,2 mmol/l, MAP 62 mmHg). Frühzeitige Differenzierung zwischen Vorlastmangel, Vasoplegie und Kontraktilitätsproblem verhindert das Multiorganversagen.',
        patternTR: 'Patern Tanıma: Başlangıç evresinde doku hipoperfüzyonu (Laktat 3,1 mmol/l, BE −6,2 mmol/l, MAP 62 mmHg). Ön yük eksikliği, vazopleji ve kontraktilite sorununun erken ayrımı çoklu organ yetmezliğini önler.'
      }
    };

    return monitors[profile] || monitors.general;
  }

  // 8.2 IMMEDIATE FIRST 3 ACTIONS CHALLENGE & PRÜFER FOLLOW-UP
  function getImmediateThreeActionsChallenge(q) {
    const profile = _detectScenarioProfile(q);
    const gt = getMedicalGroundTruth(q);

    const challenges = {
      rbaa: {
        vignetteTriggerDE: 'Prüfer-Impuls (St. Antonius-Hospital Eschweiler): Der Patient mit rupturiertem Bauchaortenaneurysma (RR 78/44 mmHg, wach) liegt auf dem OP-Tisch. Was sind Ihre ERSTEN 3 SOFORTMASSNAHMEN vor dem Hautschnitt?',
        vignetteTriggerTR: 'Jüri Sorusu (St. Antonius-Hospital Eschweiler): Rüptüre AAA hastası (TA 78/44 mmHg, bilinci açık) ameliyat masasında. Cilt kesisinden önceki İLK 3 ACİL ADIMINIZ nedir?',
        firstThreeActions: [
          {
            step: 1,
            actionDE: 'Permissive Hypotonie strikt einhalten (Ziel-RRsyst 70–90 mmHg) & wachen Patienten unter 100 % O₂-Maske mit 2 großlumigen Zugängen + A. radialis versorgen.',
            actionTR: 'Permissif hipotansiyonu sıkıca koru (Hedef Sistolik TA 70–90 mmHg) ve uyanık hastaya %100 O₂ maskesi altında 2 geniş damar yolu + radyal arter aç.',
            whyDE: 'Ein Blutdruckanstieg > 100 mmHg erhöht nach dem Laplace-Gesetz die Wandspannung und sprengt das retroperitoneale Hämatom („Popping the clot“).',
            whyTR: 'Kan basıncının > 100 mmHg üzerine çıkması Laplace yasasına göre duvar gerilimini artırır ve retroperitoneal tamponadı patlatır ("Popping the clot").'
          },
          {
            step: 2,
            actionDE: 'Wach lagern, steril abwaschen & abdecken lassen – Narkoseeinleitung (RSI mit Etomidat/Ketamin + Rocuronium) ERST bei „Schnittbereit“-Ansage des Gefäßchirurgen!',
            actionTR: 'Uyanık pozisyon verdir, steril boyatıp örttür – Anestezi indüksiyonunu (RSI) SADECE damar cerrahı "Bistüri elimde, kesmeye hazırım" dediğinde yap!',
            whyDE: 'Muskelrelaxierung hebt den intraabdominellen Gegendruck (Bauchdeckentamponade) sofort auf und führt ohne unmittelbare Aortenklemme zum freien Verbluten.',
            whyTR: 'Kas gevşemesi karın duvarı tamponadını anında ortadan kaldırır; aort hemen klemplenmezse serbest masif kanama ve arrest gelişir.'
          },
          {
            step: 3,
            actionDE: 'Massivtransfusionsprotokoll (EK:FFP:TK 4:4:1), Cell-Saver, Tranexamsäure 1 g i.v., aktives Wärmemanagement & Kalziumchlorid vor Declamping vorbereiten.',
            actionTR: 'Masif transfüzyon protokolünü (4:4:1), Cell-Saver ı, Traneksamik asit 1 g i.v., aktif ısıtmayı ve Declamping öncesi Kalsiyum klorürü hazırla.',
            whyDE: 'Verhindert die tödliche Trias und fängt beim Öffnen der Aortenklemme (Declamping) den sauren Laktat-/Kalium-Washout aus der unteren Körperhälfte ab.',
            whyTR: 'Ölümcül triadı önler ve aort klempi açıldığında (Declamping) alt ekstremiteden gelen asidik laktat/potasyum washout şokunu karşılar.'
          }
        ],
        examinerFollowupDE: 'Prüfer-Nachfrage: „Frau Kollegin, warum fällt beim Declamping der Blutdruck so dramatisch ab, und warum geben Sie vorher kein Natriumbikarbonat bei geschlossener Klemme?“',
        examinerFollowupTR: 'Jüri Takip Sorusu: "Meslektaşım, Declamping anında tansiyon neden bu kadar dramatik düşer ve klemp kapalıyken neden Sodyum bikarbonat vermiyorsunuz?"',
        examinerJustificationDE: 'Antwort ab First Principles: „Beim Öffnen der Klemme sinkt der systemische Gefäßwiderstand (SVR) schlagartig ab, während saures, laktat- und kaliumreiches Blut aus der ischämischen unteren Körperhälfte eingeschwemmt wird und negativ inotrop wirkt. Natriumbikarbonat wird in CO₂ und H₂O umgewandelt; CO₂ diffundiert frei in die Myokardzellen und verschlechtert die intrazelluläre Azidose, sofern wir nicht gleichzeitig über das Atemminutenvolumen hyperventilieren!“',
        examinerJustificationTR: 'İlk İlkelerden Yanıt: "Klemp açıldığında sistemik vasküler direnç (SVR) aniden düşer ve iskemik alt yarıdan gelen laktat/potasyum yüklü asidik kan miyokardı baskılar. NaHCO₃ vücutta CO₂ ye dönüşür; CO₂ hücre zarından serbestçe geçerek miyokard içi paradoks asidozu derinleştirir, bu yüzden dakika ventilasyonu artırılmadan verilmemelidir!"'
      },
      picco: {
        vignetteTriggerDE: 'Prüfer-Impuls (Intensivstation Eschweiler): Ihr septischer Patient zeigt im PiCCO: CI 4,2 l/min/m², GEDI 540 ml/m², SVV 19 %, ELWI 13 ml/kg, PVPI 3,6. Was sind Ihre ERSTEN 3 SCHRITTE?',
        vignetteTriggerTR: 'Jüri Sorusu (Eschweiler Yoğun Bakım): Septik hastanızın PiCCO değerleri: CI 4,2 l/dk/m², GEDI 540 ml/m², SVV %19, ELWI 13 ml/kg, PVPI 3,6. İLK 3 ADIMINIZ nedir?',
        firstThreeActions: [
          {
            step: 1,
            actionDE: 'Differenzierte Befundinterpretation: Intravasaler Vorlastmangel (GEDI 540 < 680 ml/m², SVV 19 % > 13 %) bei gleichzeitigem ARDS-Permeabilitätsödem (ELWI 13 ml/kg, PVPI 3,6 > 3,0).',
            actionTR: 'Diferansiye yorum: İntravasküler ön yük eksikliği (GEDI 540 < 680 ml/m², SVV %19 > %13) İLE BİRLİKTE ARDS permeabilite akciğer ödemi (ELWI 13 ml/kg, PVPI 3,6 > 3,0).',
            whyDE: 'Ein hoher PVPI (> 3,0) beweist ein kapilläres Leck (ARDS/Sepsis) statt einer kardialen Stauung; blinde hochvolumige Flüssigkeitsbolusgabe würde das Lungenödem verschlimmern.',
            whyTR: 'Yüksek PVPI (> 3,0) kardiyojenik ödem değil kapiller kaçak (ARDS/Sepsis) olduğunu kanıtlar; körlemesine yüksek hacimli sıvı yüklemek akciğer ödemini ağırlaştırır.'
          },
          {
            step: 2,
            actionDE: 'Noradrenalin-Perfusor primär anpassen (Ziel-MAP ≥ 65 mmHg zur Anhebung des SVRI) + kleiner, kontrollierter Fluid-Challenge-Bolus (250 ml balancierte Elektrolytlösung) unter SVV/HZV-Reevaluation.',
            actionTR: 'SVRI yı artırmak için öncelikle Noradrenalin infüzyonunu titre et (Hedef MAP ≥ 65 mmHg) + SVV/Debi kontrolü altında küçük kontrollü sıvı yüklemesi (250 ml dengeli kristalloid) uygula.',
            whyDE: 'Noradrenalin rekrutiert venöses Unstressed Volume in Stressed Volume und hebt GEDI ohne zusätzliche extravaskuläre Lungenwasser-Beladung (ELWI).',
            whyTR: 'Noradrenalin venöz "unstressed" hacmi "stressed" hacme dönüştürerek akciğer suyunu (ELWI) artırmadan GEDI yi yükseltir.'
          },
          {
            step: 3,
            actionDE: 'Validitätsbedingungen der SVV prüfen (Sinusrhythmus, kontrollierte Beatmung Vt ≥ 8 ml/kg, geschlossener Thorax) – bei Arrhythmie oder Spontanatmung stattdessen Passive Leg Raising (PLR) nutzen!',
            actionTR: 'SVV nin geçerlilik şartlarını doğrula (Sinüs ritmi, kontrollü ventilasyon Vt ≥ 8 ml/kg, kapalı toraks) – aritmi veya spontan solunum varsa Passive Leg Raising (PLR) testi kullan!',
            whyDE: 'Unter Vorhofflimmern oder Spontanatmung ist die SVV falsch-positiv und unbrauchbar; die volumetrische Thermodilution (GEDI/ITBI) bleibt dagegen valide.',
            whyTR: 'Atriyal fibrilasyon veya spontan solunumda SVV yanlış pozitiftir ve kullanılamaz; volümetrik termodilüsyon (GEDI/ITBI) ise geçerliliğini korur.'
          }
        ],
        examinerFollowupDE: 'Prüfer-Nachfrage: „Warum ist der GEDI bei Ihrem beatmeten Patienten mit PEEP 15 mbar dem klassischen ZVD zur Beurteilung der Vorlast überlegen?“',
        examinerFollowupTR: 'Jüri Takip Sorusu: "PEEP 15 mbar ile ventile edilen hastanızda ön yükü değerlendirmede GEDI neden klasik SVB (ZVD) ölçümünden üstündür?"',
        examinerJustificationDE: 'Antwort ab First Principles: „Der ZVD ist ein intravasaler Druckparameter, der durch hohen intrathorakalen Druck (PEEP 15 mbar) falsch-hoch übertragen wird, obwohl der Ventrikel leer ist. GEDI und ITBI werden über die Stewart-Hamilton-Thermodilutionskurve und die Mean Transit Time als echtes enddiastolisches Volumen (in ml/m²) berechnet und sind damit unabhängig vom Beatmungsdruck.“',
        examinerJustificationTR: 'İlk İlkelerden Yanıt: "SVB (ZVD) basınç temelli bir parametredir ve yüksek intratorasik basınç (PEEP 15 mbar) nedeniyle ventrikül boş olsa bile yanlış yüksek ölçülür. GEDI ve ITBI ise Stewart-Hamilton termodilüsyon eğrisi üzerinden gerçek diyastol sonu hacmi (ml/m²) ölçtüğü için ventilatör basıncından etkilenmez."'
      },
      pacemaker: {
        vignetteTriggerDE: 'Prüfer-Impuls (OP-Saal): Während einer hemikolektomischen Präparation mit monopolarem Kauter zeigt Ihr schrittmacherabhängiger Patient plötzlich eine Asystolie am Monitor. Ihre ERSTEN 3 SOFORTMASSNAHMEN?',
        vignetteTriggerTR: 'Jüri Sorusu (Ameliyathane): Monopolar koter ile diseksiyon sırasında kalp pili bağımlı hastanızda monitörde aniden asistoli görülüyor. İLK 3 ACİL ADIMINIZ nedir?',
        firstThreeActions: [
          {
            step: 1,
            actionDE: 'Sofortige Ansage an den Operateur: „Kauter sofort STOPP!“ + Blick auf die invasive Blutdruckkurve / Plethysmographie zur Differenzierung echter Asystolie vs. EKG-Artefakt.',
            actionTR: 'Cerraha derhal seslen: "Koteri hemen DURDUR!" + Gerçek asistoli ile EKG artefaktını ayırt etmek için invaziv arter/pleth dalgasına bak.',
            whyDE: 'Monopolare Hochfrequenzchirurgie erzeugt elektromagnetische Interferenz (EMI), die vom Schrittmacher als Eigenrhythmus fehlinterpretiert wird (Oversensing -> Pacing-Inhibition).',
            whyTR: 'Monopolar koter elektromanyetik interferans (EMİ) yaratarak pilin bunu kendi kalp atımı sanmasına (Oversensing -> Pacing inhibisyonu) yol açar.'
          },
          {
            step: 2,
            actionDE: 'Ringmagnet auf das Schrittmacheraggregat auflegen -> schaltet den Herzschrittmacher in den asynchronen Modus (VOO / DOO, feste Frequenz ca. 85–100/min ohne Sensing) + Umstellung auf bipolare Diathermie.',
            actionTR: 'Kalp pili jeneratörü üzerine halka mıknatıs koy -> pili asenkron moda (VOO / DOO, algılama olmadan sabit ~85–100/dk hız) geçirir + bipolar kotere geç.',
            whyDE: 'Im VOO/DOO-Modus ist das Sensing abgeschaltet, sodass EMI das Pacing nicht mehr inhibieren kann. Neutralelektrode möglichst weit weg vom Aggregat platzieren.',
            whyTR: 'VOO/DOO modunda algılama (sensing) kapanır, böylece koter paraziti pili durduramaz. Topraklama plağı cihazdan uzağa yerleştirilir.'
          },
          {
            step: 3,
            actionDE: 'Externe Defibrillations-/Pacing-Klebeelektroden (Anterior-Posterior-Position, ≥ 10 cm Abstand zum Aggregat) bereithalten & postoperativ Schrittmacher-Kontrolle veranlassen.',
            actionTR: 'Eksternal defibrilasyon/pacing pedlerini (Anterior-Posterior pozisyon, cihaza ≥ 10 cm mesafe) hazır tut ve postoperatif pil kontrolü yaptır.',
            whyDE: 'Falls beim asynchronen Pacing ein Stimulus in die vulnerable T-Welle fällt (R-auf-T-Phänomen -> Kammerflimmern), muss sofort defibrilliert werden können.',
            whyTR: 'Asenkron pacing sırasında uyarı vulnerabl T dalgası üzerine düşerse (R-on-T fenomeni -> VF), anında defibrilasyon yapılabilmelidir.'
          }
        ],
        examinerFollowupDE: 'Prüfer-Nachfrage: „Und was passiert, wenn Sie denselben Ringmagneten auf einen implantierten Kardioverter-Defibrillator (ICD) legen? Schaltet der ICD dann auch auf VOO-Pacing um?“',
        examinerFollowupTR: 'Jüri Takip Sorusu: "Peki aynı halka mıknatısı implante kardiyoverter-defibrilatör (ICD) üzerine koyarsanız ne olur? ICD de VOO asenkron pacing moduna geçer mi?"',
        examinerJustificationDE: 'Antwort ab First Principles: „Nein, das ist eine klassische Prüfungsfalle! Bei einem ICD deaktiviert die Magnetauflage AUSSCHLIESSLICH die antitachykarde Erkennung und Schockabgabe (damit EMI keinen inadäquaten Schock auslöst). Die antibradykarde Schrittmacherfunktion eines ICD bleibt unter Magnetauflage unverändert im synchronen Bedarfsmodus (VVI/DDD)! Ist ein ICD-Patient zusätzlich schrittmacherabhängig, muss der ICD vor OP mit dem Programmiergerät auf VOO/DOO umprogrammiert werden.“',
        examinerJustificationTR: 'İlk İlkelerden Yanıt: "Hayır, bu klasik bir sınav tuzağıdır! ICD üzerine mıknatıs konduğunda SADECE antitakikardi algılaması ve şok verme özelliği devre dışı kalır (koter paraziti yanlış şok çaktırmasın diye). ICD nin antibradikardik pil fonksiyonu ise mıknatısa rağmen senkron modda (VVI/DDD) kalır! ICD hastası aynı zamanda pil bağımlıysa, ameliyat öncesi programlayıcı cihazla VOO/DOO moduna alınmalıdır."'
      }
    };

    if (challenges[profile]) return challenges[profile];

    // Tailored fallback for all other profiles using Ground Truth + Profile logic
    const step1Drug = gt.dosages && gt.dosages[0] ? `${gt.dosages[0].drug} (${gt.dosages[0].dose})` : 'Adrenalin / Noradrenalin nach Wirkung';
    const step1DrugTR = gt.dosages && gt.dosages[0] ? `${gt.dosages[0].drug_tr || gt.dosages[0].drug} (${gt.dosages[0].dose_tr || gt.dosages[0].dose})` : 'Etkiye göre Adrenalin / Noradrenalin';
    const step2Drug = gt.dosages && gt.dosages[1] ? `${gt.dosages[1].drug} (${gt.dosages[1].dose})` : 'Differenzierte Volumen- & Organprotektion';
    const step2DrugTR = gt.dosages && gt.dosages[1] ? `${gt.dosages[1].drug_tr || gt.dosages[1].drug} (${gt.dosages[1].dose_tr || gt.dosages[1].dose})` : 'Hedefe yönelik volüm ve organ koruma';
    const koMistake = gt.koPitfalls && gt.koPitfalls[0] ? gt.koPitfalls[0].mistake : 'Verzögerung der Kausaltherapie';
    const koMistakeTR = gt.koPitfalls && gt.koPitfalls[0] ? (gt.koPitfalls[0].mistake_tr || gt.koPitfalls[0].mistake) : 'Nedensel tedavinin geciktirilmesi';
    const koReason = gt.koPitfalls && gt.koPitfalls[0] ? gt.koPitfalls[0].whyFatal : 'Führt zur raschen kardiopulmonalen Dekompensation.';
    const koReasonTR = gt.koPitfalls && gt.koPitfalls[0] ? (gt.koPitfalls[0].whyFatal_tr || gt.koPitfalls[0].whyFatal) : 'Hızlı kardiyopulmoner dekompansasyona yol açar.';
    const koCorrectTR = gt.koPitfalls && gt.koPitfalls[0] ? (gt.koPitfalls[0].correctAction_tr || gt.guideline.recommendation_tr) : gt.guideline.recommendation_tr;

    return {
      vignetteTriggerDE: `Prüfer-Impuls (St. Antonius-Hospital Eschweiler · ${gt.topic}): Blick auf Vitalparameter & BGA – nennen Sie Ihre ERSTEN 3 SOFORTMASSNAHMEN in den nächsten 60 Sekunden!`,
      vignetteTriggerTR: `Jüri Sorusu (St. Antonius-Hospital Eschweiler · ${gt.topic_tr}): Monitör ve kan gazına bakın – ilk 60 saniyedeki İLK 3 ACİL ADIMINIZI söyleyin!`,
      firstThreeActions: [
        {
          step: 1,
          actionDE: `Sofortige Problemerkennung nach ABCDE, Oberarzt-Backup rufen (Closed-Loop-Teamkommunikation) & 100 % O₂ / Atemwegssicherung prüfen.`,
          actionTR: `ABCDE şemasına göre sorunu anında tanı, kıdemli/uzman desteği çağır (Closed-Loop ekip iletişimi) ve %100 O₂ / havayolu güvenliğini sağla.`,
          whyDE: `Sichert das zerebrale und myokardiale Sauerstoffangebot (DO₂) vor jeder invasiven Zusatzmaßnahme.`,
          whyTR: `Ek invaziv işlemlere geçmeden önce serebral ve miyokardiyal oksijen sunumunu (DO₂) güvenceye alır.`
        },
        {
          step: 2,
          actionDE: `Unmittelbare leitliniengerechte Kausaltherapie einleiten: ${step1Drug}.`,
          actionTR: `Kılavuza uygun nedensel ilk tedaviyi derhal başlat: ${gt.firstDrugTR || step1DrugTR}.`,
          whyDE: `${gt.guideline.recommendation}`,
          whyTR: `${gt.guideline.recommendation_tr || gt.guideline.recommendation}`
        },
        {
          step: 3,
          actionDE: `Erweiterte Stabilisierung & Trend-Steuerung (${step2Drug}) sowie Vorbereitung der strukturierten Intensivübernahme.`,
          actionTR: `İleri stabilizasyon ve trend takibi (${step2DrugTR}) ile yoğun bakım devrini organize et.`,
          whyDE: `Verhindert Sekundärschäden, Rebound-Phänomene und das K.O.-Risiko („${koMistake}“).`,
          whyTR: `İkincil organ hasarını, rebound fenomenini ve K.O. hatasını ("${koMistakeTR}") önler.`
        }
      ],
      examinerFollowupDE: `Prüfer-Nachfrage: „Frau Kollegin, warum wäre in genau dieser Situation ‚${koMistake}‘ ein schwerer pathophysiologischer Fehler?“`,
      examinerFollowupTR: `Jüri Takip Sorusu: "Meslektaşım, tam bu klinik tabloda '${koMistakeTR}' neden ağır bir patofizyolojik hata olurdu?"`,
      examinerJustificationDE: `Antwort ab First Principles: „${koReason} Deshalb handeln wir strikt nach ${gt.guideline.title}: ${gt.koPitfalls && gt.koPitfalls[0] ? gt.koPitfalls[0].correctAction : gt.guideline.recommendation}“`,
      examinerJustificationTR: `İlk İlkelerden Yanıt: "${koReasonTR} Bu nedenle ${gt.guideline.title_tr || gt.guideline.title} kılavuzuna göre hareket ediyoruz: ${koCorrectTR || gt.guideline.recommendation_tr || gt.guideline.recommendation}"`
    };
  }

  // 8.3 FIRST-PRINCIPLES PHYSIOLOGY & PHARMACOLOGY
  function getFirstPrinciplesPhysiology(q) {
    const profile = _detectScenarioProfile(q);

    const principles = {
      rbaa: {
        titleDE: 'First Principles: Laplace-Gesetz, Cross-Clamping-Nachlast & Declamping-Reperfusion',
        titleTR: 'İlk İlkeler: Laplace Yasası, Klempleme Ard Yükü & Declamping Reperfüzyonu',
        formulaOrPrinciple: 'Laplace-Gesetz: Wandspannung T = (P_transmural × Radius r) / (2 × Wanddicke d) · Ohm-Gesetz: MAP − ZVD = HZV × SVR',
        mechanismDE: 'Beim Bauchaortenaneurysma ist der Radius (r) massiv vergrößert und die Wanddicke (d) ausgedünnt. Jede Erhöhung des transmuralen Blutdrucks (P) treibt die Wandspannung (T) proportional nach oben und führt zur freien Ruptur („Popping the clot“). Beim Setzen der infrarenalen Aortenklemme (Cross-Clamping) steigt der systemische Gefäßwiderstand (SVR) um ca. 40 % an -> akute linksventrikuläre Nachlasterhöhung mit Gefahr der Myokardischämie. Beim Öffnen der Klemme (Declamping) fällt der SVR schlagartig ab, während zentrales Blutvolumen in die maximal vasodilatierte untere Körperhälfte versackt und Laktat, H⁺-Ionen sowie Kalium zum Herzen gespült werden (Reperfusions-Schock).',
        mechanismTR: 'Abdominal aort anevrizmasında yarıçap (r) çok büyümüş ve duvar kalınlığı (d) incelmiştir. Transmural kan basıncındaki (P) her artış duvar gerilimini (T) doğrusal olarak artırarak pıhtıyı koparır ("Popping the clot"). Aort klemplendiğinde (Cross-Clamping) sistemik vasküler direnç (SVR) %40 artar -> akut sol ventrikül ard yük (afterload) artışıyla miyokard iskemisi riski doğar. Klemp açıldığında (Declamping) SVR aniden düşer, santral kan hacmi vazodilate alt ekstremiteye göllenir ve laktat, H⁺ ile potasyum kalbe hücum eder (Reperfüzyon şoku).',
        pharmacologyDE: 'Vor RSI keine Vasodilatatoren; zur Einleitung am schnittbereiten Patienten hämodynamisch neutrale Substanzen (Etomidat 0,2–0,3 mg/kg oder Ketamin/Opioid) wählen. Während Cross-Clamping bei Nachlast-Exzess kurzwirksame Vasodilatatoren (Urapidil / Nitroglycerin); 5 Minuten VOR Declamping Vasodilatatoren stoppen, Volumenvorlast anheben, Noradrenalin-Perfusor hochstellen und Kalziumchlorid 10 % 10 ml i.v. als kardioprotektiven Antagonisten gegen den Kalium-Washout applizieren.',
        pharmacologyTR: 'RSI öncesi vazodilatatör verilmez; cerrah kesmeye hazırken hemodinamik nötr ajanlar (Etomidat 0,2–0,3 mg/kg veya Ketamin/Opioid) seçilir. Klemp süresince aşırı afterload varsa kısa etkili vazodilatatör (Urapidil/Nitrogliserin); Declamping den 5 dakika ÖNCE vazodilatatörler kapatılır, volüm doldurulur, Noradrenalin artırılır ve potasyum washout etkisine karşı Kalsiyum klorür %10 10 ml i.v. yapılır.'
      },
      picco: {
        titleDE: 'First Principles: Stewart-Hamilton-Thermodilution, Frank-Starling-Kurve & Starling-Glykokalyx',
        titleTR: 'İlk İlkeler: Stewart-Hamilton Termodilüsyonu, Frank-Starling Eğrisi & Glikokaliks',
        formulaOrPrinciple: 'HZV = V_Injektat × (T_Blut − T_Injektat) × k / ∫ ΔT_Blut(t) dt · GEDI = ITTV − PTV · SVV = (SV_max − SV_min) / SV_mean',
        mechanismDE: 'Die transpulmonale Thermodilution (ZVK-Kältebolus -> femorale Thermistor-Arterie) integriert die Temperatur-Zeit-Kurve nach Stewart-Hamilton. Aus dem Produkt von HZV und Mean Transit Time (MTt) ergibt sich das intrathorakale Thermovolumen (ITTV), aus der exponentiellen Downslope-Time (DSt) das pulmonale Thermovolumen (PTV). Die Differenz ITTV − PTV liefert das globale enddiastolische Volumen (GEDI, Norm 680–800 ml/m²) als echte volumetrische Vorlast aller 4 Herzkammern. Die Pulskonturanalyse misst über Beatmungs-induzierte intrathorakale Druckschwankungen die Schlagvolumenvariation (SVV): Liegt der Ventrikel auf dem steilen Teil der Frank-Starling-Kurve, schwankt das Schlagvolumen um > 12–13 % (Fluid Responder).',
        mechanismTR: 'Transpulmoner termodilüsyon (SVK soğuk bolus -> femoral termistörlü arter) Stewart-Hamilton denklemiyle sıcaklık-zaman eğrisini hesaplar. Kalp debisi ile Ortalama Geçiş Süresinin (MTt) çarpımı intratorasik termal hacmi (ITTV), üstel azalma süresi (DSt) ise pulmoner termal hacmi (PTV) verir. ITTV − PTV farkı 4 kalp boşluğunun gerçek hacimsel ön yükü olan GEDI yi (Normal 680–800 ml/m²) verir. SVV ise mekanik ventilasyonun yarattığı atım hacmi dalgalanmasını ölçer: Ventrikül Frank-Starling eğrisinin dik kısmındaysa SVV > %12–13 olur (Sıvı yanıtlı).',
        pharmacologyDE: 'Noradrenalin wirkt über α₁-Adrenozeptoren nicht nur auf arterielle Widerstandsgefäße (SVR ↑), sondern auch auf venöse Kapazitätsgefäße (Splanchnikus): Es konvertiert „Unstressed Volume“ in hämodynamisch wirksames „Stressed Volume“, erhöht den mittleren systemischen Füllungsdruck (Pmsf) und verbessert GEDI, ohne den Extravaskulären Lungenwasserindex (ELWI, Norm 3–7 ml/kg) durch exzessive Kristalloidgabe in die geschädigte endotheliale Glykokalyx zu treiben.',
        pharmacologyTR: 'Noradrenalin α₁-reseptörler üzerinden sadece arteriyel direnci (SVR ↑) artırmakla kalmaz, venöz kapasitans damarlarındaki "Unstressed Volume"u hemodinamik aktif "Stressed Volume"a dönüştürür; böylece hasarlı endotel glikokaliksinden akciğer dokusuna sıvı kaçırmadan (ELWI yi yükseltmeden) GEDI yi iyileştirir.'
      },
      pacemaker: {
        titleDE: 'First Principles: Sensing-Schwellen, Reizschwelle, Reed-Schalter & R-auf-T-Phänomen',
        titleTR: 'İlk İlkeler: Algılama Eşiği (Sensing), Uyarı Eşiği, Reed Anahtarı & R-on-T Fenomeni',
        formulaOrPrinciple: 'NBG-Code: 1. Ort der Stimulation (V/A/D) · 2. Ort der Wahrnehmung (V/A/D/O) · 3. Betriebsart (I=Inhibited, D=Dual, O=None/Asynchron)',
        mechanismDE: 'Ein Herzschrittmacher im Bedarfsmodus (z.B. VVI oder DDD) horcht über seine Elektrode auf intrakardiale Potenziale (Sensing in Millivolt). Hochfrequente Wechselströme der monopolaren Diathermie werden als schnelle ventrikuläre Eigenfrequenz fehlinterpretiert (Oversensing) -> der Schrittmacher inhibiert seine Impulsabgabe -> beim schrittmacherabhängigen Patienten ohne Eigenrhythmus resultiert eine sofortige Asystolie. Ein aufgelegter Ringmagnet schließt den magnetischen Reed-Schalter (bzw. Hall-Sensor) und erzwingt beim Schrittmacher den asynchronen Modus (VOO/DOO): Das Sensing wird auf „O“ gesetzt, das Gerät stimuliert starr weiter. Beim ICD hingegen sperrt der Magnet nur die Tachyarrhythmie-Therapie (ATP + Schock), lässt aber den Schrittmacherteil im VVI/DDD-Modus!',
        mechanismTR: 'İhtiyaç modundaki (VVI veya DDD) bir kalp pili elektrodu üzerinden intrakardiyak potansiyelleri (milivolt düzeyinde Sensing) dinler. Monopolar koterin yüksek frekanslı akımı pil tarafından hastanın kendi kalp atımı sanılır (Oversensing) -> pil uyarı vermeyi durdurur (inhibisyon) -> kendi ritmi olmayan pil bağımlı hastada anında asistoli gelişir. Halka mıknatıs Reed anahtarını kapatarak kalp pilini asenkron moda (VOO/DOO) alır: Algılama "O" olur ve cihaz sabit hızda uyarır. ICD de ise mıknatıs SADECE taşiaritmi şokunu kapatır, pil kısmını VVI/DDD modunda bırakır!',
        pharmacologyDE: 'Elektrolytverschiebungen und Pharmaka verändern die myokardiale Reizschwelle direkt über das Ruhemembranpotenzial (Nernst-Gleichung): Akute Hyperkaliämie depolarisiert das Ruhepotenzial, inaktiviert schnelle Na⁺-Kanäle und kann zum Exit-Block (Loss of Capture trotz Schrittmacher-Spike) führen. Bei pharmakologischer Überbrückung einer drittgradigen AV-Blockade hilft kein Atropin (wirkt nur nodal am AV-Knoten, nicht infranodal im His-Purkinje-System), sondern Adrenalin-Perfusor (2–10 µg/min) oder Isoprenalin bis zum transkutanen/transvenösen Pacing!',
        pharmacologyTR: 'Elektrolit bozuklukları miyokard uyarılma eşiğini Nernst denklemi üzerinden doğrudan değiştirir: Akut hiperkalemi dinlenim potansiyelini depolarize ederek hızlı Na⁺ kanallarını inaktive eder ve Exit-Block (pil dikeni olmasına rağmen yakalama kaybı / Loss of Capture) yapar. İnfra-nodal 3. derece AV blokta Atropin etkisizdir (sadece AV düğümde etkilidir); transkütan pacinge kadar Adrenalin (2–10 µg/dk) veya İzoprenalin kullanılır!'
      },
      pharmacology: {
        titleDE: 'First Principles: Blut-Gas-Verteilungskoeffizient (λ_B/G), Meyer-Overton-Regel & Kontextsensitive Halbwertszeit',
        titleTR: 'İlk İlkeler: Kan-Gaz Dağılım Katsayısı (λ_B/G), Meyer-Overton Kuralı & Bağlama Duyarlı Yarı Ömür',
        formulaOrPrinciple: 'Einleitungsgeschwindigkeit ∝ 1 / (λ_Blut/Gas × HZV) × Alveoläre Ventilation · Potenz (1/MAC) ∝ λ_Öl/Gas (Meyer-Overton)',
        mechanismDE: 'Die hypnotische Wirkung im ZNS hängt allein vom alveolären Partialdruck (P_A, im Gleichgewicht mit P_Gehirn) ab, nicht von der im Blut gelösten Gasmenge! Ein niedriger Blut-Gas-Verteilungskoeffizient (Desfluran λ_B/G = 0,42; Sevofluran = 0,65; Isofluran = 1,4) bedeutet geringe Löslichkeit im Blut: Das Blut nimmt wenig Gas aus der Alveole auf, sodass sich das Verhältnis F_A/F_I rasant an 1,0 annähert -> schnelles Einschlafen und Aufwachen. Paradoxon des Herzzeitvolumens: Ein NIEDRIGES HZV (z.B. im Schock) beschleunigt das Anfluten volatiler Anästhetika, weil weniger Blut pro Zeiteinheit Gas aus der Alveole abtransportiert und F_A/F_I dadurch viel schneller steigt (Überdosierungsgefahr beim Schockpatienten!).',
        mechanismTR: 'MSS deki hipnotik etki kanda çözünen gaz miktarına değil, doğrudan alveoler parsiyel basınca (P_A = P_Beyin) bağlıdır! Düşük kan-gaz dağılım katsayısı (Desfluran λ_B/G = 0,42; Sevofluran = 0,65; İzofluran = 1,4) kanda düşük çözünürlük demektir: Kan alveolden az gaz çeker, F_A/F_I oranı hızla 1,0 e yaklaşır -> hızlı uyuma ve uyanma. Kalp Debisi Paradoksu: DÜŞÜK kalp debisi (örn. şoktaki hasta) uçucu anesteziklerin etkisini HIZLANDIRIR, çünkü alveolden birim zamanda daha az gaz taşınır ve F_A/F_I çok hızlı yükselir (şoktaki hastada aşırı doz tehlikesi!).',
        pharmacologyDE: 'Die Wirkstärke (MAC₅₀ = alveoläre Konzentration, bei der 50 % der Patienten auf Hautschnitt nicht abwehren) folgt der Meyer-Overton-Lipidlöslichkeitsregel (Öl-Gas-Koeffizient): Sevofluran (Öl/Gas ≈ 50) hat einen MAC von ~2,0 Vol-%, Desfluran (Öl/Gas ≈ 19) einen MAC von ~6,0 Vol-%. Bei TIVA beschreibt die Kontextsensitive Halbwertszeit (CSHT) die Zeit bis zum 50 %-igen Abfall der Plasmakonzentration nach Infusionsstopp in Abhängigkeit von der Infusionsdauer: Bei Remifentanil bleibt sie durch unspezifische Gewebe-/Plasmaesterasen konstant bei 3–4 Minuten, während sie bei Fentanyl nach > 2 Stunden durch Rückverteilung aus dem Fettgewebe steil auf > 200 Minuten ansteigt.',
        pharmacologyTR: 'Anestezik güç (MAC₅₀) Meyer-Overton yağda çözünürlük kuralını (yağ-gaz katsayısı) izler: Sevofluran (Yağ/Gaz ≈ 50) MAC ~%2,0 iken Desfluran (Yağ/Gaz ≈ 19) MAC ~%6,0 dır. TİVA da Bağlama Duyarlı Yarı Ömür (CSHT), infüzyon süresiyle bağlantılı olarak plazma konsantrasyonunun %50 düşme süresidir: Remifentanilde non-spesifik esterazlar sayesinde infüzyon ne kadar sürerse sürsün 3–4 dakikada sabit kalırken, Fentanilde yağ dokusundan geri dağılım nedeniyle > 2 saat sonra > 200 dakikaya fırlar.'
      },
      icp: {
        titleDE: 'First Principles: Monro-Kellie-Doktrin, Zerebrale Autoregulation & CO₂-Vasoreaktivität',
        titleTR: 'İlk İlkeler: Monro-Kellie Doktrini, Serebral Otoregülasyon & CO₂ Vazoreaktivitesi',
        formulaOrPrinciple: 'V_Gehirn (80 %) + V_Blut (10 %) + V_Liquor (10 %) = konstant · CPP = MAP − ICP (Ziel 60–70 mmHg)',
        mechanismDE: 'Nach der Monro-Kellie-Doktrin ist das Innenvolumen der starren Schädelkapsel konstant. Wächst eine Raumforderung (Hämatom/Ödem), werden zunächst Liquor und venöses Blut verdrängt; danach steigt der ICP exponentiell an (Erschöpfung der intrakraniellen Compliance). Der zerebrale Blutfluss (CBF) hängt linear vom PaCO₂ ab: Pro 1 mmHg PaCO₂-Anstieg steigt der CBF um ca. 3–4 % durch H⁺-vermittelte Vasodilatation der zerebralen Arteriolen -> das intrakranielle Blutvolumen (V_Blut) wächst -> ICP-Krise! Umgekehrt führt Hyperventilation (PaCO₂ < 30 mmHg) zu gefährlicher zerebraler Vasokonstriktion und sekundärer Hirnischämie.',
        mechanismTR: 'Monro-Kellie doktrinine göre sert kafatası içindeki toplam hacim (Beyin %80 + Kan %10 + BOS %10) sabittir. Hematom/ödem büyüdüğünde önce BOS ve venöz kan yer değiştirir; kompliyans tükendiğinde ICP üstel olarak fırlar. Serebral kan akımı (CBF) PaCO₂ ile doğrusal ilişkilidir: PaCO₂ deki her 1 mmHg artış H⁺ aracılı serebral vazodilatasyonla CBF yi %3–4 artırır -> kafa içi kan hacmi artar -> ICP krizi! Tersine aşırı hiperventilasyon (PaCO₂ < 30 mmHg) tehlikeli serebral vazokonstriksiyon ve iskemi yapar.',
        pharmacologyDE: 'Osmotherapie (Mannitol 20 % 0,5–1 g/kg oder NaCl 10–20 %) baut über eine intakte Blut-Hirn-Schranke einen osmotischen Gradienten auf und entzieht dem Hirnparenchym freies Wasser. TIVA mit Propofol/Sufentanil senkt den zerebralen Sauerstoffverbrauch (CMRO₂) und gekoppelt den CBF/ICP, während volatile Anästhetika ab > 1,0 MAC die zerebrale Autoregulation aufheben und durch direkte Vasodilatation den ICP steigern (Entkopplung von CBF und CMRO₂).',
        pharmacologyTR: 'Osmoterapi (Mannitol %20 0,5–1 g/kg veya hipertonik NaCl) sağlam kan-beyin bariyeri üzerinden osmotik gradyent oluşturarak beyin parankiminden serbest su çeker. Propofol/Sufentanil TİVA serebral metabolik hızı (CMRO₂) ve buna bağlı CBF/ICP yi düşürürken, uçucu anestezikler > 1,0 MAC üzerinde doğrudan serebral vazodilatasyon yaparak ICP yi artırır.'
      },
      mh: {
        titleDE: 'First Principles: Ryanodin-Rezeptor-1 (RYR1) & Entkopplung der sarkoplasmatischen Kalzium-Homöostase',
        titleTR: 'İlk İlkeler: Riyanodin Reseptörü-1 (RYR1) & Sarkoplazmik Kalsiyum Homeostazı',
        formulaOrPrinciple: 'RYR1-Daueröffnung -> [Ca²⁺]_zytosolisch ↑↑↑ -> ATP-Hydrolyse -> O₂-Verbrauch ↑ + CO₂ ↑↑ + Laktat ↑↑ + Wärme ↑↑ -> Rhabdomyolyse',
        mechanismDE: 'Volatile Inhalationsanästhetika (Sevofluran, Desfluran, Isofluran) und Succinylcholin bewirken bei genetischer Mutation des Ryanodin-Rezeptors (RYR1 auf dem sarkoplasmatischen Retikulum der Skelettmuskelzelle) ein unkontrolliertes Offenstehen des Kalziumkanals. Der massive zytosolische Ca²⁺-Einstrom erzwingt eine permanente Aktin-Myosin-Dauerkontraktion (Rigidität/Masseterspasmus). Die SERCA-Pumpen versuchen unter gigantischem ATP-Verbrauch vergeblich, Ca²⁺ zurückzupumpen -> explosionsartiger aerober und anaerober Hypermetabolismus mit exzessiver CO₂-Produktion (EtCO₂-Sprung als frühestes Zeichen!), Laktatazidose, Thermogenese (> 40 °C) und Untergang der Sarkolemm-Membran (Hyperkaliämie + Myoglobinurie).',
        mechanismTR: 'Uçucu anestezikler ve Süksinilkolin, iskelet kasındaki sarkoplazmik retikulum üzerinde bulunan Riyanodin reseptörü (RYR1) mutasyonunda kalsiyum kanalının sürekli açık kalmasına yol açar. Sitozolik Ca²⁺ taşması kalıcı aktin-miyozin kasılmasını (rijidite/masseter spazmı) tetikler. SERCA pompaları Ca²⁺ u geri pompalamak için devasa ATP tüketir -> patlayıcı aerobik ve anaerobik hipermetabolizma sonucunda aşırı CO₂ üretimi (en erken bulgu EtCO₂ fırlaması!), laktik asidoz, ısı artışı ve kas zarı yıkımı (hiperkalemi + miyoglobinüri) gelişir.',
        pharmacologyDE: 'Dantrolen (initial 2,5 mg/kg i.v.) bindet spezifisch an den RYR1-Rezeptor und blockiert die Kalziumfreisetzung aus dem sarkoplasmatischen Retikulum, ohne das neuromuskuläre Aktionspotenzial zu beeinflussen. Exogene Kalziumkanalblocker (z.B. Verapamil/Diltiazem) wirken am L-Typ-Kanal (DHPR) und interagieren unter Dantrolen zu letaler Hyperkaliämie und therapierefraktärer Asystolie (absolutes K.O.-Verbot!).',
        pharmacologyTR: 'Dantrolen (başlangıç 2,5 mg/kg i.v.) doğrudan RYR1 reseptörüne bağlanarak sarkoplazmik retikulumdan kalsiyum salınımını durdurur. Kalsiyum kanal blokerleri (Verapamil/Diltiazem) ise Dantrolen ile etkileşerek ölümcül hiperkalemi ve dirençli asistoli yaptığı için kesinlikle kontrendikedir (K.O. kriteri!).'
      },
      last: {
        titleDE: 'First Principles: Spannungsabhängige Na⁺-Kanal-Blockade, Ion-Trapping & Lipid-Sink-Mechanismus',
        titleTR: 'İlk İlkeler: Voltaj Kapılı Na⁺ Kanal Blokajı, İyon Tuzağı & Lipid-Sink Mekanizması',
        formulaOrPrinciple: 'Henderson-Hasselbalch: pH = pK_a + log([Base ungeladen] / [Kation BH⁺]) · Azidose -> intrazelluläres Ion-Trapping ↑',
        mechanismDE: 'Lokalanästhetika sind schwache Basen (pK_a 7,7–8,1): Die ungeladene lipophile Base diffundiert durch die Nerven-/Myokardmembran, wird intrazellulär protoniert (BH⁺) und blockiert den spannungsabhängigen schnellen Natriumkanal von der Zytoplasmasseite. Im ZNS fallen zuerst inhibitorische GABAerge Interneurone aus (Exzitation/Krampfanfall), bevor eine globale Depression eintritt. Am Herzen hat vor allem lipophiles Bupivacain eine extrem langsame Dissoziationskinetik („Fast-in, slow-out“) am kardialen Na⁺-Kanal (Nav1.5) und hemmt zusätzlich die mitochondriale Fettsäureoxidation (Carnitin-Acylcarnitin-Translokase) -> refraktärer kardiogener Schock.',
        mechanismTR: 'Lokal anestezikler zayıf bazdır (pK_a 7,7–8,1): Yüksüz lipofilik baz hücre zarından geçer, hücre içinde protonlanarak (BH⁺) voltaj kapılı hızlı sodyum kanalını iç yüzeyden bloke eder. MSS de önce inhibitör ara nöronlar bloke olduğu için eksitasyon/nöbet, ardından depresyon gelişir. Kalpte ise özellikle lipofilik Bupivakain kardiyak Na⁺ kanalından (Nav1.5) çok yavaş ayrılır ("Fast-in, slow-out") ve mitokondriyal yağ asidi oksidasyonunu bozarak dirençli kardiyojenik şok yapar.',
        pharmacologyDE: 'Intralipid 20 % (1,5 ml/kg Bolus) wirkt bimodal: 1. „Lipid Sink / Lipid Shuttle“ bildet ein intravasales Lipidkompartiment, das lipophiles Bupivacain/Ropivacain aus Herz und Gehirn abzieht; 2. Direkte Bereitstellung freier Fettsäuren überwindet die mitochondriale ATP-Blockade im Myokard. Bei Azidose (Hyperkapnie/Hypoxie) sinkt die Proteinbindung im Plasma und intrazellulär entsteht vermehrt geladenes BH⁺, das die Zelle nicht mehr verlassen kann („Ion-Trapping“) -> daher sofort 100 % O₂ und Normokapnie sichern!',
        pharmacologyTR: 'İntralipid %20 (1,5 ml/kg bolus) çift mekanizmayla çalışır: 1. "Lipid Sink / Shuttle" damar içinde lipofilik ilaçları kalp ve beyinden çeken bir lipid fazı oluşturur; 2. Miyokarda doğrudan serbest yağ asidi sağlayarak mitokondriyal ATP üretimini yeniden başlatır. Asidoz (hiperkapni/hipoksi) plazma protein bağlanmasını azaltır ve hücre içinde "İyon Tuzağı" (Ion-Trapping) yaratarak kardiyotoksisiteyi katlar -> bu yüzden derhal %100 O₂ ve normokapni şarttır!'
      },
      icu_sepsis: {
        titleDE: 'First Principles: Henderson-Hasselbalch vs. Stewart-Modell (SID) & Pulmonaler Driving Pressure (ΔP)',
        titleTR: 'İlk İlkeler: Henderson-Hasselbalch vs. Stewart Modeli (SID) & Driving Pressure (ΔP)',
        formulaOrPrinciple: 'Stewart SID_app = ([Na⁺] + [K⁺] + [Ca²⁺] + [Mg²⁺]) − ([Cl⁻] + [Laktat⁻]) ≈ 40 mmol/l · Anionenlücke AG = [Na⁺] − ([Cl⁻] + [HCO₃⁻]) (Norm 8–12)',
        mechanismDE: 'Nach Peter Stewart bestimmen drei unabhängige Variablen den pH-Wert: 1. PaCO₂, 2. die Konzentration schwacher Säuren (A_tot, v.a. Albumin und Phosphat) und 3. die Strong Ion Difference (SID ≈ 40 mmol/l). Jede Verkleinerung der SID (z.B. durch Chlorid-Exzess nach NaCl 0,9 % mit Cl⁻ 154 mmol/l -> SID = 0, oder durch Laktat-Anstieg im Schock) erzwingt aus Gründen der Elektroneutralität die Dissoziation von Wasser (H₂O -> H⁺ + OH⁻) und erzeugt eine metabolische Azidose. Umgekehrt bewirkt eine Hypoalbuminämie beim Intensivpatienten eine metabolische Alkalose, die eine gleichzeitige Laktatazidose im klassischen Base Excess maskieren kann!',
        mechanismTR: 'Stewart modeline göre pH ı üç bağımsız değişken belirler: 1. PaCO₂, 2. Zayıf asitler (A_tot, özellikle Albümin ve Fosfat) ve 3. Güçlü İyon Farkı (SID ≈ 40 mmol/l). SID nin daralması (örn. %0,9 NaCl ile aşırı klor yükü veya şokta laktat artışı) elektroneutralite yasası gereği suyun ayrışmasını (H₂O -> H⁺ + OH⁻) zorlayarak metabolik asidoz yaratır. Tersine yoğun bakım hastasındaki hipoalbüminemi metabolik alkaloz yaratarak eşlik eden laktik asidozu gizleyebilir!',
        pharmacologyDE: 'In der ARDS-Beatmung („Baby Lung“-Konzept nach Gattinoni) ist das belüftete Restlungenvolumen stark geschrumpft. Der Driving Pressure (ΔP = Pplat − PEEP = Vt / C_RS, Ziel < 15 mbar) repräsentiert die zyklische Dehnung (Strain) bezogen auf die funktionelle Lungengröße (Compliance C_RS) und korreliert direkter mit dem Baro-/Volutrauma als das reine Atemzugvolumen pro kg Idealgewicht.',
        pharmacologyTR: 'ARDS ventilasyonunda ("Baby Lung" konsepti) havalanan fonksiyonel akciğer hacmi küçülmüştür. Driving Pressure (ΔP = Pplat − PEEP = Vt / Kompliyans, Hedef < 15 mbar) fonksiyonel akciğer büyüklüğüne düşen siklik gerilimi (strain) gösterir ve sağkalımla en güçlü korelasyona sahiptir.'
      }
    };

    if (principles[profile]) return principles[profile];

    return {
      titleDE: 'First Principles: Sauerstoffangebot (DO₂), Frank-Starling-Gesetz & Rezeptor-Pharmakodynamik',
      titleTR: 'İlk İlkeler: Oksijen Sunumu (DO₂), Frank-Starling Yasası & Reseptör Farmakodinamiği',
      formulaOrPrinciple: 'DO₂ = HZV × CaO₂ = (HF × SV) × (1,34 × Hb × SaO₂ + 0,003 × PaO₂) · MAP − ZVD = HZV × SVR',
      mechanismDE: 'Jede akute perioperative Dekompensation lässt sich auf die Determinanten der Gewebeoxygenierung (DO₂ vs. VO₂) und des Perfusionsdrucks (MAP = HZV × SVR + ZVD) zurückführen: 1. Atemweg & Alveolargas (SaO₂/PaO₂), 2. Sauerstoffträger (Hb), 3. Herzzeitvolumen (Vorlast/GEDI, Kontraktilität/Inotropie, Nachlast/SVR, Herzfrequenz/Rhythmus). Sinkt DO₂ unter die kritische Schwelle (~300 ml/min/m²), schaltet die Zelle von aerober Phosphorylierung (36 ATP/Glukose) auf anaerobe Glykolyse (2 ATP + Laktatbildung) um.',
      mechanismTR: 'Her akut perioperatif dekompansasyon doku oksijenasyonu (DO₂ vs. VO₂) ve perfüzyon basıncı (MAP = Kalp Debisi × SVR + SVB) bileşenlerine dayanır: 1. Havayolu ve alveoler gaz (SaO₂/PaO₂), 2. Taşıyıcı (Hb), 3. Kalp debisi (Ön yük, Kontraktilite, Ard yük/SVR, Hız/Ritim). DO₂ kritik eşiğin altına düştüğünde hücre aerobik fosforilasyondan (36 ATP) anaerobik glikolize (2 ATP + Laktat) geçer.',
      pharmacologyDE: 'Unsere medikamentöse Steuerung greift gezielt an diesen Stellschrauben an: α₁-Agonisten (Noradrenalin, Phenylephrin) steigern SVR und venösen Rückstrom (Stressed Volume); β₁-Agonisten (Dobutamin, Adrenalin in niedriger Dosis) steigern über cAMP und PKA den intrazellulären Ca²⁺-Transienten (Inotropie + Chronotropie); balancierte Kristalloide optimieren über das Frank-Starling-Gesetz die Sarkomer-Vordehnung bis zum Optimum der Aktin-Myosin-Überlappung.',
      pharmacologyTR: 'Farmakolojik yönetimimiz bu denklemin değişkenlerini hedefler: α₁-agonistler (Noradrenalin) SVR ve venöz dönüşü (Stressed Volume) artırır; β₁-agonistler (Dobutamin, düşük doz Adrenalin) cAMP üzerinden hücre içi Ca²⁺ geçişini artırarak inotropiyi güçlendirir; dengeli kristalloidler ise Frank-Starling yasasına göre sarkomer ön gerilimini optimize eder.'
    };
  }

  // 8.4 BEDSIDE COMMUNICATION (FRÜHBESPRECHUNG, PRÄMEDIKATIONSGESPRÄCH) & KLINIK-JARGON
  function getBedsideCommunicationAndJargon(q) {
    const profile = _detectScenarioProfile(q);
    const gt = getMedicalGroundTruth(q);

    const comms = {
      rbaa: {
        fruehbesprechungDE: '„Guten Morgen zusammen, ich übergebe aus dem Nachtdienst Saal 2: 72-jähriger Patient mit gedeckt rupturiertem infrarenalem BAA. Wir haben den Patienten unter strikter permissiver Hypotonie (RRsyst 80 mmHg) wach im Saal gelagert, erst am schnittbereiten, steril abgedeckten Patienten per RSI eingeleitet und das Declamping unter Noradrenalin-, Volumen- und Kalzium-Vorladung hämodynamisch stabil gemeistert. Nach ROTEM-gestützter Substitution (4 g Fibrinogen, 1 g Tranexamsäure, 6 EK, 6 FFP) wurde er normotherm und katecholaminarm auf unsere operative ITS übernommen.“',
        fruehbesprechungTR: '"Günaydın arkadaşlar, gece nöbetinden Salon 2 yi devrediyorum: 72 yaşında kapalı rüptüre infrarenal AAA hastası. Hastayı sıkı permissif hipotansiyon (Sistolik TA 80 mmHg) altında uyanık olarak masaya aldık, yalnızca cerrah steril örtüp kesmeye hazır olduğunda RSI ile uyuttuk ve Declamping aşamasını Noradrenalin, volüm ve kalsiyum ön yüklemesiyle stabil yönettik. ROTEM hedefli replasman sonrası normotermik olarak yoğun bakımımıza devraldık."',
        praemedikationDE: '„Herr Müller, an Ihrer Hauptschlagader im Bauchraum besteht eine akute Ausweitung, die sofort operiert werden muss. Zu Ihrer maximalen Sicherheit legen wir Ihnen schon im wachen Zustand unter örtlicher Betäubung einen Blutdruckmessschlauch am Handgelenk an und geben Ihnen die Schlafmedikamente erst unmittelbar, wenn das OP-Team komplett bereitsteht.“',
        praemedikationTR: '"Sayın Müller, karın ana atardamarınızda acil ameliyat gerektiren bir genişleme var. Maksimum güvenliğiniz için el bileğinizden tansiyon ölçüm kateterini siz uyanıkken lokal anesteziyle takacağız ve uyku ilaçlarını cerrahi ekip tamamen hazır olduğunda vereceğiz."',
        jargonTerms: [
          { abbr: 'rBAA', termDE: 'Rupturiertes Bauchaortenaneurysma', meaningDE: 'Akuter gefäßchirurgischer Notfall mit hoher Letalität', meaningTR: 'Yüksek mortaliteli akut rüptüre abdominal aort anevrizması' },
          { abbr: 'Schnittbereit-RSI', termDE: 'Einleitung am abgewaschenen Patienten', meaningDE: 'Relaxierung erst, wenn Chirurg das Skalpell in der Hand hält (Erhalt der Bauchdeckentamponade)', meaningTR: 'Karın duvarı tamponadını kaybetmemek için cerrah bistüriyi eline aldığında yapılan RSI' },
          { abbr: 'Cross-Clamping', termDE: 'Aortales Abklemmen', meaningDE: 'Akute Nachlasterhöhung (SVR ↑↑) durch Ausklemmen der Aorta', meaningTR: 'Aortun klemplenmesiyle gelişen akut ard yük (afterload) artışı' },
          { abbr: 'Declamping-Schock', termDE: 'Reperfusions-Hypotonie beim Öffnen der Klemme', meaningDE: 'Schlagartiger SVR-Abfall + Einschwemmung von Laktat und Kalium aus der unteren Körperhälfte', meaningTR: 'Klemp açıldığında ani SVR düşüşü ve alt ekstremiteden laktat/potasyum washout şoku' }
        ]
      },
      picco: {
        fruehbesprechungDE: '„Aus dem Intensivdienst Bett 4: 64-jähriger Patient im septischen Schock bei Pneumonie. Da unter PEEP 14 mbar und Vorhofflimmern weder ZVD noch SVV valide waren, haben wir das erweiterte Hämodynamik-Monitoring mittels PiCCO etabliert. Die Thermodilution zeigte initial ein erniedrigtes GEDI von 540 ml/m² bei gleichzeitig erhöhtem ELWI von 13 ml/kg und PVPI von 3,6 im Sinne eines ARDS-Permeabilitätsödems. Wir führen ihn daher restriktiv unter Noradrenalin-Titration.“',
        fruehbesprechungTR: '"Yoğun bakım Yatak 4 ten devir: Pnömoniye sekonder septik şokta 64 yaşında hasta. PEEP 14 mbar ve atriyal fibrilasyon altında SVB ve SVV güvenilir olmadığından PiCCO taktık. Termodilüsyonda düşük GEDI (540 ml/m²) ile birlikte ARDS permeabilite ödemini gösteren yüksek ELWI (13 ml/kg) ve PVPI (3,6) saptadık; bu nedenle Noradrenalin titrasyonuyla restriktif sıvı yönetimi uyguluyoruz."',
        praemedikationDE: '„Für die optimale Steuerung des Kreislaufs und zum Schutz der Lunge vor Überwässerung legen wir Ihrem Angehörigen in Narkose einen speziellen Messkatheter in die Leistenarterie, mit dem wir das Herzzeitvolumen und das Lungenwasser exakt messen können.“',
        praemedikationTR: '"Dolaşımı en doğru şekilde yönetmek ve akciğerleri sıvı yükünden korumak için yakınınıza kasık atardamarından kalp debisini ve akciğer suyunu ölçen özel bir kateter (PiCCO) takacağız."',
        jargonTerms: [
          { abbr: 'GEDI / ITBI', termDE: 'Globaler Enddiastolischer / Intrathorakaler Blutvolumenindex', meaningDE: 'Volumetrische Vorlastparameter (Norm GEDI 680–800 ml/m²), unabhängig vom PEEP', meaningTR: 'PEEP ten etkilenmeyen hacimsel ön yük parametreleri (Normal GEDI 680–800 ml/m²)' },
          { abbr: 'ELWI', termDE: 'Extravaskulärer Lungenwasserindex', meaningDE: 'Quantifiziert das Lungenödem am Bett (Norm 3–7 ml/kg PBW; > 10 ml/kg = manifestes Ödem)', meaningTR: 'Yatak başında akciğer ödemini ölçer (Normal 3–7 ml/kg; > 10 ml/kg = aşikar ödem)' },
          { abbr: 'PVPI', termDE: 'Pulmonaler Vaskulärer Permeabilitätsindex', meaningDE: '> 3,0 beweist ein entzündliches Schrankenleck (ARDS) statt kardialem Rückstau (< 2,0)', meaningTR: '> 3,0 kardiyojenik ödem değil kapiller kaçak (ARDS) olduğunu kanıtlar' },
          { abbr: 'SVV / PPV', termDE: 'Schlagvolumen- / Pulsdruckvariation', meaningDE: '> 12–13 % = Volumenreagibilität positiv (nur bei SR, kontrollierter Beatmung Vt ≥ 8 ml/kg!)', meaningTR: '> %12–13 = Sıvı yanıtlılığı pozitif (sadece sinüs ritmi ve kontrollü ventilasyonda!)' }
        ]
      },
      pacemaker: {
        fruehbesprechungDE: '„Kurzer Bericht zur gestrigen Hemikolektomie bei unserem Patienten mit CRT-D-Aggregat und absoluter Schrittmacherabhängigkeit nach AV-Knoten-Ablation: Da eine alleinige Magnetauflage beim ICD nur die Schockfunktion deaktiviert, nicht aber in den asynchronen VOO-Modus umschaltet, haben wir das Aggregat präoperativ durch die Kardiologie auf DOO umprogrammieren lassen, bipolare Diathermie genutzt und nach OP wieder auf DDD + aktive Tachytherapie zurückgestellt.“',
        fruehbesprechungTR: '"AV düğüm ablasyonu sonrası tam pil bağımlı olan CRT-D li hastamızın dünkü hemikolektomi devri: ICD lerde mıknatıs yalnızca şok fonksiyonunu kapatıp pili asenkron VOO moduna geçirmediği için, ameliyat öncesi kardiyolojiye cihazı DOO moduna programlattık, bipolar koter kullandık ve postoperatif tekrar DDD + aktif şok moduna aldırdık."',
        praemedikationDE: '„Bitte bringen Sie uns Ihren Herzschrittmacher- bzw. Defibrillator-Ausweis mit. Weil während der Operation mit elektrischem Strom verödet wird, schützen wir Ihr Gerät vor Störimpulsen und überprüfen es nach dem Eingriff sofort wieder.“',
        praemedikationTR: '"Lütfen kalp pili/ICD kimlik kartınızı yanınızda getirin. Ameliyat sırasında elektrikli koter kullanılacağı için cihazınızı parazitlerden koruyacak ve işlem sonrası hemen kontrol edeceğiz."',
        jargonTerms: [
          { abbr: 'EMI', termDE: 'Elektromagnetische Interferenz', meaningDE: 'Störsignale durch monopolaren Kauter -> Oversensing (Inhibition beim SM / Fehlschock beim ICD)', meaningTR: 'Monopolar koter paraziti -> Oversensing (Pilde duraklama / ICD de uygunsuz şok)' },
          { abbr: 'VOO / DOO', termDE: 'Asynchroner Stimulationsmodus', meaningDE: 'Starre Stimulation ohne Wahrnehmung (Sensing = O) unter Magnetauflage beim Schrittmacher', meaningTR: 'Kalp piline mıknatıs konduğunda algılama olmadan sabit hızda asenkron uyarım' },
          { abbr: 'Loss of Capture', termDE: 'Stimulationsverlust / Exit-Block', meaningDE: 'Schrittmacher-Spike im EKG ohne nachfolgende Kammerdepolarisation (z.B. bei Hyperkaliämie/Ischämie)', meaningTR: 'EKG de pil dikeni olmasına rağmen QRS oluşmaması (örn. hiperkalemi/iskemi)' },
          { abbr: 'ATP', termDE: 'Antitachykardes Pacing (Überstimulation)', meaningDE: 'Schmerzlose Überstimulation von VT durch den ICD (wird durch Magnetauflage ebenfalls deaktiviert)', meaningTR: 'ICD nin VT yi şoksuz sonlandırma fonksiyonu (mıknatıs ile devre dışı kalır)' }
        ]
      }
    };

    if (comms[profile]) return comms[profile];

    return {
      fruehbesprechungDE: `„Guten Morgen in die Runde (Frühbesprechung St. Antonius-Hospital Eschweiler): Ich berichte über einen Patienten mit akutem Komplikationsverlauf im Bereich ${gt.topic}. Wir haben unmittelbar nach ABCDE priorisiert, ${gt.dosages[0].drug} (${gt.dosages[0].dose}) leitliniengerecht nach ${gt.guideline.society} appliziert und den Patienten nach hämodynamischer sowie respiratorischer Stabilisierung strukturiert nach SBAR auf die Intensivstation übergeben.“`,
      fruehbesprechungTR: `"Günaydın arkadaşlar (St. Antonius-Hospital Eschweiler Sabah Toplantısı): ${gt.topic_tr} gelişen hastamızı devrediyorum. ABCDE şemasına göre önceliklendirerek ${gt.guideline.society} kılavuzuna uygun şekilde ${gt.dosages[0].drug_tr || gt.dosages[0].drug} (${gt.dosages[0].dose_tr || gt.dosages[0].dose}) uyguladık ve hemodinamik/solunumsal stabilizasyon sonrası SBAR protokolüyle yoğun bakıma devrettik."`,
      praemedikationDE: `„Im Rahmen unseres Prämedikationsgesprächs kläre ich Sie heute verständlich und individuell über das geplante Narkoseverfahren, das erweiterte Kreislaufmonitoring sowie unsere Sicherheitsmaßnahmen (${gt.topic}) auf und dokumentiere Ihre Fragen schriftlich auf dem Aufklärungsbogen.“`,
      praemedikationTR: `"Premedikasyon görüşmemiz kapsamında bugün size planlanan anestezi yöntemini, ileri monitörizasyonumuzu ve güvenlik önlemlerimizi (${gt.topic_tr}) anlaşılır şekilde açıklıyor ve sorularınızı onam formuna kaydediyorum."`,
      jargonTerms: [
        { abbr: 'RSI ("Blitzeinleitung")', termDE: 'Rapid Sequence Induction', meaningDE: 'Aspirationsgeschützte Narkoseeinleitung ohne Zwischenbeatmung nach 3–5 min Präoxygenierung (EtO₂ ≥ 90 %)', meaningTR: '3–5 dk preoksijenasyon (EtO₂ ≥ %90) sonrası ara maske ventilasyonu yapmadan hızlı seri entübasyon' },
        { abbr: 'ZVK & Arterie', termDE: 'Zentraler Venenkatheter & Invasive Blutdruckmessung', meaningDE: 'Katecholamin-Applikationsweg + Schlag-zu-Schlag-Blutdruck & arterielle BGA-Kontrolle', meaningTR: 'Katekolamin infüzyon yolu + atımdan atıma invaziv tansiyon ve arteriyel kan gazı takibi' },
        { abbr: 'Closed-Loop & SBAR', termDE: 'Geschlossene Teamkommunikation & Übergabestandard', meaningDE: 'Situation – Background – Assessment – Recommendation (Standard im OP & auf ITS)', meaningTR: 'Durum – Arka Plan – Değerlendirme – Öneri (Ameliyathane ve YBÜ devir standardı)' },
        { abbr: 'K.O.-Kriterium', termDE: 'Prüfungsrelevanter Behandlungsfehler (ÄKNO)', meaningDE: gt.koPitfalls && gt.koPitfalls[0] ? gt.koPitfalls[0].mistake : 'Gefährdung der Patientensicherheit', meaningTR: gt.koPitfalls && gt.koPitfalls[0] ? (gt.koPitfalls[0].whyFatal_tr || gt.koPitfalls[0].mistake_tr || 'Hasta güvenliğini tehlikeye atan kritik sınav hatası') : 'Hasta güvenliğini tehlikeye atan kritik sınav hatası' }
      ]
    };
  }

  // 8.5 STRUCTURED 3-TIER EXAM SYNTHESIS (Examiner Grading Breakdown)
  function getThreeTierExamSynthesis(q) {
    const gt = getMedicalGroundTruth(q);
    const challenge = getImmediateThreeActionsChallenge(q);
    const fp = getFirstPrinciplesPhysiology(q);

    const tier1Items = challenge.firstThreeActions.map(a => ({
      de: `<strong>Schritt ${a.step}:</strong> ${a.actionDE}`,
      tr: `<strong>Adım ${a.step}:</strong> ${a.actionTR}`
    }));

    const tier2Items = [
      {
        de: `<strong>Point-of-Care-Diagnostik & BGA:</strong> Engmaschige arterielle BGA (pH, PaCO₂, PaO₂, Laktat-Clearance, ionisiertes Ca²⁺, K⁺) und gezieltes Gerinnungs-/Hämodynamik-Monitoring (${gt.topic}).`,
        tr: `<strong>Yatak Başı Tanı & Kan Gazı:</strong> Yakın arteriyel kan gazı (pH, PaCO₂, PaO₂, laktat klirensi, iyonize Ca²⁺, K⁺) ve hedefe yönelik koagülasyon/hemodinami takibi (${gt.topic_tr}).`
      },
      {
        de: `<strong>Apparative Zusatzdiagnostik:</strong> Fokussierte Sonographie (eFAST / FATE-Echokardiographie / Lungensonographie zum Pneumothorax-Ausschluss) + 12-Kanal-EKG und Temperatur-Trend.`,
        tr: `<strong>Ek Görüntüleme & Monitörizasyon:</strong> Odaklanmış ultrasonografi (eFAST / FATE Ekokardiyografi / Pnömotoraks dışlamak için akciğer USG) + 12 derivasyonlu EKG ve ısı trendi.`
      },
      {
        de: `<strong>Leitlinien-Referenz (${gt.guideline.society}):</strong> ${gt.guideline.title} (${gt.guideline.awmf}) – ${gt.guideline.recommendation}`,
        tr: `<strong>Kılavuz Referansı (${gt.guideline.society}):</strong> ${gt.guideline.title_tr || gt.guideline.title} (${gt.guideline.awmf}) – ${gt.guideline.recommendation_tr || gt.guideline.recommendation}`
      }
    ];

    const tier3Items = (gt.dosages || []).map(d => ({
      de: `<strong>${d.drug}:</strong> ${d.dose} (${d.route || 'i.v.'}) — <em>Limit/Cave: ${d.maxDose || d.limits}</em>`,
      tr: `<strong>${d.drug_tr || d.drug}:</strong> ${d.dose_tr || d.dose} (${d.route || 'i.v.'}) — <em>Sınır/Dikkat: ${d.maxDose_tr || d.limits_tr || d.limits || d.maxDose}</em>`
    }));

    if (gt.koPitfalls && gt.koPitfalls[0]) {
      tier3Items.push({
        de: `<strong>⛔ ÄKNO K.O.-Falle vermeiden:</strong> ${gt.koPitfalls[0].mistake} -> <em>${gt.koPitfalls[0].correctAction}</em>`,
        tr: `<strong>⛔ ÄKNO K.O. Tuzağından Kaçın:</strong> ${gt.koPitfalls[0].mistake_tr || gt.koPitfalls[0].mistake} -> <em>${gt.koPitfalls[0].correctAction_tr || gt.koPitfalls[0].whyFatal_tr || gt.koPitfalls[0].whyFatal}</em>`
      });
    }

    return {
      tier1Immediate: {
        titleDE: '1. Lebensrettende Sofortmaßnahmen (Erste 60 Sekunden im OP / auf ITS)',
        titleTR: '1. Hayat Kurtarıcı Acil Müdahaleler (İlk 60 Saniye)',
        items: tier1Items
      },
      tier2Diagnostics: {
        titleDE: '2. Sekundärdiagnostik, Trend-Monitoring & Leitlinien-Zielwerte',
        titleTR: '2. İkincil Tanı, Trend Monitörizasyonu & Kılavuz Hedefleri',
        items: tier2Items
      },
      tier3Pharmacology: {
        titleDE: '3. Pharmakologische Nuancen, Dosierungen & K.O.-Vermeidung',
        titleTR: '3. Farmakolojik Nüanslar, Dozlar & K.O. Tuzakları',
        items: tier3Items
      },
      firstPrinciplesFormula: fp.formulaOrPrinciple
    };
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
    getDataFirstDiagnosticMonitor,
    getImmediateThreeActionsChallenge,
    getFirstPrinciplesPhysiology,
    getBedsideCommunicationAndJargon,
    getThreeTierExamSynthesis,
    BGA_TRAINING_CASES,
    CORE_SURVIVAL_KEYWORDS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CurriculumEngine;
  } else {
    global.CurriculumEngine = CurriculumEngine;
  }

})(typeof window !== 'undefined' ? window : this);
