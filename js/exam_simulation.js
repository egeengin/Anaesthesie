/**
 * FACHARZTPRÜFUNG ANÄSTHESIOLOGIE - ÄKNO DÜSSELDORF LIVE SIMULATION ENGINE
 * Authentic Oral Board Simulator based on real examination protocols from Düsseldorf
 * Features:
 * - 36 Authentic Düsseldorf Cases (Annecke, Kienbaum, Wappler, Hohn, Peters)
 * - Voice-First dialogue with dynamic examiner interruption & acute complications
 * - Real-time crisis vitals & live clinical monitor state changes
 * - Automated ÄKNO scoring with K.O.-Criteria radar detection
 */

(function (global) {
  'use strict';

  const EXAM_DURATION_SECONDS = 45 * 60; // 45 Minutes

  /**
   * Complete Registry of all 36 authentic ÄKNO Düsseldorf protocol cases
   */
  const DUS_SIMULATION_REGISTRY = {
    q_dus_01: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ehem. UK Köln · ÄKNO Prüfungsvorsitzender",
        focus: "Schwere Aortenklappenstenose, Vorlasterhalt, Sinusrhythmus 60-80, Noradrenalin/Phenylephrin",
        focus_tr: "Ağır Aort Darlığı (kesinlikle SPA yok!), Ön yükün korunması, Sinüs ritmi 60-80, Noradrenalin/Fenilefrin",
        trap: "Spinalanästhesie (absolutes K.O.-Kriterium!) oder Tolerieren von Tachykardie",
        trap_tr: "Spinal anestezi önermek (kesin K.O. kriteri!) veya taşikardiye göz yummak",
      },
      speechIntro: "Guten Tag, Herr Kollege. Die Prüfungskommission Düsseldorf stellt Ihnen folgenden Fall vor: Ein 76-jähriger Patient mit hochgradiger symptomatischer Aortenklappenstenose soll sich einer dringlichen laparoskopischen Hemikolektomie unterziehen. Der Operateur fragt, ob eine Spinalanästhesie schonender wäre. Wie lautet Ihre Strategie, welche Zielparameter setzen Sie und warum ist eine Spinalanästhesie absolut kontraindiziert?",
      speechIntro_tr: "İyi günler meslektaşım. Düsseldorf sınav komisyonu size şu vakayı sunuyor: İleri derecede semptomatik aort kapak darlığı olan 76 yaşında bir hasta, tıkayıcı kolon kanseri nedeniyle acil laparoskopik hemikolektomiye alınacaktır. Cerrah, spinal anestezinin hasta için daha az yorucu olup olmayacağını soruyor. Stratejiniz nedir, hangi hedef parametreleri belirlersiniz ve spinal anestezi neden kesinlikle kontrendikedir?",
      crisis: {
        title: "⚡ Kreislaufkollaps nach Einleitung!",
        title_tr: "⚡ İndüksiyon Sonrası Dolaşım Çöküşü!",
        prompt_de: "Achtung, Herr Kollege! Unmittelbar nach Gabe des Narkotikums bricht der Blutdruck dramatisch auf 55/30 mmHg ein, Herzfrequenz 130/min Sinustachykardie! Der Patient wird kreideweiß! Was ist Ihre Sofortmaßnahme in den nächsten 30 Sekunden?!",
        prompt_tr: "Dikkat meslektaşım! Anestezik ilacın verilmesinden hemen sonra tansiyon dramatik biçimde 55/30 mmHg'ye çakılıyor, kalp hızı 130/dk sinüs taşikardisi! Hasta kireç gibi bembeyaz oldu! Önümüzdeki 30 saniye içindeki acil müdahaleniz nedir?!",
        vitals: { spo2: "90%", bp: "55/30", map: "38 mmHg", hr: "130 /min", etco2: "24 mmHg", temp: "36.8 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Sofortiger Bolus Noradrenalin/Phenylephrin zur raschen Wiederherstellung des SVR, Volumen bolusweise, Narkosetiefe reduzieren, Sinusrhythmus sichern!",
        targetAction_tr: "SVR'yi hızla yükseltmek için derhal Noradrenalin/Fenilefrin bolusu, bolus kristalloid sıvı, anestezi derinliğini hafifletmek, 60-80/dk sinüs ritmini güvenceye almak!",
      },
      koCriteria: {
        forbiddenPatterns: [/spinal/i, /subarachnoidal/i, /peridural/i, /pda\b/i],
        failureReason: "Eine Spinalanästhesie ist bei schwerer Aortenklappenstenose absolut kontraindiziert! Die akute Sympathikolyse senkt den SVR schlagartig; der feste Stenosequerschnitt verhindert einen kompensatorischen Auswurf -> letale myokardiale Minderperfusion!",
        failureReason_tr: "Ağır aort darlığında spinal anestezi kesinlikle kontrendikedir! Hızlı gelişen sempatik blokaj SVR'yi aniden sıfırlar; sabit kapak alanı kompansatuar debi artışına izin vermez -> ölümcül miyokardiyal perfüzyon çöküşü ve kardiyak arrest!",
        mandatoryKeywords: ["noradrenalin", "arterie", "sinusrhythmus", "vorlast"]
      }
    },
    q_dus_02: {
      examiner: {
        name: "Prof. Dr. med. Andreas Hohn",
        hospital: "Kliniken der Stadt Köln / Universität zu Köln · Leitender Thoraxanästhesist",
        focus: "Thoraxanästhesie, DLT, Einlungenventilation (OLV), 5-Stufen-Hypoxämieschema",
        focus_tr: "Toraks anestezisi, DLT, Tek Akciğer Ventilasyonu (OLV), 5 basamaklı hipoksemi algoritması",
        trap: "Hektisches Reagieren ohne strukturiertes 5-Stufen-Rettungskonzept",
        trap_tr: "Yapılandırılmış 5 basamaklı kurtarma planı yerine panik halinde plansız müdahale etmek",
      },
      speechIntro: "Frau Kollegin, wir sind im Thorax-Saal: Während einer VATS mit linksseitigem Doppellumentubus fällt die SpO2 unter Einlungenventilation rasch von 98% auf 81% ab. Beschreiben Sie bitte das strukturierte 5-Stufen-Rettungsschema bei akuter OLV-Hypoxämie und wie Sie die Tubuslage fiberoptisch verifizieren.",
      speechIntro_tr: "Meslektaşım, toraks ameliyathanesindeyiz: Sol çift lümenli tüp (DLT) ile yapılan VATS sırasında tek akciğer ventilasyonunda (OLV) SpO2 hızla %98'den %81'e düşüyor. Lütfen OLV hipoksemisinde yapılandırılmış 5 basamaklı kurtarma planını ve tüp yerleşimini fiberoptik olarak nasıl doğrulayacağınızı anlatınız.",
      crisis: {
        title: "⚡ Akute Dekompensation unter OLV!",
        title_tr: "⚡ Tek Akciğer Ventilasyonunda (OLV) Akut Dekompansasyon!",
        prompt_de: "Frau Kollegin, trotz FiO2 1,0 sinkt die SpO2 weiter auf 74%! Der Operateur beschwert sich über schlechte Sicht. Was ist der nächste zwingende Schritt in Ihrem Algorithmus?",
        prompt_tr: "Meslektaşım, %100 FiO2 verilmesine rağmen SpO2 %74'e düşmeye devam ediyor! Cerrah akciğerin sönmediğinden şikayetçi. Algoritmanızdaki bir sonraki zorunlu adım nedir?",
        vitals: { spo2: "74%", bp: "95/55", map: "68 mmHg", hr: "118 /min", etco2: "48 mmHg", temp: "36.5 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Fiberoptische Lagekontrolle, CPAP 2-5 cmH2O mit 100% O2 an die nicht-ventilierte Lunge, PEEP-Titration abhängige Lunge!",
        targetAction_tr: "Fiberoptik tüp pozisyonu kontrolü, havalandırılmayan (kollabe) akciğere 2-5 cmH2O CPAP ile %100 O2 verilmesi, bağımlı akciğerde PEEP optimizasyonu (5-8 cmH2O)!",
      },
      koCriteria: {
        forbiddenPatterns: [/kein cpap/i, /sofort extubieren/i],
        failureReason: "Fehlendes Beherrschen des 5-Stufen-Rettungsplans bei OLV-Hypoxämie gefährdet das Patientenüberleben unmittelbar.",
        failureReason_tr: "OLV hipoksemisinde 5 basamaklı kurtarma planının bilinmemesi hastanın hayatını doğrudan tehlikeye atar.",
        mandatoryKeywords: ["fio2", "cpap", "bronchoskop", "peep", "carina"]
      }
    },
    q_dus_03: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, Universitätsklinikum Düsseldorf (UKD)",
        focus: "Schockraum Polytrauma, Schädel-Hirn-Trauma, Ziel-CPP ≥ 60-70 mmHg, ROTEM-Therapie",
        focus_tr: "Travmatik beyin hasarı (SHT), CPP >= 60-70 mmHg, Permissif hipotansiyon YASAĞI, Noradrenalin ile MAP >= 80-90",
        trap: "Permissive Hypotonie bei Schädel-Hirn-Trauma (absolutes K.O.-Kriterium!)",
        trap_tr: "Kafa travmasında permissif hipotansiyon uygulamak (kesin K.O. kriteri!) veya PEEP ile ICP'yi artırmak",
      },
      speechIntro: "Schockraum Düsseldorf: Ein 34-jähriger Polytraumapatient präsentiert sich mit instabilem Becken, freier Flüssigkeit und schwerem SHT mit GCS 6 und Anisokorie. Blutdruck 75/40 mmHg. Wie lösen Sie das Dilemma zwischen permissiver Hypotonie und neuroprotektiver Perfusion, wie lautet das Tranexamsäure-Regime und wie steuern Sie die Gerinnung mit ROTEM?",
      speechIntro_tr: "Şok odasındayız meslektaşım: Şiddetli travmatik beyin hasarı (GKS 5, geniş anizokorik sağ pupil, acil kraniyotomi endikasyonu) olan 24 yaşında politravmalı bir hasta getiriliyor. Asistan arkadaş MAP 55 mmHg değerini 'permissif hipotansiyon' olarak tolere etmek istiyor. Pozisyonunuz nedir, hemodinamik hedef değerleriniz nelerdir ve permissif hipotansiyon burada neden kesin bir K.O. kriteridir?",
      crisis: {
        title: "⚡ Einklemmungszeichen im Schockraum!",
        title_tr: "⚡ Ağır Travmatik Beyin Hasarında Hipotansiyon!",
        prompt_de: "Herr Kollege, die rechte Pupille wird lichtstarr und weit, der Blutdruck fällt auf 65/35 mmHg! Was tun Sie JETZT für das Gehirn und das Becken gleichzeitig?!",
        prompt_tr: "İndüksiyon sırasında tansiyon 75/40 mmHg'ye (MAP 51 mmHg) çakılıyor, ICP tahmini 25 mmHg! Asistan hekim kanama kontrolü için tansiyonu düşük tutmak istiyor! Müdahaleniz nedir?!",
        vitals: { spo2: "86%", bp: "65/35", map: "45 mmHg", hr: "140 /min", etco2: "28 mmHg", temp: "35.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Sofort MAP auf ≥ 80-90 mmHg mit Noradrenalin anheben (CPP ≥ 60-70!), Pelvic Binder anlegen, Osmotherapie (NaCl 3%/Mannitol)!",
        targetAction_tr: "Kesinlikle izin verilmez! MAP derhal Noradrenalin ile >= 80-90 mmHg'ye yükseltilerek Serebral Perfüzyon Basıncı (CPP = MAP - ICP) >= 60-70 mmHg hedefine ulaştırılmalıdır!",
      },
      koCriteria: {
        forbiddenPatterns: [/permissiv/i, /hypotonie tolerieren/i, /niedrigen blutdruck/i],
        failureReason: "Permissive Hypotonie ist bei begleitendem schwerem SHT streng kontraindiziert! Der Abfall des MAP führt bei erhöhtem ICP zur irreversiblen ischämischen Hirnstammschädigung!",
        failureReason_tr: "Travmatik Beyin Hasarında (SHT) permissif hipotansiyon uygulanması kesinlikle YASAKTIR! MAP < 80 mmHg tek bir epizot bile serebral iskemiyi katlayarak mortaliteyi ikiye katlar; doğrudan sınavdan kalma sebebidir!",
        mandatoryKeywords: ["cpp", "map", "tranexamsäure", "pelvic", "becken", "rotem", "fibrinogen"]
      }
    },
    q_dus_04: {
      examiner: {
        name: "Prof. Dr. med. Frank Wappler",
        hospital: "Kliniken der Stadt Köln / Universität Witten/Herdecke · Nationales MH-Referenzzentrum",
        focus: "Maligne Hyperthermie, Hyperkapnie als Frühzeichen, Dantrolen 2,5 mg/kg, Verapamil-Verbot",
        focus_tr: "Malign Hipertermi (MH), Tetikleyicileri derhal kes, %100 O2 High-Flow, Dantrolen 2.5 mg/kg, Aktif kömür filtresi",
        trap: "Gabe von Kalziumantagonisten (K.O.-Kriterium!) oder Verpassen des EtCO2-Anstiegs",
        trap_tr: "Malign hipertermide taşikardi/aritmi için kalsiyum kanal blokeri vermek (ölümcül kardiyovasküler arrest!)",
      },
      speechIntro: "Herr Kollege, 15 Minuten nach Narkoseeinleitung mit Sevofluran und Succinylcholin registrieren Sie einen steilen EtCO2-Anstieg von 35 auf 84 mmHg trotz Hyperventilation. Die Herzfrequenz steigt auf 155/min, es besteht Masseterspasmus. Nennen Sie Diagnose, 8-Punkte-Notfallplan, Dantrolen-Dosis und Hyperkaliämietherapie.",
      speechIntro_tr: "Meslektaşım, 18 yaşında sağlıklı bir gençte genel anestezi (Sevofluran + Süksinilkolin) altında apandisit ameliyatındayız. İndüksiyondan 15 dakika sonra etCO2 aniden 40'tan 75 mmHg'ye fırlar, taşikardi (145/dk) ve çene kaslarında sertlik (masseter spazmı) gelişir. Şüpheniz nedir ve saniye saniye acil yaklaşımınız nasıldır?",
      crisis: {
        title: "⚡ Maligne Krise explodiert!",
        title_tr: "⚡ Masada Hipermetabolizma ve Rijidite (Malign Hipertermi)!",
        prompt_de: "Das EtCO2 schießt weiter auf 92 mmHg, KKT klettert auf 39,2 °C, EKG zeigt spitze T-Wellen und ventrikuläre Salven! Wie lautet die Dantrolen-Dosis und wie behandeln Sie das Kalium?!",
        prompt_tr: "EtCO2 dakikada 5 mmHg artarak 88 mmHg'ye ulaştı! Vücut sıcaklığı 39.4 °C'ye fırladı, hasta tahta gibi sertleşti! İlk 60 saniyedeki 3 hayat kurtarıcı adımınız nedir?!",
        vitals: { spo2: "93%", bp: "175/105", map: "128 mmHg", hr: "158 /min", etco2: "92 mmHg", temp: "39.4 °C", rhythm: "Tachykardie + VES", alert: true },
        targetAction: "Dantrolen 2.5 mg/kg i.v. Bolus sofort, Trigger stop, 100% O2, Kalziumglukonat 10 ml + Glukose/Insulin gegen Hyperkaliämie!",
        targetAction_tr: "TÜM TETİKLEYİCİLERİ DERHAL KES (Sevofluranı kapat, buharlaştırıcıyı sök), %100 O2 ile High-Flow (>10 L/dk) hiperventilasyon, DANTROLEN 2.5 mg/kg İ.V. hızlı bolus uygula!",
      },
      koCriteria: {
        forbiddenPatterns: [/verapamil/i, /diltiazem/i, /calciumantagonist/i, /kalziumantagonist/i],
        failureReason: "Kalziumkanalblocker sind bei Maligner Hyperthermie streng kontraindiziert! In Kombination mit Dantrolen droht irreversibler Herzstillstand!",
        failureReason_tr: "Malign Hipertermide kalsiyum kanal blokerleri (Verapamil/Diltiazem) vermek ölümcüldür (kardiyovasküler kollaps ve hiperkalemi)! Tetikleyici gazın kesilmemesi ve Dantrolenin gecikmesi K.O. kriteridir.",
        mandatoryKeywords: ["dantrolen", "trigger", "hyperventilation", "kühlung", "kalium", "insulin"]
      }
    },
    q_dus_05: {
      examiner: {
        name: "ÄKNO Intensivkommission (DIVI)",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfungsgremium Intensivmedizin",
        focus: "Sepsis-3 '1-Hour-Bundle', Noradrenalin Ziel-MAP ≥ 65, ARDS Berlin-Kriterien, Bauchlagerung ≥ 16h",
        focus_tr: "LAST (Lokal Anestezik Toksisitesi), Lipid Emülsiyonu %20 (1.5 ml/kg bolus), CPR modifikasyonu, Düşük doz Adrenalin",
        trap: "Gabe synthetischer Kolloide (HES) oder Beatmung mit > 6 ml/kg PBW",
        trap_tr: "LAST kardiyak arrestinde Vazopressin veya Lidokain kullanmak; standart yüksek doz Adrenalin vermek",
      },
      speechIntro: "Ein 68-jähriger Patient wird mit uroseptischem Schock aufgenommen: MAP 52 mmHg, Laktat 4,2 mmol/l. Was beinhaltet das '1-Hour-Bundle' nach Surviving Sepsis, welcher Vasopressor ist 1. Wahl mit welchem Zielwert und wie lauten die ARDS Berlin-Kriterien inklusive Beatmungszielen und Bauchlagerung?",
      speechIntro_tr: "Meslektaşım, omuz artroskopisi için ultrason eşliğinde interskalen blok (20 ml Ropivakain %0.75) uyguluyorsunuz. Enjeksiyonun bitiminden hemen sonra hasta dilde metalik tat, kulak çınlaması ve ağız çevresinde uyuşma olduğunu söylüyor; ardından jeneralize tonik-klonik nöbet başlıyor. Tanınız nedir ve acil kurtarma protokolünüzü açıklayınız.",
      crisis: {
        title: "⚡ Refraktäre Hypoxämie auf der Intensivstation!",
        title_tr: "⚡ Lokal Anestezik Sistemik Toksisitesi (LAST) & Nöbet!",
        prompt_de: "Der Horovitz-Quotient fällt unter PEEP 14 cmH2O auf 88 mmHg ab! Der Driving Pressure liegt bei 19 cmH2O. Welche lungenprotektiven Maßnahmen und welches Lagerungsmanöver leiten Sie jetzt ein?",
        prompt_tr: "Hasta masada kasılıyor, ardından EKG'de geniş QRS aritmisi ve asistoli gelişiyor! LAST resüsitasyonunda hangi spesifik antidot İLK TERCİHTİR ve nasıl dozlanır?!",
        vitals: { spo2: "82%", bp: "80/45", map: "56 mmHg", hr: "125 /min", etco2: "54 mmHg", temp: "38.9 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Tidalvolumen strikt 6 ml/kg PBW, Driving Pressure ≤ 14 cmH2O, sofortige Bauchlagerung (Prone Positioning) für mindestens 16 Stunden!",
        targetAction_tr: "LİPİD EMÜLSİYONU %20 (Intralipid): Derhal 1.5 ml/kg İ.V. bolus (yaklaşık 100 ml 1 dakikada), ardından 0.25 ml/kg/dk sürekli infüzyon; CPR, %100 O2, Adrenalin düşük doz (<= 1 µg/kg)!",
      },
      koCriteria: {
        forbiddenPatterns: [/hes\b/i, /hydroxyethyl/i, /kolloid/i, /10 ml\/kg/i],
        failureReason: "Synthetische Kolloide führen bei Sepsis zu akutem Nierenversagen und erhöhter Letalität! Beatmung über 6 ml/kg PBW induziert Baro-/Volutrauma.",
        failureReason_tr: "LAST krizinde Vazopressin verilmesi, lokal anestezik (Lidokain) antiaritmik kullanılması veya Lipid Emülsiyonunun gecikmesi kesin K.O. kriteridir.",
        mandatoryKeywords: ["laktat", "blutkultur", "antibiotik", "noradrenalin", "6 ml", "bauchlagerung", "horovitz"]
      }
    },
    q_dus_06: {
      examiner: {
        name: "ÄKNO Spezialkommission Geburtshilfe",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Geburtshilfliche Anästhesie",
        focus: "Notsectio EEZ ≤ 20 min, Vena-cava-Syndrom Linksseitenkippung 15-30°, MgSO4 bei Präeklampsie",
        focus_tr: "Kantitatif Relaksometri, TOF oranı >= 0.9, Sugammadeks dozları (2 vs 4 vs 16 mg/kg), Rezidüel felcin önlenmesi",
        trap: "Vergessen der Linksseitenkippung oder Gabe von Benzodiazepinen statt MgSO4 bei Eklampsie",
        trap_tr: "TOF kontrolü yapmadan yalnızca klinik testlere (baş kaldırma) güvenmek veya yetersiz Sugammadeks dozu vermek",
      },
      speechIntro: "Notsectio-Alarm im Kreißsaal: Schwangere mit persistierender fetaler Bradykardie (55/min) bei V. a. Plazentalösung. Wie lautet die geforderte Entscheidungs-Entbindungs-Zeit, welche anästhesiologischen Besonderheiten gelten für RSI und Lagerung, und wie behandeln Sie eine schwere Präeklampsie?",
      speechIntro_tr: "Ayılma odasındayız: Laparoskopik kolesistektomi sonrası ekstübe edilen 65 yaşında bir hasta ayılma odasında yüzeyel soluyor, başını kaldıramıyor ve çift gördüğünü söylüyor. Nöromüsküler iletim monitörizasyonu (TOF) yapıyorsunuz ve TOF oranı 0.45 çıkıyor. Durumu nasıl değerlendirirsiniz ve farmakolojik geri çevirme (reversiyon) stratejiniz nedir?",
      crisis: {
        title: "⚡ Eklamptischer Anfall im Saal!",
        title_tr: "⚡ Ayılma Odasında Rezidüel Kürarizasyon (Kas Gevşetici Kalıntısı)!",
        prompt_de: "Während der Vorbereitung beginnt die Schwangere generalisiert tonisch-klonisch zu krampfen! Blutdruck 210/120 mmHg. Was ist das Mittel der 1. Wahl und welches Antidot muss bereitstehen?!",
        prompt_tr: "SpO2 %84'e düşüyor, hasta sekresyonlarını yutamıyor! TOF oranı 0.40. Hastayı korumak için hangi spesifik ajanı hangi dozda uygularsınız?!",
        vitals: { spo2: "84%", bp: "210/120", map: "150 mmHg", hr: "145 /min", etco2: "45 mmHg", temp: "37.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Magnesiumsulfat 4-6 g i.v. als Kurzinfusion über 15-20 min, Calciumgluconat 10% als Antidot bereithalten, Linksseitenkippung sichern, zügige RSI!",
        targetAction_tr: "SUGAMMADEKS: Orta derece blokta (TOF >= 2 yanıt) 2 mg/kg İ.V.; derin blokta (PTC 1-2) 4 mg/kg İ.V.! TOF oranı >= 0.90 olana kadar hasta asla yalnız bırakılmaz!",
      },
      koCriteria: {
        forbiddenPatterns: [/diazepam als 1/i, /dormicum zuerst/i, /flach lagern/i],
        failureReason: "Magnesiumsulfat ist das einzige Mittel der 1. Wahl bei Eklampsie (Benzodiazepine erhöhen perinatale Depression). Fehlende Linksseitenkippung führt zum tödlichen Vena-cava-Kollaps.",
        failureReason_tr: "TOF oranı >= 0.9 olmadan hastanın ekstübe edilmesi veya rezidüel bloğun tanınamaması ağır aspirasyona ve hipoksiye yol açar.",
        mandatoryKeywords: ["eez", "linksseitenkippung", "magnesium", "rsi", "calciumgluconat", "urapidil"]
      }
    },
    q_dus_07: {
      examiner: {
        name: "DGAI Kommission Regionalanästhesie",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Referenzprüfer Rückenmarksnahe Regionalanästhesie",
        focus: "Rivaroxaban Karenz 48h, LAST Notfallprotokoll, Intralipid 20% 1,5 ml/kg Bolus",
        focus_tr: "Travmatik koagülopati, ROTEM / FIBTEM yönlendirmeli hemostaz, Fibrinojen >= 1.5-2.0 g/L, TXA erken verilmesi",
        trap: "Punktion unter NOAK ohne Karenz oder Vasopressin/Verapamil bei LA-Intoxikation",
        trap_tr: "FIBTEM düşüklüğünde FFP ile volüm yüklemek yerine faktör konsantresi vermemek; Kalsiyum takibini unutmak",
      },
      speechIntro: "Eine 64-jährige Patientin unter Rivaroxaban und ASS soll eine Knie-TEP in Spinalanästhesie mit Femoraliskatheter erhalten. Welche Karenzzeiten gelten nach Leitlinie? Wenn es nach Bolusgabe von Ropivacain am Katheter zu Krampfanfall und Arrhythmie kommt: Wie lautet Ihr Notfallprotokoll (LAST) inklusive Lipidtherapie?",
      speechIntro_tr: "Şok odasındayız: Çoklu travma (pelvis kırığı, karaciğer laserasyonu, femur kırığı) geçiren 35 yaşında bir hasta getiriliyor. Hb 6.5 g/dl, tansiyon 70/40 mmHg, diffüz sızıntı kanaması mevcut. Koagülopatiyi ve masif kanamayı ROTEM eşliğinde nasıl yönetirsiniz?",
      crisis: {
        title: "⚡ LAST: Herz-Kreislauf-Stillstand!",
        title_tr: "⚡ Politravmada Masif Kanama & Akut Travmatik Koagülopati!",
        prompt_de: "Herr Kollege, die Patientin krampft, das EKG zeigt breite bizarre Kammerkomplexe, kein Carotispuls mehr tastbar! Nennen Sie sofort die exakte Intralipid-Dosierung und was Sie bei der CPR modifizieren!",
        prompt_tr: "ROTEM sonucu geldi: FIBTEM A10 değeri 5 mm (hedef >= 10-12 mm)! Diffüz kanama devam ediyor. İlk hangi hedefe yönelik faktör konsantresini uygularsınız?!",
        vitals: { spo2: "60%", bp: "0/0", map: "0 mmHg", hr: "180 /min", etco2: "12 mmHg", temp: "36.4 °C", rhythm: "Breitkomplextachykardie / VF", alert: true },
        targetAction: "LA-Stop, Intralipid 20% Bolus 1.5 ml/kg i.v. über 1 min, dann 0.25 ml/kg/min! Adrenalin reduzieren (< 1 µg/kg), prolongierte CPR > 60 min!",
        targetAction_tr: "FİBRİNOJEN KONSANTRESİ (Haemocomplettan): 2-4 g İ.V. (veya 30-50 mg/kg), TRANEXAMİK ASİT (TXA): 1 g İ.V. bolus (ilk 3 saatte!), Masif transfüzyon protokolü (1:1:1), Kalsiyum > 1.1 mmol/L!",
      },
      koCriteria: {
        forbiddenPatterns: [/vasopressin/i, /lidocain zur therapie/i, /verapamil/i],
        failureReason: "Vasopressin, Lidocain und Kalziumantagonisten sind bei LAST streng kontraindiziert! Adrenalin muss niedrig dosiert werden.",
        failureReason_tr: "Ağır travmatik kanamada Fibrinojen düşüklüğünü tanımayıp körlemesine sadece eritrosit süspansiyonu vermek veya TXA'yı geciktirmek mortaliteyi katlar.",
        mandatoryKeywords: ["rivaroxaban", "48", "lipid", "intralipid", "1,5 ml/kg", "midazolam"]
      }
    },
    q_dus_08: {
      examiner: {
        name: "ÄKNO Pädiatriekommission",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Kinderanästhesie",
        focus: "Laryngospasmus, Larson-Manöver, Succinylcholin IMMER mit Atropin beim Kleinkind, Tubusformel Alter/4 + 3.5",
        focus_tr: "Yüksek spinal blok (kardiyoakseleratör liflerin T1-T4 blokajı), Atropin, Adrenalin/Noradrenalin, Pozisyon hatasından kaçınma",
        trap: "Succinylcholin ohne Atropin beim Kleinkind (Gefahr der vagalen Asystolie!)",
        trap_tr: "Tansiyon düştü diye hastayı Trendelenburg pozisyonuna almak (hiperbarik lokal anesteziyi daha da yukarı kaydırır!)",
      },
      speechIntro: "Ein 4-jähriges Kind (16 kg) entwickelt unmittelbar nach Extubation nach Tonsillotomie schwere juguläre Einziehungen, Stridor, SpO2-Abfall auf 74% und Bradykardie von 55/min. Beschreiben Sie Differenzialdiagnose, anatomische Besonderheiten, Tubusgrößenformel und den Stufenplan zur Notfallbeherrschung.",
      speechIntro_tr: "Meslektaşım, transüretral prostat rezeksiyonu (TUR-P) için L3/L4 seviyesinden spinal anestezi (12.5 mg hiperbarik Bupivakain) uyguladınız. Bloktan 8 dakika sonra hasta ellerinde uyuşma, nefes alamama hissi ve bulantıdan yakınıyor. Tansiyon 60/30 mmHg, nabız 32/dk. Ne oldu ve acil müdahaleniz nedir?",
      crisis: {
        title: "⚡ Hypoxische Bradykardie beim Kleinkind!",
        title_tr: "⚡ Yüksek Spinal Blok & Ağır Bradikardi!",
        prompt_de: "Trotz CPAP-Maskenbeatmung fällt die Herzfrequenz weiter auf 38/min, das Kind wird zyanotisch! Wie lautet Ihre medikamentöse Notfallkombination und Dosis JETZT?!",
        prompt_tr: "Tansiyon ölçülemiyor, nabız 28/dk derin bradikardi, bilinç bulanıklaşıyor! Kalp durmasını önlemek için İLK farmakolojik adımınız nedir?!",
        vitals: { spo2: "62%", bp: "50/25", map: "33 mmHg", hr: "38 /min", etco2: "58 mmHg", temp: "36.7 °C", rhythm: "Schwere Bradykardie", alert: true },
        targetAction: "Succinylcholin 0.5-1.0 mg/kg i.v. zwingend ZUSAMMEN mit Atropin 0.02 mg/kg i.v. (mind. 0.1 mg) zur Verhinderung der vagalen Asystolie!",
        targetAction_tr: "ATROPİN 0.5-1.0 mg İ.V. ve/veya ADRENALİN 10-20 µg İ.V. titre bolus, SVR için Noradrenalin, hızlı kristaloid bolusu, başı asla aşağı indirmeyin (blok yükselir!), %100 O2 maske ile!",
      },
      koCriteria: {
        forbiddenPatterns: [/succinylcholin allein/i, /ohne atropin/i],
        failureReason: "Succinylcholin ohne begleitendes Atropin führt beim hypoxischen Kleinkind zur unmittelbaren letalen vagalen Asystolie!",
        failureReason_tr: "Yüksek spinal anestezide gelişen şiddetli bradikardi kardiyak arrestin habercisidir. Trendelenburg pozisyonu verilmesi ilacın servikal kordona yayılımını hızlandırarak tam solunum ve dolaşım felcine yol açar!",
        mandatoryKeywords: ["laryngospasmus", "larson", "succinylcholin", "atropin", "cpap", "alter/4"]
      }
    },
    q_dus_09: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, Universitätsklinikum Düsseldorf (UKD)",
        focus: "Schockraum Polytrauma & SHT, Beckenfraktur, Tranexamsäure, MAP ≥ 80-90 mmHg",
        focus_tr: "Akut intraoperatif bronkospazm, Sevofluran bronkodilatasyonu, Salbutamol, Magnezyum sülfat 2 g, İ.V. Adrenalin",
        trap: "Permissive Hypotonie bei Schädel-Hirn-Trauma",
        trap_tr: "İntraoperatif bronkospazmda havayolunu aspire etmeye çalışarak laringo/bronkospazmı tetiklemek; ekspiryum süresini kısaltmak",
      },
      speechIntro: "Ein 34-jähriger Motorradfahrer wird nach Hochrasanztrauma eingeliefert: GCS 6, Anisokorie rechts, instabiler Beckenring, RR 75/40 mmHg, SpO2 88%. Wie lösen Sie den Konflikt zwischen permissiver Hypotonie und CPP bei SHT? Erläutern Sie Schockraum-SOP, Narkoseeinleitung und intensivmedizinische Zielkorridore.",
      speechIntro_tr: "Ağır astım öyküsü olan 42 yaşında bir hastanın genel anestezi indüksiyonu ve entübasyonu sonrasında tepe solunum basıncı 48 cmH2O'ya fırlar, tidal hacim 150 ml'ye düşer, kapnografide tipik köpekbalığı yüzgeci (shark-fin) deseni görülür ve SpO2 %82'ye geriler. Therapierefraktör bronkospazmı adım adım nasıl çözersiniz?",
      crisis: {
        title: "⚡ Unkale Herniation droht!",
        title_tr: "⚡ Hayatı Tehdit Eden Şiddetli Bronkospazm!",
        prompt_de: "Der Blutdruck fällt auf 60/35 mmHg, die rechte Pupille wird lichtstarr! Der Chirurg will erst auf die Röntgen-Thorax warten. Was ist Ihre Sofortentscheidung?",
        prompt_tr: "Solunum sesleri neredeyse tamamen kayboldu (sessiz akciğer / silent lung), SpO2 %76'ya indi, tansiyon düşüyor! Farmakolojik basamaklı acil planınız nedir?!",
        vitals: { spo2: "85%", bp: "60/35", map: "43 mmHg", hr: "135 /min", etco2: "29 mmHg", temp: "35.0 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Kein Zeitverlust! Sofort Beckenschlinge anlegen, Noradrenalin auf Ziel-MAP ≥ 80-90 mmHg titrieren, RSI mit Ketamin/Rocuronium, Notfall-CT Kopf/Becken!",
        targetAction_tr: "Anesteziyi SEVOFLURAN ile derinleştir (güçlü bronkodilatör), SALBUTAMOL inhaler/İ.V., MAGNEZYUM SÜLFAT 2 g İ.V. kısa infüzyon, refrakter ise ADRENALİN 10-50 µg İ.V. titre, KETAMİN 0.5-1 mg/kg İ.V.!",
      },
      koCriteria: {
        forbiddenPatterns: [/permissive hypotonie/i, /niedrigen blutdruck tolerieren/i],
        failureReason: "Permissive Hypotonie bei SHT ist ein sofortiges K.O.-Kriterium in Düsseldorf! MAP muss mindestens 80-90 mmHg betragen.",
        failureReason_tr: "Bronkospazm sırasında yüzeyel anestezi ile aspire etmeye çalışmak spazmı daha da şiddetlendirir. Ekspiryum süresini uzatmadan yüksek frekansla solutmak dinamik hiperinflasyona ve tansiyon pnömotoraksa yol açar.",
        mandatoryKeywords: ["map", "cpp", "beckenschlinge", "pelvic", "ketamin", "tranexamsäure"]
      }
    },
    q_dus_10: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Karotis-TEA, zervikale Plexusblockade, NIRS/Shunt-Indikation, akutes Wundhämatom am Bett eröffnen",
        focus_tr: "İntraoperatif Awareness, TIVA hatlarının kontrolü (dislokasyon/tıkanma), Derhal anestezi derinleştirme, Postoperatif psikolojik takip",
        trap: "Warten auf OP-Saal bei akutem Hals-Wundhämatom (K.O.-Kriterium - Ersticken!)",
        trap_tr: "Farkındalık belirtilerinde derinleştirme yapmadan sadece kas gevşetici yapmak (hastayı uyanık felç etmek - mutlak facia!)",
      },
      speechIntro: "Bei einem 68-jährigen Patienten soll eine Karotis-TEA durchgeführt werden. Vergleichen Sie Allgemeinanästhesie vs. zervikale Plexusblockade, erläutern Sie das perioperative Neuromonitoring, Shunt-Kriterien sowie das Notfallmanagement eines akuten postoperativen Hals-Wundhämatoms.",
      speechIntro_tr: "Total İntravenöz Anestezi (TIVA: Propofol + Remifentanil) altında elektif omurga cerrahisi yapılan bir hastada intraoperatif farkındalık (awareness) şüphesi doğuyor: Kan basıncı 185/105 mmHg, kalp hızı 115/dk, lakrimasyon ve terleme mevcut, BIS değeri 78'e çıkmış. Akut yönetiminiz ve sonrasındaki yaklaşımınız nedir?",
      crisis: {
        title: "⚡ Akute Erstickungsgefahr im Aufwachraum!",
        title_tr: "⚡ TIVA Altında İntraoperatif Farkındalık (Awareness)!",
        prompt_de: "Im Aufwachraum schwillt der Hals innerhalb von 2 Minuten prall-elastisch an! Der Patient ringt nach Luft, SpO2 stürzt auf 70%! Die Pflege will den OP anrufen. Was tun Sie in DIESER Sekunde?",
        prompt_tr: "BIS monitörü 82 gösteriyor, hasta hafifçe hareketleniyor! Perfüzör hattında ne olmuş olabilir ve ilk 30 saniyede ne yaparsınız?!",
        vitals: { spo2: "70%", bp: "190/100", map: "130 mmHg", hr: "130 /min", etco2: "55 mmHg", temp: "36.8 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "SOFORTIGE Naht- und Faszieneröffnung am Bett mit der Schere! Keine Zeit vergeuden mit Transport oder OP-Rufen vor Dekompression!",
        targetAction_tr: "Damar yolunu ve TIVA hatlarını kontrol et (ekstravazasyon/musluk kapalılığı!), derhal yedek damar yolundan ek anestezik bolusu uygula veya Sevofluran buharlaştırıcıyı aç; postoperatif yapılandırılmış açıklama yap!",
      },
      koCriteria: {
        forbiddenPatterns: [/warten auf den op/i, /in den op transportieren vor eröffnung/i],
        failureReason: "Warten auf den OP-Saal bei akutem Hals-Wundhämatom nach Karotis-TEA führt zur Erstickung durch Larynxkompression! Die Wunde MUSS am Bett sofort eröffnet werden!",
        failureReason_tr: "Farkındalık şüphesinde sadece kas gevşetici vererek hastayı hareketsiz kılmak ve anesteziyi derinleştirmemek korkunç bir travmaya ve ağır malpraktise yol açar.",
        mandatoryKeywords: ["bett", "nahtöffnung", "eröffnen", "zervikoplexus", "shunt", "nirs"]
      }
    },
    q_dus_11: {
      examiner: {
        name: "Prof. Dr. med. Frank Wappler",
        hospital: "Kliniken der Stadt Köln / Nationales MH-Zentrum",
        focus: "Phäochromozytom, Alpha- vor Betablockade (Roizen-Kriterien), Urapidil intraoperativ, Noradrenalin nach Ligatur",
        focus_tr: "ARDS Berlin tanımlaması, Prone Pozisyonu (>= 16 saat/gün), Koruyucu ventilasyon (Vt 6 ml/kg IBW, Driving pressure <= 14)",
        trap: "Gabe von Betablockern vor Alphablockern (sofortiges Nichtbestehen!)",
        trap_tr: "ARDS'de tidal volümü hastanın gerçek kilosuna göre ayarlamak (ideal kiloya göre ayarlanmalı!) veya prone pozisyonunu unutmak",
      },
      speechIntro: "Eine 45-jährige Patientin mit paroxysmaler Hypertonie und 5 cm Nebennierenraumforderung (Phäochromozytom) wird vorgestellt. Erläutern Sie die präoperative Vorbereitung (Roizen-Kriterien), die Narkoseführung und das Management der extremen hämodynamischen Schwankungen.",
      speechIntro_tr: "Yoğun bakımda ağır ARDS (Pnömoni zemininde, PaO2/FiO2 oranı 85 mmHg) nedeniyle mekanik ventilatörde takip edilen 58 yaşında bir hastada refrakter hipoksemi gelişiyor. Lunge-protective (akciğer koruyucu) ventilasyon stratejinizi ve kurtarma tedavilerini açıklayınız.",
      crisis: {
        title: "⚡ Hypertensive Krise bei Tumormanipulation!",
        title_tr: "⚡ Ağır ARDS'de Tedaviye Dirençli Hipoksemi!",
        prompt_de: "Der Operateur manipuliert am Tumor: Der Blutdruck explodiert auf 250/135 mmHg, Herzfrequenz 145/min! Welches vasodilatierende Akutmedikament spritzen Sie sofort?",
        prompt_tr: "FiO2 1.0 ve PEEP 16 cmH2O altında PaO2 52 mmHg (Horovitz 52)! Sürüş basıncı (Driving pressure) 18 cmH2O. Kanıtlanmış en etkili kurtarma pozisyonu nedir ve nasıl uygulanır?!",
        vitals: { spo2: "97%", bp: "250/135", map: "173 mmHg", hr: "145 /min", etco2: "38 mmHg", temp: "37.0 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Urapidil (Ebrantil 12.5-25 mg i.v.), Phentolamin oder Nitroprussid; Esmolol erst NACH Alpha-Blockade! Nach Venenligatur Noradrenalin bereitstellen!",
        targetAction_tr: "PRONE POZİSYONU (Yüzüstü pozisyon): Günde en az 16 saat kesintisiz prone pozisyonu! Koruyucu ventilasyon (Vt 6 ml/kg ideal vücut ağırlığı, Delta P <= 14 cmH2O), erken dönemde nöromüsküler blokaj!",
      },
      koCriteria: {
        forbiddenPatterns: [/betablocker vor alpha/i, /erst betablocker/i, /metoprolol zuerst/i],
        failureReason: "Betablocker vor Alphablockern beim Phäochromozytom blockieren Beta-2-Vasodilation bei ungehemmter Alpha-1-Stimulation -> letales Lungenödem!",
        failureReason_tr: "Ağır ARDS'de yüksek tidal hacimlerle (>8 ml/kg) volütravmaya yol açmak veya endikasyonu olan prone pozisyonunu geciktirmek kanıtlanmış mortalite artışına neden olur.",
        mandatoryKeywords: ["phenoxybenzamin", "roizen", "urapidil", "phentolamin", "noradrenalin"]
      }
    },
    q_dus_12: {
      examiner: {
        name: "ÄKNO Spezialkommission Geburtshilfe",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Spezielle Geburtshilfe",
        focus: "HELLP-Syndrom, Notsectio, Thrombozytopenie < 50.000/µl, Magnesiumsulfat",
        focus_tr: "Akut hiperkalemi, Miyokard membran stabilizasyonu (Kalsiyum klorür %10), İntrasellüler kaydırma (İnsülin/Glukoz, Salbutamol)",
        trap: "Spinalanästhesie bei Thrombozyten < 50.000/µl (Kardinalfehler!)",
        trap_tr: "Geniş QRS'li hiperkalemide Kalsiyum vermeyi unutup sadece insülin veya bikarbonat vermek",
      },
      speechIntro: "Eine 32-jährige Schwangere (34. SSW) mit HELLP-Syndrom (Thrombozyten 38.000/µl, RR 190/115 mmHg) benötigt eine sofortige Notsectio wegen fetaler Bradykardie. Welches Anästhesieverfahren wählen Sie, warum scheidet eine Spinalanästhesie aus und wie lauten Ihre Schritte?",
      speechIntro_tr: "Diyaliz hastası acil ileus ameliyatına alınıyor. İndüksiyon öncesi kan gazında K+ 7.8 mmol/L saptanıyor. Monitörde sivri T dalgaları, P dalgası kaybı ve QRS genişlemesi görülüyor. Kardiyak arresti önlemek için basamaklı acil anti-hiperkalemi tedaviniz nedir?",
      crisis: {
        title: "⚡ Druckabfall und fetale Dezeleration!",
        title_tr: "⚡ Ölümcül Hiperkalemi ve Geniş QRS Aritmisi!",
        prompt_de: "Frau Kollegin, der Gynäkologe verlangt eine Spinalanästhesie, um Zeit zu sparen. Wie reagieren Sie juristisch und medizinisch, und welche Einleitung führen Sie durch?",
        prompt_tr: "EKG'de QRS kompleksleri sinüs dalgasına (sine-wave) dönüşüyor, ventriküler taşikardi/fibrilasyon an meselesi! Miyokardı elektrik fırtınasından KORUYAN ilk ilaç nedir?!",
        vitals: { spo2: "92%", bp: "195/118", map: "143 mmHg", hr: "115 /min", etco2: "35 mmHg", temp: "37.1 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "Kategorie-1-Notsectio in VOLLNARKOSE (RSI mit Sellick und Rocuronium/Succinylcholin)! Spinalanästhesie strikt ablehnen (Gefahr spinales Hämatom und Querschnitt)!",
        targetAction_tr: "KALSİYUM KLORÜR %10: 10 ml İ.V. (veya Kalsiyum glukonat 30 ml) 2-3 dakikada membran stabilizasyonu için İLK ADIM! Ardından GLUKOZ %20 (100 ml) + 10 IU KRİSTALİZE İNSÜLİN İ.V., Salbutamol nebül, sodyum bikarbonat!",
      },
      koCriteria: {
        forbiddenPatterns: [/spinalanästhesie durchführen/i, /pda stechen/i, /spinalanästhesie wähle/i],
        failureReason: "Spinal- und Periduralanästhesie sind bei Thrombozyten < 50.000/µl wegen des Risikos eines raumfordernden spinalen Hämatoms mit permanenter Paraplegie streng verboten!",
        failureReason_tr: "Hiperkalemik EKG değişikliklerinde Kalsiyum vermeden sadece insülin beklemek hastanın dakikalar içinde ventriküler fibrilasyonla arrest olmasına yol açar; kesin K.O. kriteridir!",
        mandatoryKeywords: ["kontraindiziert", "hämatom", "vollnarkose", "rsi", "magnesium", "linksseitenkippung"]
      }
    },
    q_dus_13: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "TRALI vs. TACO, Permeabilitätsödem vs. Volumenüberladung, Furosemid-Verbot bei TRALI",
        focus_tr: "Eklampsi, Magnezyum sülfat (4-6 g yükleme, 1-2 g/h idame), Antihipertansif tedavi (Urapidil), Anne stabilizasyonu sonrası doğum",
        trap: "Gabe von Furosemid bei TRALI (K.O.-Kriterium - hypovolämischer Schock!)",
        trap_tr: "Eklampsi nöbetinde ilk seçenek olarak Magnezyum yerine benzodiazepin veya fenitoin vermek; anne stabilize olmadan cerrahiye koşmak",
      },
      speechIntro: "Ein 62-jähriger Patient entwickelt 25 Minuten nach FFP-Transfusion akuten SpO2-Abfall auf 78%, Anstieg des Pmax auf 38 mbar, schaumiges Trachealsekret und bilaterale Infiltrate. Wie differenzieren Sie TRALI vs. TACO und wie gestalten Sie die Akuttherapie?",
      speechIntro_tr: "Doğumhanede 34. gebelik haftasında şiddetli preeklampsi tanılı bir gebe aniden jeneralize tonik-klonik nöbet geçirmeye başlıyor (Eklampsi). Tansiyon 210/120 mmHg. Anne ve bebeği kurtarmak için ilaç seçiminiz, nöbet kontrolü ve doğum stratejiniz nedir?",
      crisis: {
        title: "⚡ Respiratorische Katastrophe nach Transfusion!",
        title_tr: "⚡ Doğumhanede Eklampsi Nöbeti & Hipertansif Kriz!",
        prompt_de: "Der Weiterbildungsassistent schlägt 40 mg Furosemid i.v. vor. Der Blutdruck liegt bei 85/50 mmHg. Stimmen Sie zu oder widersprechen Sie und warum?",
        prompt_tr: "Gebe kadın kasılıyor, SpO2 %80'e düştü, fetal bradikardi (KAH 60/dk)! Eklampside nöbeti durduran ve tekrarlamasını önleyen 1. TERCİH İLAÇ nedir ve nasıl uygulanır?!",
        vitals: { spo2: "78%", bp: "85/50", map: "61 mmHg", hr: "125 /min", etco2: "48 mmHg", temp: "38.6 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Widerspruch! Furosemid ist bei TRALI kontraindiziert (Permeabilitätsödem ohne Vorlastüberhang)! Transfusionsstopp, Lungenprotektion Vt 6 ml/kg PBW, Kreislaufstützung Noradrenalin!",
        targetAction_tr: "MAGNEZYUM SÜLFAT: 4-6 g İ.V. yükleme dozu (15-20 dakikada), ardından 1-2 g/saat idame infüzyon! Kan basıncı kontrolü için Urapidil veya Dihidralazin; anne stabilize edildikten sonra ACİL SEZARYEN!",
      },
      koCriteria: {
        forbiddenPatterns: [/furosemid bei trali/i, /lasix geben/i],
        failureReason: "TRALI ist ein immunologisches Permeabilitätsödem; die Patienten sind oft hypovoläm. Diuretika führen zum schweren distributiven Kreislaufschock!",
        failureReason_tr: "Eklampsi nöbetinde Diazepam/Fenitoin ilk tercih değildir; Magnezyum sülfat verilmemesi uluslararası kılavuzlara göre kanıtlanmış malpraktistir.",
        mandatoryKeywords: ["transfusionsstopp", "permeabilität", "ards", "noradrenalin", "taco"]
      }
    },
    q_dus_14: {
      examiner: {
        name: "ÄKNO Spezialkommission Pädiatrie",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Kinderanästhesie",
        focus: "Fremdkörperaspiration, Inhalative Einleitung unter Erhalt der Spontanatmung, Relaxanzien-Verbot",
        focus_tr: "Septik şok, İlk tercih Noradrenalin (hedef MAP >= 65), İkinci hat Vazopressin (0.03 IU/dk), Hidrokortizon 200 mg/gün",
        trap: "Verabreichung von Muskelrelaxanzien bei tracheobronchialem Fremdkörper (sofortiger K.O.!)",
        trap_tr: "Septik şokta Dopamini ilk tercih yapmak veya sıvı yüklemesi bittikten sonra saatlerce vazopressör başlamamak",
      },
      speechIntro: "Ein 2-jähriges Kleinkind (12 kg) wird mit V. a. Erdnussaspiration vorgestellt. Warum ist die Narkoseeinleitung unter Erhalt der Spontanatmung der Goldstandard, welche Medikamente setzen Sie ein und welche Komplikationen drohen bei Narkoseeinleitung mit Muskelrelaxanzien?",
      speechIntro_tr: "Yoğun bakımda kolon perforasyonu sonrası fekal peritonitli septik şok tablosunda bir hasta takip ediyorsunuz. 30 ml/kg kristalloid yüklemesine rağmen MAP 48 mmHg, serum laktatı 5.4 mmol/L, oligüri mevcut. Surviving Sepsis Campaign kılavuzuna göre vazopressör ve inotrop stratejinizi anlatınız.",
      crisis: {
        title: "⚡ Erdnuss verlegt die Trachea!",
        title_tr: "⚡ Dirençli Septik Şok & Laktat Asidozu!",
        prompt_de: "Das Kind wird im Saal unruhig, der Stridor wird leiser, Thoraxexkursionen versiegen, SpO2 fällt auf 72%! Ein Kollege ruft: 'Gib schnell Rocuronium und drück mit der Maske rein!' Was tun Sie?!",
        prompt_tr: "Yüksek doz Noradrenalin (0.4 µg/kg/dk) infüzyonuna rağmen MAP hala 52 mmHg! Bir sonraki basamakta hangi ikinci hat vazopressörü ve hangi adjuvan tedaviyi eklersiniz?!",
        vitals: { spo2: "72%", bp: "70/40", map: "50 mmHg", hr: "65 /min", etco2: "62 mmHg", temp: "36.8 °C", rhythm: "Sinusbradykardie", alert: true },
        targetAction: "KEIN Relaxans! Starre Bronchoskopie unter Spontanatmung sofort einführen, Fremdkörper mit optischer Zange bergen! Masken-Überdruckbeatmung würde Erdnuss verkeilen!",
        targetAction_tr: "VAZOPRESSİN (0.03 IU/dk sabit doz) eklenmesi; refrakter şokta HİDROKORTİZON 200 mg/gün İ.V.; kardiyak disfonksiyon varsa DOBUTAMİN; hedef MAP >= 65 mmHg!",
      },
      koCriteria: {
        forbiddenPatterns: [/rocuronium geben/i, /relaxieren/i, /succinylcholin spritzen/i],
        failureReason: "Muskelrelaxanzien und Überdruckbeatmung bei liegendem Trachealfremdkörper führen zum totalen Ventilverschluss (Cannot Ventilate, Cannot Oxygenate) oder Spannungspneumothorax!",
        failureReason_tr: "Septik şokta Dopamin ilk tercih vazopressör değildir (taşiaritmi ve mortalite artışı). Sıvı cevapsız vazodilatasyonda vazopressör başlanmasını geciktirmek organ yetmezliğini derinleştirir.",
        mandatoryKeywords: ["spontanatmung", "sevofluran", "kein relaxans", "starre bronchoskopie", "atropin"]
      }
    },
    q_dus_15: {
      examiner: {
        name: "Prof. Dr. med. Andreas Hohn",
        hospital: "Kliniken der Stadt Köln / Universität zu Köln",
        focus: "ICD vs. Herzschrittmacher, Magnetwirkung, externe Defibrillationspads vor Schnitt, Kauterisation",
        focus_tr: "CICO acil durumu, DGAI ve DAS kılavuzları, Skalpel-Buji-Tüp cerrahi koniotomi tekniği, Zamanında karar verme",
        trap: "Annahme, der Magnet mache den ICD schrittmacher-asynchron (K.O.-Fehlannahme!)",
        trap_tr: "CICO tablosunda cerrahi koniotomi kararı alamayıp tekrar tekrar entübasyon denemek (hastanın boğularak ölmesi)",
      },
      speechIntro: "Ein 73-jähriger Patient mit koronarer Herzkrankheit und 2-Kammer-ICD soll sich einer laparoskopischen Rektumresektion mit Hochfrequenz-Chirurgie unterziehen. Erläutern Sie das Vorgehen: Was bewirkt ein Magnet beim ICD im Vergleich zum Schrittmacher und wie reagieren Sie bei intraoperativem Kammerflimmern?",
      speechIntro_tr: "Meslektaşım, baş-boyun cerrahisinde beklenmeyen zor havayolu senaryosu: İndüksiyon sonrası maske ventilasyonu imkansız (SpO2 %72'ye düşüyor). İki videolarengoskopi denemesi başarısız oldu, 2. kuşak Laringeal Maske (LMA) yerleştirilemiyor veya havalandırılamıyor. 'Cannot Intubate – Cannot Oxygenate' (CICO) durumundasınız. Yaşam kurtarıcı acil kararınız nedir?",
      crisis: {
        title: "⚡ Kammerflimmern unter Kauterisation!",
        title_tr: "⚡ 'Cannot Intubate – Cannot Oxygenate' (CICO) Acili!",
        prompt_de: "Der Ringmagnet liegt auf dem ICD: Plötzlich entsteht Kammerflimmern im EKG! Was tun Sie in den ersten 5 Sekunden?!",
        prompt_tr: "Hasta hipoksik bradikardiye girdi (nabız 35/dk), SpO2 %45! Üçüncü bir entübasyon denemesi yapmak isteyen asistanı durdurup saniyeler içinde ne yapmalısınız?!",
        vitals: { spo2: "65%", bp: "0/0", map: "0 mmHg", hr: "0 /min", etco2: "10 mmHg", temp: "36.2 °C", rhythm: "Kammerflimmern (VF)", alert: true },
        targetAction: "Kauter sofort stoppen! Ringmagnet sofort abziehen (ICD reaktiviert Schockfunktion) ODER unmittelbare manuelle Defibrillation mit den präoperativ geklebten Pads!",
        targetAction_tr: "CİCO DURUMU: Başka entübasyon denemesi KESİNLİKLE YAPILMAZ! Derhal acil ön boyun cerrahi havayolu: SKALPEL-BUJİ-TÜP ile CERRAHİ KONİOTOMİ (Krikotiroidotomi)!",
      },
      koCriteria: {
        forbiddenPatterns: [/magnet macht asynchron beim icd/i, /icd schlägt im voo/i],
        failureReason: "Ein Magnet schaltet beim ICD NUR die Schocktherapie ab, nicht die Schrittmacherfunktion in den asynchronen Modus! Schrittmacherabhängige ICD-Patienten müssen umprogrammiert werden.",
        failureReason_tr: "CICO durumunda zaman kaybedip ısrarla orotrakeal entübasyon denemeye devam etmek hastayı geri dönüşümsüz hipoksik beyin ölümüne götürür; en ağır K.O. kriteridir!",
        mandatoryKeywords: ["magnet", "deaktiviert schock", "klebepads", "defibrillator", "bipolar"]
      }
    },
    q_dus_16: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Chronische Niereninsuffizienz, Muskelrelaxanzien, Succinylcholin-Hyperkaliämie, Sugammadex",
        focus_tr: "Feokromositoma kriz yönetimi, Alfa blokaj ÖNCELİĞİ (Fentolamin / Urapidil), Karşılanmamış alfa uyarısı yasağı",
        trap: "Gabe von Succinylcholin bei Dialysepatienten mit Hyperkaliämie (K.O. - Herzstillstand!)",
        trap_tr: "Alfa blokajı olmadan beta bloker uygulamak (ölümcül hipertansif kriz ve intrakraniyal kanama tetikleme)",
      },
      speechIntro: "Eine 65-jährige Dialysepatientin (Stadium Vd) benötigt eine Notfall-Laparotomie bei Ileus. Kalium liegt bei 5,6 mmol/l. Wie gestalten Sie die RSI, welche Muskelrelaxanzien sind geeignet oder kontraindiziert und wie dosieren Sie Sugammadex?",
      speechIntro_tr: "Feokromositoma tanılı 45 yaşında bir hastanın adrenalektomi ameliyatındasınız. Cerrah retroperitoneal alanda tümöre dokunup manipüle ettiği anda arteriyel tansiyon 270/145 mmHg'ye fırlar ve EKG'de multifokal ventriküler ekstrasistoller başlar. Akut intraoperatif hipertansif krizi nasıl yönetirsiniz ve ameliyat öncesi hangi blokaj kuralı hayati önem taşır?",
      crisis: {
        title: "⚡ Spitze T-Wellen und Bradykardie!",
        title_tr: "⚡ Feokromositoma Manipülasyonunda Hipertansif Kriz!",
        prompt_de: "Nach Einleitung klettert das Kalium in der BGA auf 6,8 mmol/l, QRS-Komplexe verbreitern sich! Wie lautet die kardioprotektive Soforttherapie?",
        prompt_tr: "Tansiyon 280/150 mmHg, beyin kanaması riski var! Asistan hekim taşikardi ve aritmiyi kırmak için hemen İ.V. Metoprolol/Esmolol yapmak istiyor! Bu neden ölümcüldür ve doğrusu nedir?!",
        vitals: { spo2: "95%", bp: "75/40", map: "51 mmHg", hr: "48 /min", etco2: "36 mmHg", temp: "36.5 °C", rhythm: "Schenkelblockbreit", alert: true },
        targetAction: "10 ml Calciumgluconat 10% langsam i.v. zur Membranstabilisierung, Glukose 20% + Altinsulin, Hyperventilation, Natriumbikarbonat!",
        targetAction_tr: "METOPROLOL YASAKTIR! Önce mutlaka ALFA-BLOKAJ (Fentolamin 2-5 mg İ.V. veya Urapidil 25-50 mg İ.V. ya da Nitroprussid sodyum)! Beta bloker tek başına verilirse karşılanmamış alfa vazokonstriksiyonu ile fatal kriz çıkar!",
      },
      koCriteria: {
        forbiddenPatterns: [/succinylcholin geben/i, /suxamethonium bei ileus/i],
        failureReason: "Succinylcholin erhöht den Serumkaliumspiegel um 0,5-1,0 mmol/l; bei vorbestehender Hyperkaliämie führt dies zur unmittelbaren Asystolie!",
        failureReason_tr: "Feokromositomada alfa blokaj yapılmadan beta bloker verilmesi karşılanmamış masif alfa-1 vazokonstriksiyonuna, ölümcül hipertansif krize ve akut sol kalp yetmezliğine yol açar; K.O. kriteridir!",
        mandatoryKeywords: ["succinylcholin kontraindiziert", "rocuronium", "calciumgluconat", "sugammadex", "hyperkaliämie"]
      }
    },
    q_dus_17: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Schwieriger Atemweg, Adipositas per magna, CICO-Algorithmus, eFONA Skalpell-Koniotomie",
        focus_tr: "İntraoperatif STEMI, Koroner perfüzyon basıncının korunması, ASA + Heparin, Kardiyoloji konsültasyonu ve acil PCI",
        trap: "Mehr als 3 Intubationsversuche ohne Larynxmaske oder Zögern bei eFONA",
        trap_tr: "ST elevasyonunu ameliyat stresine bağlayıp görmezden gelmek; kanama korkusuyla kardiyolojiye haber vermemek",
      },
      speechIntro: "Ein 52-jähriger adipöser Patient (BMI 38 kg/m²) soll narkotisiert werden. Nach Einleitung gelingt die Maskenbeatmung nicht, Videolaryngoskopie Cormack IV, Larynxmaske scheitert: SpO2 65%. Beschreiben Sie den DGAI-Atemwegsalgorithmus und die Koniotomie.",
      speechIntro_tr: "Majör vasküler cerrahi (aorto-bifemoral bypass) sırasında genel anestezi altındaki 68 yaşında bir hastada EKG'de II, III ve aVF derivasyonlarında 4 mm ST elevasyonu ve derin hipotansiyon (RR 75/40 mmHg) gelişiyor. İntraoperatif STEMI şüphesinde anesteziyolojik ve kardiyolojik kriz algoritmanız nedir?",
      crisis: {
        title: "⚡ Cannot Intubate, Cannot Oxygenate (CICO)!",
        title_tr: "⚡ İntraoperatif Akut Koroner Sendrom (STEMI)!",
        prompt_de: "SpO2 fällt auf 54%, Herzfrequenz 35/min! Die Koniotomie muss in 20 Sekunden stehen. Welches Werkzeug nehmen Sie und wie führen Sie den Schnitt?",
        prompt_tr: "Hipotansiyon derinleşiyor, hasta kardiyojenik şoka giriyor. Koroner perfüzyon basıncını kurtarmak ve perkütan koroner girişimi (PCI) organize etmek için derhal hangi adımları atarsınız?!",
        vitals: { spo2: "54%", bp: "50/25", map: "33 mmHg", hr: "35 /min", etco2: "15 mmHg", temp: "36.7 °C", rhythm: "Bradykardie", alert: true },
        targetAction: "eFONA nach DGAI: Skalpell quer durch Lig. cricothyroideum, 90° Drehung, Bougie vorschieben, 6.0 mm Tubus über Bougie in die Trachea!",
        targetAction_tr: "%100 O2, Koroner perfüzyon için Noradrenalin ile diyastolik kan basıncını yükselt, Heparin 5000 IU İ.V. ve ASA 250-500 mg İ.V., operasyonu hızla sonlandırıp acil KARDİYAK KATETERİZASYON (Anjiyo) laboratuvarına transfer!",
      },
      koCriteria: {
        forbiddenPatterns: [/weiter mit laryngoskop versuchen/i, /auf hno-arzt warten/i],
        failureReason: "Zögern bei CICO führt binnen Minuten zum hypoxischen Hirntod. Die Koniotomie ist unverzüglich durchzuführen!",
        failureReason_tr: "İntraoperatif STEMI'de cerrahiyi durdurmayıp anjiyo ekibini çağırmamak veya hipotansiyonu tedavi etmeyip miyokard nekrozunu genişletmek kabul edilemez bir hatadır.",
        mandatoryKeywords: ["cico", "koniotomie", "skalpell", "bougie", "cricothyroid", "efona"]
      }
    },
    q_dus_18: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "Laparoskopie, CO2-Embolie, Mühlenradgeräusch, Durant-Manöver (Kopftief-Linksseitenlage)",
        focus_tr: "Postoperatif Deliryum (POD), Santral Antikolinerjik Sendrom (ZAS), Fizostigmin (1-2 mg i.v.), Organik nedenlerin dışlanması",
        trap: "Fortführen der Laparoskopie bei akuter Gasembolie",
        trap_tr: "Ajite yaşlı hastaya nedenini araştırmadan bolus Midazolam yapmak (paradoksal reaksiyon ve deliryumu derinleştirme)",
      },
      speechIntro: "Während laparoskopischer Cholezystektomie stürzt das EtCO2 plötzlich von 38 auf 11 mmHg ab. Blutdruck 60/30 mmHg, im Stethoskop Mühlenradgeräusch. Erläutern Sie Pathophysiologie, Differenzialdiagnose und Sofortmaßnahmen der venösen CO2-Gasembolie.",
      speechIntro_tr: "Ayılma odasında 78 yaşında bir hasta kalça protezi ameliyatı sonrası aniden aşırı ajite oluyor, bağırıyor, damar yollarını ve idrar sondasını çekip çıkarmaya çalışıyor. Postoperatif Deliryum (POD) ile Santral Antikolinerjik Sendrom (ZAS) ayırıcı tanısını nasıl yaparsınız ve farmakolojik tedaviniz nedir?",
      crisis: {
        title: "⚡ Kreislaufstillstand durch Gasembolie!",
        title_tr: "⚡ Ayılma Odasında Akut Ajitasyon & Deliryum / ZAS!",
        prompt_de: "Der Patient entwickelt eine pulslose elektrische Aktivität (PEA)! Was befehlen Sie dem Operateur und wie lagern Sie den Patienten sofort um?",
        prompt_tr: "Hastanın cildi kuru ve sıcak, midriyazisi var ve halüsinasyonlar görüyor. Santral Antikolinerjik Sendrom (ZAS) şüphesinde SPESİFİK ANTİDOT nedir ve nasıl titre edilir?!",
        vitals: { spo2: "62%", bp: "0/0", map: "0 mmHg", hr: "140 /min", etco2: "8 mmHg", temp: "36.6 °C", rhythm: "PEA", alert: true },
        targetAction: "Sofortige Desufflation des Abdomens! 100% O2, Durant-Manöver (Kopftieflage + Linksseitenlage zur Verlagerung der Gasblase aus dem RVOT), CPR starten!",
        targetAction_tr: "FİZOSTİGMİN (Anticholium): 1-2 mg İ.V. yavaş titrasyonla uygulanır (kolinesteraz inhibitörü, kan-beyin bariyerini geçer); Deliryumda ise organik nedenleri dışla (ağrı, hipoksi, idrar retansiyonu), Dexmedetomidin veya Haloperidol!",
      },
      koCriteria: {
        forbiddenPatterns: [/weiter operieren/i, /kopfhochlagerung/i],
        failureReason: "Kopfhochlagerung begünstigt paradoxe zerebrale Embolien; Unterlassen der Desufflation führt zum persistierenden Verschluss des Ausflusstrakts.",
        failureReason_tr: "Postoperatif ajitasyonda hipoksemi, hipotansiyon veya mesane retansiyonu gibi organik nedenleri araştırmadan hastayı körlemesine benzodiazepinle uyutmaya çalışmak deliryumu ağırlaştırır.",
        mandatoryKeywords: ["desufflation", "durant", "linksseitenlage", "100%", "gasembolie"]
      }
    },
    q_dus_19: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Intravenöse Regionalanästhesie (Bier-Block), Prilocain vs. Lidocain, Manschettensicherheit, Mindestzeit 20 min",
        focus_tr: "Venöz hava embolisi, Durant manevrası (sol yan baş aşağı), ZVK'dan hava aspirasyonu, Cerrahi alanın ıslatılması",
        trap: "Öffnen der Manschette vor Ablauf von 20 Minuten (K.O.-Kriterium - letale LAST!)",
        trap_tr: "Hava embolisinde N2O (azot protoksit) kullanmaya devam etmek (hava kabarcığını katbekat büyüterek hastayı öldürür)",
      },
      speechIntro: "Eine 44-jährige Patientin erhält für eine Radiusfraktur eine intravenöse Regionalanästhesie (Bier-Block) mit Prilocain 0,5% 40 ml. Welche Sicherheitsregeln gelten für die Doppelmanschette und warum darf die Manschette keinesfalls vor 20 Minuten geöffnet werden?",
      speechIntro_tr: "Oturur pozisyonda (sitting position) gerçekleştirilen suboksipital kraniyotomi sırasında etCO2 aniden 36'dan 14 mmHg'ye çakılıyor, prekordiyal Doppler'de tipik 'değirmen taşı sesi' (mill-wheel murmur) duyuluyor ve kan basıncı düşüyor. Venöz Hava Embolisi şüphesinde cerrahi ve anesteziyolojik kurtarma manevralarınız nelerdir?",
      crisis: {
        title: "⚡ Akuter Druckverlust der Manschette nach 12 Minuten!",
        title_tr: "⚡ Oturur Pozisyonda Masif Venöz Hava Embolisi!",
        prompt_de: "Nach 12 Minuten meldet die Manschette Druckabfall! Die Patientin äußert metallischen Geschmack, Schwindel und fängt an zu zucken! Was ist Ihre Rettungskette?",
        prompt_tr: "Hava sisteme girmeye devam ediyor, tansiyon 60/30 mmHg'ye indi! Cerraha ne talimat verirsiniz ve anestezi olarak hangi hayat kurtarıcı manevraları yaparsınız?!",
        vitals: { spo2: "88%", bp: "80/45", map: "56 mmHg", hr: "125 /min", etco2: "44 mmHg", temp: "36.8 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "Manschette sofort wieder aufpumpen! 100% O2, Midazolam zur Krampfdurchbrechung, Intralipid 20% Rescue-Kit anfordern!",
        targetAction_tr: "Cerraha: 'Yarayı hemen serumla yıka ve hava girişini kapat!', Anestezi: %100 O2 ver (N2O varsa kapat), CVP kateterinden hava aspire et, hastayı sol yan baş aşağı pozisyona al (DURANT MANEVRASI), Noradrenalin ile dolaşımı destekle!",
      },
      koCriteria: {
        forbiddenPatterns: [/manschette nach 10 min öffnen/i, /bupivacain für bier-block/i],
        failureReason: "Bupivacain ist für IVRA wegen extremer Kardiotoxizität streng verboten! Vorzeitiges Öffnen vor 20 Minuten schwemmt freies Lokalanästhetikum ungebunden in den Kreislauf.",
        failureReason_tr: "Venöz hava embolisinde cerrahı uyarmamak, N2O gazını kapatmamak veya sağ atriyumdaki havayı aspire etmemek masif sağ kalp tıkanıklığına ve arrestine yol açar.",
        mandatoryKeywords: ["prilocain", "20 minuten", "doppelmanschette", "lipid", "met-hämoglobin"]
      }
    },
    q_dus_20: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "Septischer Schock, Vasopressor-Eskalation, Vasopressin 0,03 IE/min, Hydrocortison 200 mg",
        focus_tr: "Faktör Xa inhibitörleri (Apiksaban/Rivaroksaban), Andexanet alfa, PCC (PPSB 25-50 IU/kg), Traneksamik asit",
        trap: "Gabe von Dopamin statt Noradrenalin als First-Line-Vasopressor",
        trap_tr: "DOAK kaynaklı masif kanamada etkisiz olan ve volüm yükleyen FFP'lere bel bağlamak",
      },
      speechIntro: "Ein 68-jähriger Patient im septischen Schock benötigt bereits 0,35 µg/kg/min Noradrenalin für einen MAP von 58 mmHg. Wie eskalieren Sie die Schocktherapie nach Surviving Sepsis, welche Rolle spielen Vasopressin, Hydrocortison und Inodilatatoren?",
      speechIntro_tr: "Non-valvüler atriyal fibrilasyon nedeniyle Apiksaban (Eliquis) kullanan 72 yaşında bir hasta, travmatik dalak rüptürü nedeniyle acil laparotomiye alınıyor. İntraoperatif kontrol edilemeyen yaygın mikrovasküler kanama mevcut. Faktör Xa inhibitörünün etkisini nasıl geri çevirirsiniz?",
      crisis: {
        title: "⚡ Refraktärer Vasoplegie-Schock!",
        title_tr: "⚡ Faktör Xa İnhibitörü (DOAK) Altında Masif Kanama!",
        prompt_de: "Trotz 0,5 µg/kg/min Noradrenalin fällt der MAP auf 50 mmHg ab, Laktat steigt auf 6,5 mmol/l. Was hängen Sie jetzt sofort als zweiten Vasopressor an?",
        prompt_tr: "Apiksaban son dozu 4 saat önce alınmış, cerrahi alan göle dönüyor! Spesifik antidot veya faktör konsantresi stratejiniz nedir?!",
        vitals: { spo2: "90%", bp: "70/40", map: "50 mmHg", hr: "135 /min", etco2: "32 mmHg", temp: "38.8 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "Vasopressin (Argipressin) mit fixer Rate von 0.03 IE/min starten + Hydrocortison 200 mg/Tag i.v. bei refraktärem Schock!",
        targetAction_tr: "Varsa spesifik antidot ANDEXANET ALFA; temin edilemiyorsa derhal PROTROMBİN KOMPLEKS KONSANTRESİ (PCC / PPSB): 25-50 IU/kg İ.V.; eş zamanlı TRANEXAMİK ASİT 1 g İ.V.!",
      },
      koCriteria: {
        forbiddenPatterns: [/dopamin als 1/i, /vasopressin hochtitrieren/i],
        failureReason: "Dopamin erhöht Tachyarrhythmien und Mortalität. Vasopressin darf nicht über 0,03-0,04 IE/min titriert werden (Gefahr mesenterialer Ischämie).",
        failureReason_tr: "DOAK kanamasında faktör konsantresi veya antidot vermeyip saatlerce FFP beklemek hastanın kan kaybından kaybedilmesine neden olur.",
        mandatoryKeywords: ["noradrenalin", "vasopressin", "0,03", "hydrocortison", "laktat", "map >= 65"]
      }
    },
    q_dus_21: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Schädel-Hirn-Trauma, Hirndrucktherapie, NaCl 3% vs. Mannitol, Normokapnie PaCO2 35-38",
        focus_tr: "Tüp kafı rüptürü, Ventilasyon kaybı, Havayolu değişim kateteri (AEC) ile tüp değişimi, Güvenli re-entübasyon",
        trap: "Aggressive prophylaktische Hyperventilation (PaCO2 < 30 mmHg - K.O. Hirnischämie!)",
        trap_tr: "Tüpü kılavuzsuz çıkarıp ödemli havayolunda entübasyonu tamamen kaybetmek",
      },
      speechIntro: "Ein 24-jähriger Motorradfahrer mit schwerem SHT liegt intubiert im OP: ICP steigt auf 28 mmHg, MAP 75 mmHg. Erläutern Sie das Stufenschema zur Senkung des intrakraniellen Drucks und warum prophylaktische tiefe Hyperventilation schädlich ist.",
      speechIntro_tr: "Yoğun bakımda mekanik ventilatörde izlenen bir hastada aniden solunum devresi basınç alarmı veriyor, tepe basınç 8 cmH2O'ya düşüyor, ekspiratuar tidal hacim sıfırlanıyor ve ağızdan belirgin gurultu sesi geliyor. Trakeal tüp kafı rüptürü veya yer değiştirmesini nasıl teşhis ve tedavi edersiniz?",
      crisis: {
        title: "⚡ Einklemmungsdruck ICP 35 mmHg!",
        title_tr: "⚡ Akut Kaf Rüptürü / Trakeal Kaçak Acili!",
        prompt_de: "Der ICP springt auf 35 mmHg, Pupillen werden träge. Der Kollege will den Beatmer auf PaCO2 25 mmHg drehen. Stimmen Sie zu und was verabreichen Sie?",
        prompt_tr: "SpO2 %82'ye düştü, hasta havalandırılamıyor, kaf havası tutmuyor! Hastayı hipoksiden korumak için tüp değişim algoritmanız nedir?!",
        vitals: { spo2: "98%", bp: "140/85", map: "103 mmHg", hr: "52 /min", etco2: "36 mmHg", temp: "37.0 °C", rhythm: "Cushing-Bradykardie", alert: true },
        targetAction: "Widerspruch gegen tiefe Hyperventilation (zerebrale Vasokonstriktion induziert Ischämie)! NaCl 3% Bolus 2 ml/kg oder Mannitol 20% 0.5-1 g/kg, Oberkörper 30° hoch, Sedierung vertiefen!",
        targetAction_tr: "%100 O2 ile maske solutmasına geç, havayolu kılavuz kateteri (Cook Airway Exchange Catheter) üzerinden güvenli tüp değişimi yap veya doğrudan videolarengoskopi ile re-entübe et!",
      },
      koCriteria: {
        forbiddenPatterns: [/paco2 unter 30/i, /dauerhafte hyperventilation/i],
        failureReason: "Dauerhafte Hyperventilation (PaCO2 < 30 mmHg) führt über exzessive Vasokonstriktion zur ischämischen Hirngewebsnekrose!",
        failureReason_tr: "Zor havayolu olabilecek yoğun bakım hastasında kılavuz kateter kullanmadan tüpü körlemesine çekip çıkarmak havayolunun tamamen kaybedilmesine yol açar.",
        mandatoryKeywords: ["osmose", "nacl 3%", "mannitol", "normokapnie", "oberkörper 30°", "icp"]
      }
    },
    q_dus_22: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Postpartale Blutung (PPH), Uterusatonie, Sulproston-Perfusor, Fibrinogen, Tranexamsäure",
        focus_tr: "Opioid intoksikasyonu, Nalokson fraksiyone titrasyonu (0.04-0.08 mg i.v.), Akut akciğer ödemi riskinin önlenmesi",
        trap: "Sulproston als unverdünnter schneller Bolus (K.O.-Kriterium - Koronarspasmen und Herzstillstand!)",
        trap_tr: "Naloksonu kontrolsüz yüksek dozda (0.4 mg bolus) puşe etmek (ölümcül sempatik kriz ve flaş akciğer ödemi)",
      },
      speechIntro: "Nach unkomplizierter Spontangeburt kommt es zur massiven vaginalen Blutung (> 1500 ml). Der Uterus ist weich und atonisch. Wie lautet Ihr medikamentöser Stufenplan (Oxytocin, Sulproston), welche Koagulopathie-Therapie leiten Sie ein und wie wird Sulproston appliziert?",
      speechIntro_tr: "Ayılma odasında majör batın ameliyatı sonrası hasta başında alarm çalıyor: Solunum sayısı 4/dk, pupil izokorik ve noktasal (miyotik), hasta derin somnole ve uyandırılamıyor, SpO2 %80. Akut opioid aşırı dozunda basamaklı antidot tedaviniz nedir?",
      crisis: {
        title: "⚡ Hämorrhagischer Schock im Kreißsaal!",
        title_tr: "⚡ Ayılma Odasında Akut Opioid İntoksikasyonu!",
        prompt_de: "Die Hebamme reicht eine Nalador-Ampulle (Sulproston 500 µg) und fragt: 'Soll ich das schnell als Bolus in die Viggo spritzen?' Was antworten Sie und wie wird es richtig gegeben?",
        prompt_tr: "Hasta bradipneik ve apneye girmek üzere! Nalokson ampulünü (0.4 mg) hızla İ.V. puşe etmek isteyen hemşireyi durdurup nasıl bir dozlama yaparsınız?!",
        vitals: { spo2: "91%", bp: "70/35", map: "46 mmHg", hr: "142 /min", etco2: "26 mmHg", temp: "35.5 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "STOPP! Niemals als Bolus! Sulproston darf NUR langsam über Perfusor infundiert werden (Gefahr letaler Koronarspasmen)! Tranexamsäure 1g i.v. + Fibrinogen sofort!",
        targetAction_tr: "NALOKSON TİTRASYONU: 0.4 mg Nalokson 10 ml SF ile sulandırılır (0.04 mg/ml); her 2-3 dakikada 0.04-0.08 mg İ.V. titre edilir! Hedef: Ağrıyı patlatmadan ve pulmoner ödem yapmadan solunumu düzeltmek!",
      },
      koCriteria: {
        forbiddenPatterns: [/sulproston als bolus/i, /nalador schnell spritzen/i],
        failureReason: "Sulproston als schneller Bolus führt zu fatalen Koronarspasmen, Myokardinfarkt und Kreislaufkollaps!",
        failureReason_tr: "Naloksonun 0.4 mg tek seferde hızlı bolus yapılması masif sempatik deşarja, şiddetli ağrı krizine, hipertansif krize ve akut fulminan nörojenik/kardiyojenik akciğer ödemine yol açar.",
        mandatoryKeywords: ["oxytocin", "sulproston perfusor", "tranexamsäure", "fibrinogen", "b-lynch"]
      }
    },
    q_dus_23: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "Pneumonektomie, Rechtsherzüberlastung, restriktives Flüssigkeitsregime, PEEP niedrig",
        focus_tr: "Karotis cerrahisi sonrası hipertansiyon, Urapidil (12.5-25 mg), Esmolol, Boyun hematomu ve hiperperfüzyon riskinin önlenmesi",
        trap: "Großzügige Volumengabe (K.O. - postpneumonektomisches Lungenödem mit hoher Mortalität!)",
        trap_tr: "Hipertansiyonu görmezden gelip hastayı servise göndermek (boyun hematomuyla dakikalar içinde asfiksi riski)",
      },
      speechIntro: "Bei einer 62-jährigen Patientin wird eine Pneumonektomie links durchgeführt. Warum ist das Flüssigkeitsregime bei Pneumonektomie streng restriktiv zu halten und wie verhindern Sie eine postoperative Rechtsherzdekompensation?",
      speechIntro_tr: "Karotis endarterektomisi ameliyatının sonunda ekstübasyon aşamasında hastanın tansiyonu aniden 235/130 mmHg'ye fırlar, boyundaki ameliyat dikişleri gerilmeye başlar. Boyun hematomunu ve intrakraniyal kanamayı önlemek için acil antihipertansif müdahaleniz nedir?",
      crisis: {
        title: "⚡ Akutes Rechtsherzversagen nach Gefäßligatur!",
        title_tr: "⚡ Karotis Cerrahisi Sonrası Akut Hipertansif Kriz!",
        prompt_de: "Nach Abklemmen der Pulmonalarterie steigt der ZVD steil auf 18 mmHg, MAP fällt auf 50 mmHg ab. Was unternehmen Sie?",
        prompt_tr: "Tansiyon 240/135 mmHg, boyunda gerginlik artıyor! Dakikalar içinde tansiyonu güvenli sınırlara (sistolik < 140 mmHg) çekmek için hangi intravenöz ajanı seçersiniz?!",
        vitals: { spo2: "89%", bp: "75/45", map: "55 mmHg", hr: "115 /min", etco2: "30 mmHg", temp: "36.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Flüssigkeit sofort drosseln! Noradrenalin zur MAP-Sicherung, Dobutamin oder Milrinon zur Inotropie, PEEP niedrig halten (< 5-7 cmH2O)!",
        targetAction_tr: "URAPİDİL: 12.5-25 mg İ.V. bolus titrasyonu (alfa-1 blokajı ve santral serotonin etkisi) veya ESMOLOL (kısa etkili beta-1 bloker); gerekirse Clonidin veya Nitrogliserin infüzyonu!",
      },
      koCriteria: {
        forbiddenPatterns: [/volumenbolus geben/i, /großzügig kristalloide/i],
        failureReason: "Übermäßige Volumengabe führt bei reduzierter vaskulärer Lungenstrombahn zum tödlichen postpneumonektomischen Lungenödem!",
        failureReason_tr: "Karotis cerrahisi sonrası hipertansiyona müdahale edilmemesi boyunda boğucu kanama hematomuna ve serebral hiperperfüzyon sendromuna yol açar.",
        mandatoryKeywords: ["restriktiv", "lungenödem", "rechtsherz", "noradrenalin", "peep niedrig"]
      }
    },
    q_dus_24: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Pädiatrische Nachblutung (Adenotomie/Tonsillotomie), 'Magen voller Blut', RSI mit gecufftem Tubus",
        focus_tr: "Akut aspirasyon acili, Trendelenburg pozisyonu, Hızlı kaf blokajı, Kaf sonrası endotrakeal aspirasyon, Lavaj YASAĞI",
        trap: "Narkoseeinleitung in Rückenlage ohne Vorbereitung auf massive Blutaspiration",
        trap_tr: "Mide içeriği varken maskeyle pozitif basınçlı solutma yapmak; bronşları sodyum bikarbonatla yıkamaya kalkmak",
      },
      speechIntro: "Ein 3-jähriges Kind (14 kg) wird 4 Stunden nach Adenotomie mit Bluterbrechen und Schockzeichen vorgestellt. Schildern Sie das sekundengenaue Vorgehen: Vorbereitung, Lagerung, Einleitung und warum dieser Fall zu den gefährlichsten Kindernarkosen zählt.",
      speechIntro_tr: "Acil ileus ameliyatı için genel anestezi indüksiyonu yapıyorsunuz. Hızlı seri indüksiyon (RSI) sırasında hasta aniden kusuyor ve kahve telvesi kıvamında mide içeriği ağız ve farenkse doluyor. Akut aspirasyonda saniye saniye hayat kurtarıcı manevralarınız nelerdir?",
      crisis: {
        title: "⚡ Massives Bluterbrechen bei Einleitung!",
        title_tr: "⚡ İndüksiyonda Masif Mide İçeriği Aspirasyonu!",
        prompt_de: "Beim Vorhalten der Maske erbricht das Kind schwallartig 200 ml Kaffeesatz- und Frischblut! Das Absaugglas ist voll. Wie sichern Sie sofort den Atemweg?",
        prompt_tr: "Mide içeriği trakeaya doğru akıyor, SpO2 hızla düşüyor! İlk 15 saniyede pozisyon ve aspirasyon yönetimini nasıl yaparsınız?!",
        vitals: { spo2: "75%", bp: "65/35", map: "45 mmHg", hr: "155 /min", etco2: "32 mmHg", temp: "36.1 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "Sofort Kopf tief und Linksseitenlage! Zwei funktionierende Absauger parallel, RSI mit gecufftem Tubus unter Sicht (Videolaryngoskop), Magensonde vor Extubation!",
        targetAction_tr: "DERHAL BAŞ AŞAĞI (Trendelenburg) pozisyonu ver, orofarenksi kalın uçlu sert aspiratörle (Yankauer) aspire et, HIZLA ENTÜBE ET ve KAFI HEMEN ŞİŞİR, kaf şişirildikten SONRA trakeayı aspire et (Asla önce bronşları yıkama/lavaj yapma)!",
      },
      koCriteria: {
        forbiddenPatterns: [/ungecufften tubus wählen/i, /ohne absauger einleiten/i],
        failureReason: "Aspiration von Koageln führt zur letalen Asphyxie. Ein gecuffter Tubus und doppelte Absaugbereitschaft sind zwingend!",
        failureReason_tr: "Aspirasyon sırasında kafı şişirmeden önce pozitif basınçlı maske solutması yapmak mide içeriğini akciğerin derinliklerine basar ve ölümcül aspirasyon pnömonisine yol açar.",
        mandatoryKeywords: ["voller magen", "blut", "rsi", "gecufft", "absauger", "magensonde"]
      }
    },
    q_dus_25: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Schrittmacher, Magnetwirkung, monopolare Elektrokauterisation, Strompfad-Sicherheit",
        focus_tr: "Rüptüre BAA, Permissif hipotansiyon (sistolik 80-90 mmHg), Tamponadın korunması, Klemplemeye kadar kısıtlı sıvı",
        trap: "Neutralelektrode so anbringen, dass Strompfad über das Aggregat fließt",
        trap_tr: "Aort klempi konulmadan önce tansiyonu agresif sıvılarla 120-130 mmHg'ye zorlamak (tamponadı yırtıp hastayı kanatmak)",
      },
      speechIntro: "Ein 72-jähriger schrittmacherabhängiger Patient wird zur TUR-Blase mit monopolarer Kauterisation vorgestellt. Wie verhält sich der Schrittmacher bei Magnetauflage, wo platzieren Sie die Neutralelektrode und wie schützen Sie den Patienten vor Asystolie?",
      speechIntro_tr: "Şok odasına 74 yaşında bilinci kapalı, soluk, filiform nabızlı bir hasta getiriliyor: Şüpheli rüptüre abdominal aort anevrizması (rBAA), tansiyon 65/35 mmHg, nabız 125/dk. Cerrahi klemplemeye kadar olan resüsitasyon ve anestezi prensipleriniz nelerdir?",
      crisis: {
        title: "⚡ Kauter-Inhibition führt zur Asystolie!",
        title_tr: "⚡ Rüptüre Abdominal Aort Anevrizması (rBAA) & Şok!",
        prompt_de: "Der Operateur aktiviert den Kauter: Der Monitor zeigt Asystolie durch elektromagnetische Interferenz! Was ist der unmittelbare Handgriff?",
        prompt_tr: "Tansiyon 65 mmHg. Asistan hekim hızla 3 litre kristaloid ve kolloid vererek tansiyonu 130 mmHg'ye çıkarmak istiyor! Pozisyonunuz nedir?!",
        vitals: { spo2: "94%", bp: "0/0", map: "0 mmHg", hr: "0 /min", etco2: "14 mmHg", temp: "36.5 °C", rhythm: "Asystolie", alert: true },
        targetAction: "Kauter sofort stoppen! Ringmagnet auflegen (Schrittmacher schaltet in asynchronen Starrfrequenzmodus VOO/DOO mit 85-100/min)!",
        targetAction_tr: "KESİNLİKLE İZİN VERİLMEZ! PERMİSSİF HİPOTANSİYON (Hedef sistolik tansiyon 80-90 mmHg / MAP 50-60 mmHg)! Aort klemplenene kadar pıhtıyı patlatacak sıvı yüklemesinden kaçın, masif transfüzyon hazırlığı yap!",
      },
      koCriteria: {
        forbiddenPatterns: [/neutralelektrode am thorax anbringen/i],
        failureReason: "Ein Strompfad über das Aggregat kann den Schrittmacher zerstören oder Myokardverbrennungen an der Sondenspitze verursachen.",
        failureReason_tr: "Aort klemplenmeden önce agresif sıvı tedavisiyle tansiyonun yükseltilmesi retroperitoneal tamponadı patlatır ve kontrolsüz ölümcül kanamaya yol açar.",
        mandatoryKeywords: ["magnet", "asynchron", "voo", "doo", "neutralelektrode", "bipolar"]
      }
    },
    q_dus_26: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Direkte orale Antikoagulanzien (DOAK), Apixaban (Eliquis), Karenzzeiten nach DGAI/ÖGARI",
        focus_tr: "DGAI kılavuzu DOAK bekleme süreleri, Rivaroksaban (48-72 saat), Spinal hematom riski, Güvenli genel anestezi tercihi",
        trap: "Durchführung einer Spinalanästhesie unter Apixaban vor Ablauf von mind. 48-72h",
        trap_tr: "Cerrahın ısrarına boyun eğip DOAK etkisinde spinal/epidural anestezi uygulamak (kalıcı felç ve malpraktis)",
      },
      speechIntro: "Eine 78-jährige Patientin unter therapeutischer Antikoagulation mit Apixaban (5 mg 1-0-1) soll wegen einer Schenkelhalsfraktur versorgt werden. Letzte Einnahme vor 18 Stunden. GFR 45 ml/min. Welche Optionen haben Sie bezüglich Anästhesieverfahren und Karenzzeiten?",
      speechIntro_tr: "70 yaşında kadın hasta, kalça kırığı nedeniyle ameliyata alınacak. Hasta atriyal fibrilasyon nedeniyle Rivaroksaban (Xarelto 20 mg) kullanıyor ve son dozunu 18 saat önce almış; GFR 42 ml/dk. Cerrah 'Spinal anestezi yapalım, ameliyathane hazır' diyor. Ne yanıt verirsiniz ve kararınızı nasıl gerekçelendirirsiniz?",
      crisis: {
        title: "⚡ Operateur drängt auf vorzeitige Spinalpunktion!",
        title_tr: "⚡ Terapötik DOAK Altında Spinal Anestezi Talebi!",
        prompt_de: "Der Chirurg sagt: 'Ich brauche eine Spinalanästhesie in 30 Minuten, der Saal ist frei!' Wie begründen Sie Ihre Entscheidung rechtlich und leitliniengerecht?",
        prompt_tr: "Cerrah: 'Sadece ince iğneyle tek seferde gireriz, bir şey olmaz!' diyor. Spinal anesteziyi kabul eder misiniz, DGAI kılavuz süresi nedir?!",
        vitals: { spo2: "96%", bp: "145/85", map: "105 mmHg", hr: "78 /min", etco2: "36 mmHg", temp: "36.6 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "Spinalanästhesie strikt verweigern! Nach DGAI-Leitlinie sind bei GFR < 50 ml/min mindestens 72h Pause nötig. Operation in Vollnarkose durchführen!",
        targetAction_tr: "SPİNAL ANESTEZİYİ KESİNLİKLE REDDET! Böbrek yetmezliği olan hastada Rivaroksaban için bekleme süresi EN AZ 72 SAATTİR (Normal GFR'de en az 48 saat)! Alternatif: Genel anestezi veya periferik sinir blokları!",
      },
      koCriteria: {
        forbiddenPatterns: [/spinalanästhesie nach 18h stechen/i, /pda anlegen/i],
        failureReason: "Eine rückenmarksnahe Punktion unter therapeutischem DOAK führt zum spinalen Epiduralhämatom mit irreversibler Querschnittslähmung!",
        failureReason_tr: "Terapötik DOAK etkisi altındaki hastaya nöroaksiyel blok yapılması spinal/epidural hematoma ve kalıcı paraplejiye yol açar; sınavdan anında kalma nedenidir.",
        mandatoryKeywords: ["48 stunden", "72 stunden", "apixaban", "dgai", "spinalhämatom", "vollnarkose"]
      }
    },
    q_dus_27: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Phäochromozytom Ligatur-Hypotonie, Vasoplegie, Noradrenalin, Volumensubstitution",
        focus_tr: "Feokromositomada ligasyon sonrası şok, Reseptör down-regülasyonu, Noradrenalin ve Vazopressin, Agresif volüm replasmanı",
        trap: "Unterlassen der Noradrenalin-Bereitstellung vor Ligatur der Vena centralis",
        trap_tr: "Ligasyon sonrası gelişen derin hipotansiyonu öngöremeyip vazopressör hazırlığı yapmamış olmak",
      },
      speechIntro: "Bei einer laparoskopischen Adrenalektomie wegen Phäochromozytom wird die Vena centralis glandulae suprarenalis abgeklemmt. Warum kommt es genau in dieser Sekunde zum extremen Blutdruckabfall und wie steuern Sie den Übergang therapeutisch?",
      speechIntro_tr: "Feokromositoma rezeksiyonu ameliyatındayız. Cerrah ana adrenal tümör venini klempleyip bağladığı anda arteriyel tansiyon 10 saniye içinde 170/95 mmHg'den 45/20 mmHg'ye çakılıyor. Bu hemodinamik çöküşün patofizyolojisi nedir ve acil müdahaleniz nasıldır?",
      crisis: {
        title: "⚡ Kreislaufsturz nach Ligatur der Tumorvene!",
        title_tr: "⚡ Tümör Veni Bağlandıktan Sonra Dolaşım Çöküşü!",
        prompt_de: "Der Clip sitzt auf der Nebennierenvene: Binnen 10 Sekunden stürzt der Blutdruck von 160/90 auf 45/25 mmHg ab! Welche beiden Maßnahmen ergreifen Sie sofort?",
        prompt_tr: "Tansiyon 45/20 mmHg, nabız 120/dk zayıf, etCO2 18'e düştü! Masif katekolamin kesilmesine karşı acil farmakolojik ve volüm stratejiniz nedir?!",
        vitals: { spo2: "92%", bp: "45/25", map: "31 mmHg", hr: "110 /min", etco2: "22 mmHg", temp: "36.4 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Sofort Noradrenalin-Perfusor hochdosiert starten (ggf. Vasopressin) + rasche Druckinfusion von Kristalloiden zum Ausgleich der relativen Hypovolämie!",
        targetAction_tr: "YÜKSEK DOZ NORADRENALİN İNFÜZYONU başlat (gerekirse VAZOPRESSİN ekle), hızlı dengeli kristalloid basınçlı infüzyonu, anestezi derinliğini hafiflet!",
      },
      koCriteria: {
        forbiddenPatterns: [/weiter vasodilatatoren geben/i],
        failureReason: "Nach Venenligatur entfällt der endogene Katecholaminstrom schlagartig; bei herabregulierten Alpha-Rezeptoren droht der letale Schock ohne Vasopressoren.",
        failureReason_tr: "Tümör veni bağlandığında endojen katekolamin deşarjı aniden sıfırlanır ve aşağı regüle olmuş reseptörler nedeniyle derin vazopleji gelişir; agresif vazopressör ve sıvı verilmezse arrest kaçınılmazdır.",
        mandatoryKeywords: ["ligatur", "noradrenalin", "volumen", "downregulation", "vasopressin"]
      }
    },
    q_dus_28: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "TUR-Syndrom, Hypotone Hyperhydratation, Hyponatriämie, ODS-Prävention (max. 8 mmol/l/d)",
        focus_tr: "TURP Sendromu (hipoosmolar hiponatremi), Ameliyatı derhal sonlandırma, Hipertonik NaCl %3, Osmotik demiyelinizasyon riski",
        trap: "Zu rasche Natriumkorrektur mit Gefahr der pontinen Myelinolyse (ODS)",
        trap_tr: "Hiponatremiyi çok hızlı düzeltmek (> 8-10 mmol/L/24h) ve pontin miyelinozise yol açmak; cerrahiyi devam ettirmek",
      },
      speechIntro: "Ein 71-jähriger Patient wird während einer transurethralen Prostataresektion (TURP) unter Spinalanästhesie plötzlich unruhig, verwirrt, klagt über Engegefühl und wird bradykard. Serum-Natrium liegt bei 112 mmol/l. Beschreiben Sie Diagnose, Pathophysiologie und das strikte Korrekturregime.",
      speechIntro_tr: "Transüretral prostat rezeksiyonu (TUR-P) ameliyatının 50. dakikasında spinal anestezi altındaki 73 yaşında erkek hasta huzursuzlaşıyor, baş ağrısı ve görme bulanıklığından yakınıyor; ardından ameliyat masasında jeneralize konvülsiyon başlıyor. Acil kan gazında Na+ 110 mmol/L geliyor. Tanınız ve adım adım tedaviniz nedir?",
      crisis: {
        title: "⚡ Krampfanfall bei schwerem TURP-Syndrom!",
        title_tr: "⚡ Ağır TURP Sendromu ve Hiponatremi Nöbeti!",
        prompt_de: "Der Patient krampft generalisiert auf dem OP-Tisch, Na+ 110 mmol/l! Der Urologe will noch 15 Minuten weiterschneiden. Was befehlen Sie und wie korrigieren Sie das Natrium?",
        prompt_tr: "Hasta masada kasılıyor, Na+ 110 mmol/L! Cerrah '10 dakikalık işim kaldı, bitireyim' diyor. Cerraha ve hastaya ilk müdahaleniz nedir?!",
        vitals: { spo2: "86%", bp: "185/110", map: "135 mmHg", hr: "42 /min", etco2: "45 mmHg", temp: "35.8 °C", rhythm: "Bradykardie", alert: true },
        targetAction: "Resektion SOFORT abbrechen! Krampfdurchbrechung, NaCl 3% als Kurzinfusion zur Symptomkontrolle, Natriumkorrektur strikt auf maximal 8-10 mmol/l pro 24h limitieren (ODS-Schutz)!",
        targetAction_tr: "REZESİYONU DERHAL DURDUR! Nöbeti Midazolam ile durdur, entübe et ve %100 O2 ver, HİPERTONİK NaCl %3 kısa infüzyon (100 ml 10-15 dk), Na düzeltme hızı ilk 24 saatte en fazla 8-10 mmol/L olmalıdır!",
      },
      koCriteria: {
        forbiddenPatterns: [/natrium um 20 mmol schnell heben/i, /weiter operieren/i],
        failureReason: "Eine zu schnelle Natriumkorrektur (> 8-10 mmol/l in 24h) führt zur irreversiblen osmotischen Demyelinisierung (pontine Myelinolyse) mit Locked-in-Syndrom!",
        failureReason_tr: "TURP sendromunda cerrahiyi hemen durdurmamak veya hiponatremiyi 24 saatte > 8-10 mmol/L'den daha hızlı düzeltmek ölümcül Osmotik Demiyelinizasyon Sendromuna (Santral Pontin Miyelinozis) yol açar.",
        mandatoryKeywords: ["tur-syndrom", "hyponatriämie", "nacl 3%", "ods", "myelinolyse", "abbruch"]
      }
    },
    q_dus_29: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Hypertrophe Pylorusstenose, hypochlorämische hypokaliämische metabolische Alkalose, keine Notfall-OP!",
        focus_tr: "Pilor stenozu, Hipokloremik hipokalemik metabolik alkaloz, Cerrahi acil olmadığı gerçeği, Elektrolit dengelenmesi önceliği",
        trap: "Einleitung zur Operation vor vollständigem Elektrolyt- und Säure-Basen-Ausgleich (K.O.!)",
        trap_tr: "Cerrahın baskısıyla elektrolitleri ve alkalozu düzeltmeden ameliyata girmek (postoperatif ölümcül apne)",
      },
      speechIntro: "Ein 5 Wochen alter Säugling (4,0 kg) mit Pylorusstenose erbricht seit Tagen schwallartig. BGA: pH 7,56, Chlorid 78 mmol/l, Kalium 2,9 mmol/l. Der Chirurg möchte das Kind sofort im Notprogramm operieren. Wie positionieren Sie sich und wie sieht die präoperative Vorbereitung aus?",
      speechIntro_tr: "3 haftalık bir bebek (3.2 kg) fışkırır tarzda kusma sonrası hipertrofik pilor stenozu ön tanısıyla çocuk cerrahisi tarafından acil ameliyata verilmek isteniyor. Kan gazı: pH 7.56, Na 130, K 2.8 mmol/L, Cl 82 mmol/L, HCO3 34 mmol/L. Çocuk cerrahı 'Çocuk aç, hemen uyutun keselim' diyor. Anestezi yaklaşımınız nedir?",
      crisis: {
        title: "⚡ Chirurg drängt auf sofortige Narkose!",
        title_tr: "⚡ Pilor Stenozunda Cerrahın Acil Ameliyat Baskısı!",
        prompt_de: "Der Chirurg sagt: 'Das Kind verhungert, wir müssen jetzt schneiden!' Welches Narkoserisiko besteht bei unkorrigierter hypochlorämischer Alkalose und wie setzen Sie sich durch?",
        prompt_tr: "Çocuk cerrahı: 'Bu çocuk açlıktan ölecek, hemen masaya almalıyız!' diyor. Ameliyatı kabul eder misiniz, anestezi açısından risk nedir?!",
        vitals: { spo2: "98%", bp: "70/40", map: "50 mmHg", hr: "155 /min", etco2: "48 mmHg", temp: "36.8 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "OP strikt ablehnen! Pylorusstenose ist NIEMALS eine chirurgische Notfallindikation, sondern ein internistischer Ausgleichsnotfall! Voller Magen mit Magensonde absaugen, NaCl 0.9% + KCl bis Chlorid > 100 mmol/l!",
        targetAction_tr: "AMELİYATI KESİNLİKLE REDDET! Pilor stenozu cerrahi bir acil DEĞİL, tıbbi/metabolik bir acildir! Önce hipokloremik hipokalemik metabolik alkaloz ve dehidratasyon SF + KCl infüzyonuyla tamamen düzeltilmelidir!",
      },
      koCriteria: {
        forbiddenPatterns: [/sofort einleiten/i, /im saal ausgleichen während op/i],
        failureReason: "Narkoseeinleitung bei unkorrigierter metabolischer Alkalose führt zu lebensbedrohlichen postoperativen Atemstillständen und Herzrhythmusstörungen!",
        failureReason_tr: "Metabolik alkalozu düzeltilmemiş pilor stenozlu bebeği uyutmak postoperatif ağır solunum depresyonuna, santral apneye ve ölümcül aritmilere yol açar; K.O. kriteridir.",
        mandatoryKeywords: ["kein notfall", "chlorid > 100", "alkalose", "magensonde", "rsi", "ausgleich"]
      }
    },
    q_dus_30: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Myasthenia gravis, veränderte Relaxanzienempfindlichkeit, TIVA, Sugammadex vs. Neostigmin",
        focus_tr: "Miyastenia Gravis, Kolinerjik kriz vs Miyastenik kriz, Atropin tedavisi, Sugammadeks üstünlüğü",
        trap: "Gabe von Standarddosen nicht-depolarisierender Relaxanzien ohne Monitoring (K.O. - Lähmung!)",
        trap_tr: "Kolinerjik kriz belirtilerini (tükürük, miyozis, kramplar) atlayıp hastaya fazladan Neostigmin yapmak",
      },
      speechIntro: "Eine 32-jährige Patientin mit Myasthenia gravis soll sich einer Thymektomie unterziehen. Erläutern Sie die Besonderheiten bezüglich depolarisierender und nicht-depolarisierender Muskelrelaxanzien und warum Sugammadex die Narkoseführung revolutioniert hat.",
      speechIntro_tr: "Miyastenia Gravis tanılı 32 yaşında bir kadın hastada timektomi ameliyatı sonunda kas gevşetici bloğunu geri çevirmek için Neostigmin (2.5 mg) + Atropin uygulanıyor. 10 dakika sonra hastada aşırı tükürük salgısı, bronkospazm, bradikardi, karın krampları ve ilerleyici kas güçsüzlüğü gelişiyor. Bu tablo nedir ve nasıl müdahale edersiniz?",
      crisis: {
        title: "⚡ Postoperative Atemlähmung nach Neostigmin!",
        title_tr: "⚡ Miyastenide Neostigmin Sonrası Kolinerjik Kriz!",
        prompt_de: "Nach Gabe von Neostigmin zur Reversierung klagt die Patientin über Speichelfluss, Bauchkrämpfe und zunehmende Muskelschwäche (TOF 40%). Liegt eine myasthene oder cholinerge Krise vor und wie handeln Sie?",
        prompt_tr: "Hasta sekresyon içinde boğuluyor, kas gücü sıfırlandı, bradikardi (40/dk)! Miyastenik kriz mi Kolinerjik kriz mi ve tedavisi nedir?!",
        vitals: { spo2: "87%", bp: "105/60", map: "75 mmHg", hr: "48 /min", etco2: "52 mmHg", temp: "36.7 °C", rhythm: "Bradykardie", alert: true },
        targetAction: "Cholinerge Krise durch Neostigmin-Überdosierung! Re-Intubation/Beatmung sichern, Atropin i.v.; Sugammadex wäre das risikofreie Antidot der 1. Wahl bei Rocuronium gewesen!",
        targetAction_tr: "KOLİNERJİK KRİZ (Aşırı asetilkolin uyarısı)! Havayolunu güvenceye al, derhal ATROPİN 1-2 mg İ.V. uygula (muskarinik etkileri bloke et); Roküronyum bloğu için Neostigmin yerine SUGAMMADEKS tercih edilmelidir!",
      },
      koCriteria: {
        forbiddenPatterns: [/normale dosis relaxans geben/i],
        failureReason: "Myasthenie-Patienten reagieren hochgradig überempfindlich auf nicht-depolarisierende Relaxanzien; Überdosierung führt zur tagelangen Nachbeatmung.",
        failureReason_tr: "Kolinerjik krizi miyastenik kriz sanıp daha fazla asetilkolinesteraz inhibitörü (Neostigmin) vermek hastayı depolarizan blokla solunum arrestine sokar.",
        mandatoryKeywords: ["myasthenie", "sugammadex", "tiva", "relaxometrie", "reduzierte dosis"]
      }
    },
    q_dus_31: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Karotis-TEA Shunteinlage, NIRS rSO2-Abfall > 20%, Blutdruckführung während Klemmung (MAP +20%)",
        focus_tr: "Karotis cerrahisi, NIRS nöromonitörizasyonu, >%20 düşüşte zorunlu geçici şant endikasyonu, MAP optimizasyonu",
        trap: "Blutdruckabfall während Karotisklemmung tolerieren",
        trap_tr: "NIRS %20'den fazla düştüğü halde cerrahın hızına güvenip şant koydurmamak (perioperatif inme)",
      },
      speechIntro: "Ein 70-jähriger Patient unterzieht sich einer Karotis-TEA in Vollnarkose. Die A. carotis interna wird abgeklemmt. Wie steuern Sie den systemischen Blutdruck während der Abklemmphase und ab welchen Schwellenwerten im Neuromonitoring (NIRS, SEP) fordern Sie eine Shunteinlage?",
      speechIntro_tr: "Genel anestezi altında karotis endarterektomisi (TEA) ameliyatındayız. Serebral fonksiyonları Yakın Kızılötesi Spektroskopi (NIRS) ile izliyorsunuz. Cerrah karotisi klempledikten 30 saniye sonra klemplenen taraftaki NIRS bölgesel serebral oksijen satürasyonu (rSO2) %68'den %44'e düşüyor. Kararınız nedir?",
      crisis: {
        title: "⚡ Zerebrale Ischämie bei Klemmung!",
        title_tr: "⚡ Karotis Klemplemesinde Akut Serebral İskemi!",
        prompt_de: "30 Sekunden nach Karotisklemmung fällt der NIRS-Wert ipsilateral von 68% auf 44% ab! Wie lautet Ihre Anweisung an Operateur und Narkoseteam?",
        prompt_tr: "NIRS değeri %35 düşüş gösterdi, beyin iskemisi gelişiyor! Cerrah '5 dakikada plağı kazırım, bekleyelim' diyor. Zorunlu kararınız nedir?!",
        vitals: { spo2: "99%", bp: "110/65", map: "80 mmHg", hr: "72 /min", etco2: "37 mmHg", temp: "36.5 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "NIRS-Abfall um > 20% ist zwingende Shunt-Indikation! Operateur zur sofortigen temporären Shunteinlage auffordern, MAP mit Noradrenalin um 20% über Ausgangswert heben!",
        targetAction_tr: "NIRS değerinde > %20 düşüş KESİN ŞANT ENDİKASYONUDUR! Cerrahtan derhal GEÇİCİ İNTRAARTERİYEL ŞANT koymasını talep et, MAP'ı Noradrenalin ile yükselt (kollateral dolaşımı artır)!",
      },
      koCriteria: {
        forbiddenPatterns: [/abwarten bei nirs-abfall/i, /blutdruck senken während klemmung/i],
        failureReason: "Tolerieren eines NIRS-Abfalls > 20% oder Hypotonie während der Klemmphase führt zum perioperativen ischämischen Schlaganfall.",
        failureReason_tr: "Serebral monitörizasyonda iskemi bulgusu varken şant koydurmamak veya hipotansiyona izin vermek postoperatif inme ve kalıcı hemiplejiye yol açar.",
        mandatoryKeywords: ["shunt", "nirs > 20%", "map +20%", "noradrenalin", "willisii"]
      }
    },
    q_dus_32: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Massivtransfusion, 'Tödliche Trias' (Hypothermie, Azidose, Koagulopathie), ionisiertes Kalzium > 1,1 mmol/l",
        focus_tr: "Masif transfüzyon, Sitrat toksisitesi, Akut hipokalsemi, İ.V. Kalsiyum klorür, Isıtma ve asidoz tedavisi",
        trap: "Vergessen der Kalziumsubstitution bei Massivtransfusion (Zitrattoxizität K.O.!)",
        trap_tr: "Masif transfüzyonda kalsiyum takibini unutup tansiyon düşüklüğünü sadece kan kaybına bağlamak",
      },
      speechIntro: "Während einer Revisions-OP erhält ein Patient 8 EK und 6 FFP. Was versteht man unter der 'tödlichen Trias', welche Rolle spielt das ionisierte Kalzium bei Zitrattoxizität und wie lauten Ihre Zielparameter zur Gerinnungssicherung?",
      speechIntro_tr: "Politravma nedeniyle masif transfüzyon protokolü uygulanan ve 1 saat içinde 10 ünite Eritrosit Süspansiyonu ile 8 ünite FFP verilen bir hastada tansiyon 60/35 mmHg'ye düşüyor, EKG'de belirgin QT uzaması ve elektromekanik disosiyasyon (nabızsız elektriksel aktivite) tehdidi ortaya çıkıyor. Bu komplikasyonun nedeni nedir ve acil tedaviniz nedir?",
      crisis: {
        title: "⚡ Zitrat-induzierter Herzstillstand droht!",
        title_tr: "⚡ Masif Transfüzyonda Sitrat İntoksikasyonu & Hipokalsemi!",
        prompt_de: "Der Blutdruck fällt auf 60/35 mmHg, EKG zeigt extremes QT-Verlängerung und electromechanical dissociation! Ionisiertes Kalzium liegt bei 0,65 mmol/l. Was spritzen Sie sofort?",
        prompt_tr: "EKG'de QT süresi aşırı uzadı, kardiyak debi çöktü! İyonize kalsiyum 0.65 mmol/L! Dakikalar içinde kalbi kurtaracak ilaç nedir?!",
        vitals: { spo2: "94%", bp: "60/35", map: "43 mmHg", hr: "48 /min", etco2: "22 mmHg", temp: "34.8 °C", rhythm: "QT-Verlängerung", alert: true },
        targetAction: "Sofortige Gabe von 10-20 ml Calciumchlorid 10% (oder Calciumgluconat) i.v.! Aktive Wärmung (Ziel > 36°C), Azidose ausgleichen!",
        targetAction_tr: "KALSİYUM KLORÜR %10: 10-20 ml İ.V. derhal yavaş bolus (iyonize Ca > 1.1-1.2 mmol/L hedeflenir); hastayı aktif ısıt (hipotermi karaciğerde sitrat metabolizmasını felç eder)!",
        failureReason: "Zitrat in Blutprodukten bindet freies Kalzium; Hypokalzämie (< 0,9 mmol/l) lähmt die Gerinnungskaskade und führt zur elektromechanischen Entkopplung des Herzens."
      },
      koCriteria: {
        forbiddenPatterns: [/kalzium ignorieren/i, /keine substitution/i],
        failureReason: "Unterlassene Kalziumsubstitution bei Massivtransfusion führt zu letalem myokardialem Pumpversagen und unstillbarer Koagulopathie!",
        failureReason_tr: "Masif transfüzyonda koruyucu sitratın kalsiyumu bağlamasıyla oluşan ağır hipokalseminin tedavi edilmemesi kardiyak pompa iflasına ve dirençli kardiyak arreste yol açar.",
        mandatoryKeywords: ["trias", "kalzium", "zitrat", "hypothermie", "azidose", "rotem"]
      }
    },
    q_dus_33: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Thoraxtrauma, Spannungspneumothorax, klinische Diagnose, Nadeldekompression vor Röntgen!",
        focus_tr: "Tansiyon pnömotoraks, Klinik tanı (radyoloji YASAK), Acil iğne dekompresyonu (Monaldi/Bülau), Toraks drenajı",
        trap: "Warten auf ein Röntgen-Thorax bei V. a. Spannungspneumothorax (K.O.-Kriterium!)",
        trap_tr: "Tansiyon pnömotoraks şüphesinde dekompresyon yapmadan önce grafi veya ultrason beklemek (fatal gecikme)",
      },
      speechIntro: "Ein 34-jähriger Unfallfahrer zeigt im Schockraum einseitig aufgehobenes Atemgeräusch, hypersonoren Klopfschall, gestaute Halsvenen und einen Blutdruckabfall auf 60/30 mmHg. Erläutern Sie Diagnose und warum die Entlastung ohne radiologische Diagnostik erfolgen muss.",
      speechIntro_tr: "Mekanik ventilatördeki politravma hastasında santral venöz kateter takıldıktan 15 dakika sonra solunum tepe basıncı 22'den 45 cmH2O'ya fırlar, SpO2 %65'e düşer, kan basıncı 60/30 mmHg'ye çakılır, nabız 145/dk taşikardi. Sağ hemitoraksta solunum sesi duyulmuyor. Asistan hekim grafi çekmek için röntgen cihazı çağırmak istiyor. Yaklaşımınız nedir?",
      crisis: {
        title: "⚡ Kreislaufzusammenbruch bei Spannungspneumothorax!",
        title_tr: "⚡ Tansiyon Pnömotoraks & Akut Obstrüktif Şok!",
        prompt_de: "Der Assistenzarzt will das Röntgengerät holen. SpO2 fällt auf 65%, Herzfrequenz 145/min, Patient dekompensiert. Wo stechen Sie in DIESER Sekunde mit welcher Nadel hinein?",
        prompt_tr: "Hasta arrest olmak üzere, boyun venleri dolgun, trakea sola kaymış! Röntgen bekleyecek misiniz, ilk 15 saniyede ne yaparsınız?!",
        vitals: { spo2: "65%", bp: "55/30", map: "38 mmHg", hr: "148 /min", etco2: "18 mmHg", temp: "36.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "SOFORTIGE Nadeldekompression ohne Röntgen! 2. ICR Medioklavikularlinie (Monaldi) oder 4./5. ICR vordere Axillarlinie (Bülau) mit großlumiger Kanüle, danach Thoraxdrainage!",
        targetAction_tr: "RÖNTGEN KESİNLİKLE BEKLENMEZ! Derhal İĞNE DEKOMPRESYONU: 2. İKA medioklaviküler hat (Monaldi) veya 4./5. İKA ön aksiller hat (Bülau/ATLS); ardından su altı drenajlı toraks tüpü takılması!",
      },
      koCriteria: {
        forbiddenPatterns: [/röntgen abwarten/i, /ct vor entlastung/i],
        failureReason: "Ein Spannungspneumothorax ist eine rein klinische Blickdiagnose! Warten auf radiologische Bildgebung führt zum letalen obstruktiven Schock!",
        failureReason_tr: "Tansiyon pnömotoraks klinik bir tanıdır; radyolojik görüntüleme beklemek hastayı obstrüktif şok ve kardiyak arrestten öldürür; mutlak K.O. kriteridir.",
        mandatoryKeywords: ["spannungspneumothorax", "kein röntgen", "nadeldekompression", "monaldi", "bülau", "thoraxdrainage"]
      }
    },
    q_dus_34: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Notsectio Nabelschnurvorfall, Linksseitenkippung 15-30°, Intubationsfreigabe vor Schnitt",
        focus_tr: "RSI prensipleri, Kesi izni kuralı, Kaf blokajı ve kapnografi doğrulaması, Ekip içi otorite ve hasta güvenliği",
        trap: "Chirurgischen Schnitt freigeben VOR gesicherter Intubation und blockiertem Cuff",
        trap_tr: "Cerrahın baskısına boyun eğip tüpün yeri kesinleşmeden kesi yapılmasına izin vermek",
      },
      speechIntro: "Notsectio im Kreißsaal: 29-jährige Erstgebärende mit Nabelschnurvorfall und fetaler Bradykardie (45/min). Patientin hat vor 2 Stunden gegessen. Erläutern Sie das sekundengenaue Vorgehen bei Vollnarkose (RSI), Lagerung und Zeitmanagement.",
      speechIntro_tr: "Acil laparotomi için tok bir hastaya Hızlı Seri İndüksiyon (RSI) yapıyorsunuz. Tam laringoskopu ağıza yerleştirdiğiniz anda cerrah sabırsızlanıp 'Ben kesiyorum' diyerek neşteri cilde vurmaya hazırlanıyor. Ameliyathanede ne yaparsınız ve kesi izni kuralı nedir?",
      crisis: {
        title: "⚡ Chirurg setzt das Skalpell vor Intubation an!",
        title_tr: "⚡ Entübasyon ve Kaf Doğrulanmadan Kesi Girişimi!",
        prompt_de: "Während Sie das Laryngoskop einführen, will der Operateur die Haut durchtrennen. Was rufen Sie durch den Saal und wann darf der Schnitt erfolgen?",
        prompt_tr: "Cerrah neşteri kaldırmış cilde dokunduruyor, tüp henüz vokal kordlardan geçmedi! Ameliyathanede ne diye bağırırsınız?!",
        vitals: { spo2: "94%", bp: "135/80", map: "98 mmHg", hr: "110 /min", etco2: "36 mmHg", temp: "36.8 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "'HALT, Schnitt erst nach Tubuslage und geblocktem Cuff!' Freigabe erst nach Verifikation der 4 Kapnographiewellen: 'Tubus liegt, Schnitt frei!' Linksseitenkippung sichern!",
        targetAction_tr: "'DURUN! TÜP DOĞRULANMADAN KESİ KESİNLİKLE YASAK!' Kesi izni yalnızca tüp trakeaya yerleştirilip, kaf şişirildikten ve en az 4 dalga normokapnik kapnografi görüldükten sonra verilir!",
      },
      koCriteria: {
        forbiddenPatterns: [/vor intubation schneiden lassen/i, /flach lagern/i],
        failureReason: "Schnitt vor gesicherter Intubation führt bei Aspiration zum unkontrollierbaren Erbrechen und Erstickungstod der Mutter!",
        failureReason_tr: "Kafı şişirilmemiş ve yeri kapnografiyle doğrulanmamış hastada cerrahi kesiye izin verilmesi laringospazma, masif kusmaya ve ölümcül aspirasyona yol açar.",
        mandatoryKeywords: ["eez 20 min", "linksseitenkippung", "rsi", "schnitt erst nach tubus", "succinylcholin", "oxytocin"]
      }
    },
    q_dus_35: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Intraoperative Anaphylaxie Grad III, Adrenalin 10-50 µg als 1. Wahl, Serum-Tryptase",
        focus_tr: "Anafilaksi Derece III-IV, 1. Tercih Adrenalin (titre İ.V. veya 0.5 mg İ.M.), Hızlı volüm yüklemesi, Kortizonun ikincil rolü",
        trap: "Gabe von Cortison als erstes Akutmedikament (K.O.-Kriterium! Cortison wirkt erst nach Stunden)",
        trap_tr: "Anafilaktik şokta Adrenalin vermeden önce kortizon veya antihistaminik hazırlamaya kalkışmak",
      },
      speechIntro: "Ein 60-jähriger Patient entwickelt unmittelbar nach Narkoseeinleitung mit Rocuronium schwere Hypotonie (RR 55/30 mmHg), Tachykardie (130/min), Beatmungsdruckanstieg auf 42 mbar und Flush mit Urtikaria. Nennen Sie Diagnose, das unverzichtbare Medikament der 1. Wahl und dessen Dosierung.",
      speechIntro_tr: "Antibiyotik infüzyonundan 2 dakika sonra genel anestezi altındaki hastada yaygın kızarıklık, bronkospazm (tepe basıncı 46 cmH2O) ve kan basıncında ani çöküş (RR 50/20 mmHg, nabız 140/dk) gelişiyor. Asistan hekim dolaptan Prednisolon (Kortizon) flakonunu alıp sulandırmaya çalışıyor. Bu yaklaşımı nasıl düzeltirsiniz?",
      crisis: {
        title: "⚡ Anaphylaktischer Schock dekompensiert!",
        title_tr: "⚡ Ağır Anafilaktik Şok & Yanlış İlaç Tercihi!",
        prompt_de: "Der Kollege greift nach 250 mg Prednisolon. Der Karotispuls wird fadenförmig! Welches ist das EINZIGE lebensrettende Medikament in DIESER Sekunde und wie dosieren Sie es?",
        prompt_tr: "Karotis nabzı zayıflıyor, periferik nabızlar kayboldu! Anafilaktik şokta hayat kurtaran 1. TERCİH TEK İLAÇ nedir ve asistanın hatası nedir?!",
        vitals: { spo2: "80%", bp: "50/25", map: "33 mmHg", hr: "142 /min", etco2: "18 mmHg", temp: "36.9 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "ADRENALIN (Epinephrin) i.v.! Initial 10-50 µg i.v. titriert bolusweise (wiederholen alle 1-2 min)! Cortison ist kein Akutmedikament! 20-30 ml/kg Kristalloide!",
        targetAction_tr: "1. TERCİH İLAÇ KESİNLİKLE ADRENALİN'DİR (Epinefrin)! İntübe hastada 10-50 µg İ.V. titre bolus (gerekirse tekrarlanır) ve hızlı kristalloid yüklemesi; Kortizonun etkisi 30-60 dakika sonra başlar, akut hayat kurtarmaz!",
      },
      koCriteria: {
        forbiddenPatterns: [/cortison als erstes/i, /prednisolon zuerst/i, /fenistil zuerst/i],
        failureReason: "Wer bei schwerer Anaphylaxie Cortison statt Adrenalin als erstes Akutmedikament nennt, fällt sofort durch! Adrenalin ist das einzige unverzichtbare Lebensrettungsmedikament!",
        failureReason_tr: "Anafilaktik şokta Adrenalin yerine ilk olarak Kortizon veya Antihistaminik verilmesi ölümcül zaman kaybına ve vazodilatatuar kardiyak arreste neden olur; mutlak sınavdan kalma nedenidir.",
        mandatoryKeywords: ["adrenalin", "epinephrin", "10-50", "volumen", "tryptase", "allergenstopp"]
      }
    },
    q_dus_36: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum / Annecke",
        hospital: "ÄKNO Düsseldorf Prüfungskommission (ERC / ALS)",
        focus: "Reanimation ERC ALS, Kammerflimmern, Adrenalin & Amiodaron erst NACH dem 3. Schock!",
        focus_tr: "ALS / ERC Resüsitasyon algoritması, VF/pVT şoklanabilir ritimler, 3. şok kuralı (Adrenalin 1 mg ve Amiodaron 300 mg)",
        trap: "Adrenalingabe vor dem 3. Schock bei schockbarem Rhythmus (K.O.-Kriterium!)",
        trap_tr: "VF'de 1. veya 2. şoktan hemen sonra erkenden Adrenalin uygulamak; şoktan sonra nabız kontrolü için CPR'ı durdurmak",
      },
      speechIntro: "Ein 64-jähriger Patient im Aufwachraum kollabiert, kein Puls, Monitor zeigt Kammerflimmern (VF). Erläutern Sie die genaue Sequenz der ersten 3 Schocks, die Applikationszeitpunkte von Adrenalin und Amiodaron sowie die 4 H's und HITS.",
      speechIntro_tr: "Ameliyathanede ani kardiyak arrest gelişen bir hastada monitör Ventriküler Fibrilasyon (VF) gösteriyor. 1. defibrilasyon şoku (200 J bifazik) başarıyla veriliyor. Şok verilir verilmez asistan hekim 1 mg Adrenalin enjektörünü alıp damar yolundan puşe etmeye hazırlanıyor. Müdahaleniz nedir ve ERC algoritması nasıldır?",
      crisis: {
        title: "⚡ Persistierendes Kammerflimmern!",
        title_tr: "⚡ Defibrilasyon Sonrası Yanlış Zamanda Adrenalin!",
        prompt_de: "Der 1. Schock wurde abgegeben. Der Assistent will sofort 1 mg Adrenalin i.v. injizieren. Was sagen Sie und wann genau dürfen Adrenalin und Amiodaron gegeben werden?",
        prompt_tr: "Asistan tam ilacı enjekte etmek üzere! Ne söylersiniz ve ERC kılavuzuna göre VF/pVT'de Adrenalin ne zaman verilir?!",
        vitals: { spo2: "45%", bp: "0/0", map: "0 mmHg", hr: "0 /min", etco2: "12 mmHg", temp: "36.3 °C", rhythm: "Kammerflimmern (VF)", alert: true },
        targetAction: "STOPP! Kein Adrenalin nach dem 1. Schock! Sofort 2 Minuten CPR! Adrenalin (1 mg) und Amiodaron (300 mg) werden erst NACH DEM 3. SCHOCK verabreicht!",
        targetAction_tr: "'DUR! ŞOKTAN HEMEN SONRA ADRENALİN VERİLMEZ!' Şoktan hemen sonra kesintisiz 2 DAKİKA CPR yapılır! Adrenalin (1 mg) ve Amiodaron (300 mg) ancak 3. BAŞARISIZ ŞOKTAN SONRA verilir!",
      },
      koCriteria: {
        forbiddenPatterns: [/adrenalin nach dem 1. schock/i, /adrenalin vor dem 3. schock/i, /adrenalin sofort bei vf/i],
        failureReason: "Frühzeitige Adrenalingabe vor dem 3. Schock bei VF/pVT senkt die Defibrillationserfolgsrate und das Überleben drastisch (ERC-Leitlinie K.O.-Kriterium)!",
        failureReason_tr: "Şoklanabilir ritimlerde (VF/pVT) 1. şokun hemen ardından Adrenalin verilmesi defibrilasyonun başarısını düşürür ve miyokardiyal hasarı artırır; ERC algoritması ihlalidir.",
        mandatoryKeywords: ["3. schock", "adrenalin 1 mg", "amiodaron 300", "cpr 2 minuten", "4 h", "hits"]
      }
    },
    q_dus_37: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen · ÄKNO Prüfungsvorsitzender",
        focus: "Schilddrüsenchirurgie, Nachblutung, Notfall-Atemweg & bettseitige Dekompression",
        focus_tr: "Postoperatif tiroit hematomu, Yatak başı acil yara açılması, Trakeal dekompresyon, Asfiksi önleme",
        trap: "Warten auf Chirurgen oder CT-Diagnostik bei drohender Asphyxie (K.O.-Kriterium!)",
        trap_tr: "Boğulmakta olan hastada yatak başında dikişleri açmak yerine cerrahı beklemek veya hastayı BT'ye göndermek",
      },
      speechIntro: "Eine 40-jährige Patientin wird 3 Stunden nach Hemithyroidektomie im Aufwachraum zunehmend dyspnoisch mit Stridor, kloßiger Sprache und Halsschwellung. SpO2 fällt auf 84 %. Was sind Ihre Differenzialdiagnosen und wie gehen Sie sofort vor?",
      speechIntro_tr: "Ayılma odasındayız: Tiroidektomi ameliyatından 3 saat sonra 40 yaşında kadın hasta aniden nefes darlığı, stridor ve boyunda hızla büyüyen gergin şişlik geliştiriyor. SpO2 %84'e düşüyor, hasta boğulmak üzere. Yatak başındaki yapılandırılmış acil algoritmanız nedir ve asfiksiyi önleyen nihai karar nedir?",
      crisis: {
        title: "⚡ Drohende Erstickung & Intubationshindernis!",
        title_tr: "⚡ Tiroidektomi Sonrası Boğucu Boyun Hematomu!",
        prompt_de: "Die Patientin verliert das Bewusstsein, SpO2 fällt auf 74%! Bei Laryngoskopie sehen Sie nur noch ein massiv nach rechts komprimiertes Ödem, kein Einblick! Was ist Ihre rettende Sofortentscheidung am Bett in den nächsten 30 Sekunden?",
        prompt_tr: "Hasta bilincini kaybetmek üzere, laringoskopide anatomik yapılar hematom basısıyla tanınmaz halde, tüp ilerletilemiyor! Yatak başındaki hayat kurtarıcı karar nedir?!",
        vitals: { spo2: "74%", bp: "195/110", map: "138 mmHg", hr: "136 /min", etco2: "58 mmHg", temp: "37.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Sofortige Wund- und Faszienöffnung am Bett mit den Fingern/Klemme! Druckentlastung des Hämatoms zur Trachealdekompression, danach Re-Intubation oder Koniotomie!",
        targetAction_tr: "YATAK BAŞINDA DİKİŞLERİ VE FASYA LOJLARINI DERHAL AÇMAK! Cilt dikişlerini kes, parmakla/pensle hematomu boşaltarak trakea basısını kaldır; ancak bundan sonra entübasyon mümkün olur!",
      },
      koCriteria: {
        forbiddenPatterns: [/warten auf den chirurgen/i, /patientin ins ct/i, /abwarten/i, /keine nahtöffnung/i],
        failureReason: "Bei erstickendem Hals-Nachblutungshämatom darf niemals auf den OP/Chirurgen gewartet oder ein CT gemacht werden – nur die sofortige bettseitige Wund- und Faszienöffnung rettet vor der Asphyxie!",
        failureReason_tr: "Boğucu boyun hematomunda yatak başında dikişleri açmayıp cerrahı beklemek veya hastayı tomografiye (BT) göndermek kesinlikle sınavdan kalma sebebidir.",
        mandatoryKeywords: ["bettseit", "wunde eröffnen", "faszie", "hämatom", "druckentlastung", "koniotomie"]
      }
    },
    q_dus_38: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke / Schroeder",
        hospital: "ÄKNO Prüfungskommission (Neuroanästhesie)",
        focus: "Rupturiertes Hirnaneurysma, Coiling, transmuraler Druck, TIVA, Normoventilation & Nimodipin",
        focus_tr: "Transmural anevrizma basıncı (Ptm = MAP - ICP), Derin RSI analjezisi, Anevrizma re-rüptürü, Cushing triadı yönetimi",
        trap: "Hypertensive Entgleisung bei Laryngoskopie (Re-Ruptur!) oder forcierte Hyperventilation",
        trap_tr: "Anevrizma kapatılmadan önce hipertansiyona göz yummak; Cushing bradikardisini Atropin ile tedavi etmeye kalkışmak",
      },
      speechIntro: "Eine 58-jährige somnolente Patientin (Hunt & Hess III) mit rupturiertem Basilariskopf-Aneurysma soll gecoilt werden. Erläutern Sie die Bedeutung des transmuralen Drucks, Ihre Narkoseführung und die Blutdruckziele vor und nach Verschluss.",
      speechIntro_tr: "Girişimsel nöroradyolojide rüptüre A. basilaris anevrizması (Fisher Evre 3, Hunt & Hess 3) olan 58 yaşında bir kadın hastaya acil koilleme (coiling) için anestezi indüksiyonu yapacaksınız. Transmural anevrizma basıncını nasıl kontrol altında tutarsınız ve kanama anında ne yaparsınız?",
      crisis: {
        title: "⚡ Aneurysma-Re-Ruptur mit Cushing-Reflex!",
        title_tr: "⚡ Anevrizma İndüksiyonunda Re-Rüptür & Cushing Yanıtı!",
        prompt_de: "Der Neuroradiologe meldet Kontrastmittelaustritt – Aneurysmaruptur! Der Blutdruck schießt auf 215/120 mmHg, Herzfrequenz stürzt auf 36/min ab! Was ist Ihre unmittelbare Notfalltherapie?",
        prompt_tr: "Girişim sırasında radyolog kontrast ekstravazasyonu bildiriyor: Anevrizma tekrar kanadı! Tansiyon 220/125 mmHg'ye fırlıyor, nabız 36/dk (Cushing yanıtı)! Acil hemodinamik ve intrakraniyal müdahaleniz nedir?!",
        vitals: { spo2: "97%", bp: "215/120", map: "151 mmHg", hr: "36 /min", etco2: "35 mmHg", temp: "36.8 °C", rhythm: "Sinusbradykardie (Cushing)", alert: true },
        targetAction: "Sofortige MAP-Senkung mit Urapidil (10-25 mg) / Esmolol, transiente Hyperventilation (PaCO2 30-35 mmHg), Mannitol 20% oder hypertones NaCl, Protamin bei Heparingabe, EVD öffnen!",
        targetAction_tr: "Urapidil (10-25 mg) veya Esmolol ile transmural basıncı düşür, hafif hiperventilasyon (PaCO2 30-35 mmHg), Mannitol (%20 1 g/kg) veya hipertonik salin, Cushing bradikardisinde Atropin KONTRENDİKEDİR!",
      },
      koCriteria: {
        forbiddenPatterns: [/atropin als alleinige therapie/i, /blutdruckanstieg ignorieren/i, /map unter 50 senken/i],
        failureReason: "Cushing-Trias bei Aneurysmaruptur erfordert sofortiges Hirndruck- und Blutdruckmanagement; Atropingabe ohne ICP-Senkung oder extremes Absenken des MAP unter den ICP zerstört die Hirnperfusion!",
        failureReason_tr: "Anevrizma indüksiyonunda öksürme/ıkınma veya yetersiz analjezi nedeniyle hipertansiyona izin vermek re-rüptüre yol açar (%80 mortalite); Cushing bradikardisinde Atropin vermek intrakraniyal basıncı artırarak öldürür.",
        mandatoryKeywords: ["transmural", "urapidil", "tiva", "normoventilation", "nimodipin", "cushing"]
      }
    },
    q_dus_39: {
      examiner: {
        name: "Prof. Dr. med. Andreas Hohn / Becke",
        hospital: "ÄKNO Prüfungskommission (Kinderanästhesie)",
        focus: "Fallot-Tetralogie, Rechts-Links-Shunt, Tet-Spell, Phenylephrin & Adrenalin-Kontraindikation",
        focus_tr: "Fallot Tetralojisi, Tet-Spell infundibulum spazmı, Diz-göğüs pozisyonu, SVR artırıcı saf alfa agonistler (Fenilefrin)",
        trap: "Adrenalingabe bei hyperzyanotischem Anfall / Tet-Spell (absolutes K.O.-Kriterium!)",
        trap_tr: "Fallot krizinde Adrenalin uygulamak (sağ çıkım yolunu tamamen kapatıp bebeği öldürmek)",
      },
      speechIntro: "Ein 3 Monate altes Mädchen (4,5 kg) mit unkorrigierter Fallot-Tetralogie kommt zur Leistenhernien-OP. Beschreiben Sie die Shuntphysiologie, Narkoseprinzipien und die Behandlung eines intraoperativen Tet-Spells.",
      speechIntro_tr: "Düzeltilmemiş Fallot Tetralojisi olan 3 aylık bir kız bebek (4.5 kg) kasık fıtığı operasyonuna alınıyor. Entübasyondan hemen sonra SpO2 %92'den %30'a çakılıyor, etCO2 18 mmHg'ye düşüyor. Akut hipersiyanotik atağı (Tet-Spell) nasıl teşhis ve tedavi edersiniz?",
      crisis: {
        title: "⚡ Akuter hyperzyanotischer Tet-Spell!",
        title_tr: "⚡ Akut Hipersiyanotik Atak (Fallot Tet-Spell)!",
        prompt_de: "Nach der Intubation wird das Kind aschgrau-zyanotisch! SpO2 fällt auf 28%, etCO2 bricht auf 18 mmHg ein! Wie durchbrechen Sie diesen lebensbedrohlichen Infundibulumkrampf Schritt für Schritt?",
        prompt_tr: "Bebek simsiyah siyanotik oldu, SpO2 %28! Asistan hekim hemen 100 µg Adrenalin enjekte etmek istiyor! Neden KESİNLİKLE HAYIR ve hayat kurtaran gerçek adımlar nelerdir?!",
        vitals: { spo2: "28%", bp: "52/28", map: "36 mmHg", hr: "58 /min", etco2: "18 mmHg", temp: "36.6 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "FiO2 1,0, Knie-Brust-Lage (mechanische SVR-Erhöhung), Narkose vertiefen (Sufentanil/Sevofluran), Noradrenalin (1 µg/kg) oder Phenylephrin (5-10 µg/kg), Volumenbolus (10-20 ml/kg)! KEIN Adrenalin!",
        targetAction_tr: "ADRENALİN KESİNLİKLE KONTRENDİKEDİR (infundibulumu büsbütün kilitler)! Tedavi: %100 O2, DİZ-GÖĞÜS pozisyonu (SVR'yi mekanik artırır), anesteziyi derinleştir (Süfentanil/Sevofluran), FENİLEFRİN veya NORADRENALİN bolusu!",
      },
      koCriteria: {
        forbiddenPatterns: [/adrenalin bolus/i, /adrenalin spritzen/i, /vasodilatanzien geben/i],
        failureReason: "Adrenalin kontrahiert das Infundibulum noch stärker über Beta-Rezeptoren und schließt den RV-Ausflusstrakt komplett ab – führt zum hypoxischen Kreislaufstillstand!",
        failureReason_tr: "Fallot krizinde Adrenalin verilmesi infundibulum spazmını doruğa çıkararak sağ ventrikül çıkımını tamamen kapatır ve fatal hipoksik arreste yol açar; K.O. kriteridir.",
        mandatoryKeywords: ["knie-brust", "svr", "infundibulum", "phenylephrin", "noradrenalin", "narkose vertiefen"]
      }
    },
    q_dus_40: {
      examiner: {
        name: "Prof. Dr. med. Andreas Hohn",
        hospital: "Universitätsklinikum Köln / Bergmannsheil Bochum · Verbrennungszentrum",
        focus: "Schweres Verbrennungstrauma, Inhalation, Parkland-Formel & Succinylcholin-Kontraindikation",
        focus_tr: "Yanık travmasında Süksinilkolin kontrendikasyonu, Ekstrajunksiyonel asetilkolin reseptörleri, Akut hiperkalemik arrest, Kalsiyum klorür",
        trap: "Gabe von Succinylcholin bei Verbrennung ab 24h nach Trauma (tödliche Hyperkaliämie / K.O.!)",
        trap_tr: "Yanık travmasının 24 saat sonrasında Süksinilkolin kullanmak (dakikalar içinde hiperkalemik kardiyak arrest)",
      },
      speechIntro: "Ein 45-jähriger Arbeiter (80 kg) mit 27% Verbrennungen und Inhalationstrauma soll an Tag 3 nach dem Unfall operiert werden. Erläutern Sie das Atemwegsmanagement, die Parkland-Formel und die Wahl des Muskelrelaxans.",
      speechIntro_tr: "Ağır alev yanığı (2. ve 3. derece, vücut yüzeyinin %27'si) olan 45 yaşında bir işçi travmanın 3. gününde nekrozektomi için ameliyathaneye alınıyor. Ameliyatın 3. gününde indüksiyonda Süksinilkolin verilmesi neden kesinlikle kontrendikedir ve hangi ölümcül felakete yol açar?",
      crisis: {
        title: "⚡ Akute fulminante Hyperkaliämie nach Succinylcholin!",
        title_tr: "⚡ Yanıkta Süksinilkolin Sonrası Ölümcül Hiperkalemi!",
        prompt_de: "Ein junger Kollege hat versehentlich Succinylcholin an Tag 3 injiziert! Im EKG sieht man zeltförmige T-Wellen, QRS-Verbreiterung und Kammerflimmern! Was ist der Mechanismus und wie retten Sie den Patienten?",
        prompt_tr: "Meslektaşım, asistan hekim dalgınlıkla Süksinilkolin puşe etti! Monitörde saniyeler içinde dev T dalgaları ve ardından Ventriküler Fibrilasyon gelişti! Patofizyoloji ve acil resüsitasyon nedir?!",
        vitals: { spo2: "42%", bp: "40/15", map: "23 mmHg", hr: "148 /min -> VF", etco2: "15 mmHg", temp: "36.4 °C", rhythm: "Kammerflimmern / ventrikuläre Tachykardie", alert: true },
        targetAction: "Sofortige CPR & Defibrillation, Kalziumchlorid 10% (10 ml i.v. zur Membranstabilisierung), Glukose 20% (100 ml) + 10 IE Normalinsulin, Natriumbikarbonat 8,4%, Hyperventilation!",
        targetAction_tr: "Derhal CPR ve Defibrilasyon, KALSİYUM KLORÜR %10 10 ml İ.V., Glukoz+İnsülin, Hiperventilasyon! Yanıkta 24 saatten sonra ekstrajunksiyonel reseptör regülasyonu nedeniyle Süksinilkolin KESİNLİKLE KONTRENDİKEDİR!",
      },
      koCriteria: {
        forbiddenPatterns: [/succinylcholin ist unbedenklich/i, /succinylcholin an tag 3 wiederholen/i, /kaliumchlorid geben/i],
        failureReason: "Succinylcholin ist ab 24-48h nach Verbrennung wegen extrajunktioneller Rezeptor-Upregulation streng kontraindiziert; führt zu tödlicher Hyperkaliämie mit Asystolie!",
        failureReason_tr: "Ağır yanık, denerve kas veya uzun süreli immobilizasyonda 24-48 saatten sonra Süksinilkolin verilmesi masif potasyum fışkırmasına (K > 9-10 mmol/L) ve ani ölüme yol açar; en ağır K.O. kriteridir.",
        mandatoryKeywords: ["parkland", "up-regulation", "extrajunktionell", "hyperkaliämie", "calcium", "rocuronium"]
      }
    },
    q_dus_41: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen · ÄKNO Prüfungsvorsitzender (Geburtshilfe)",
        focus: "Notsectio Kategorie 1 (Cito), EEZ <= 20 min, RSI, Oxytocin-Dosisgrenze & Uterusatonie",
        focus_tr: "Acil sezaryen (Cito-Sectio EEZ <= 20 dk), Oksitosin doz sınırı (3-5 IU yavaş), Sulproston (Nalador), Atonide kanama kontrolü",
        trap: "Bolusgabe von 10 IE Oxytocin (akuter Kreislaufkollaps!) oder Rückenlage ohne Linksneigung",
        trap_tr: "Bebek doğar doğmaz 10 IU Oksitosini hızlı puşe etmek (ağır vazodilatatuar şok ve kardiyak arrest)",
      },
      speechIntro: "Funkalarm im Kreißsaal: Cito-Sectio wegen fetaler Bradykardie (HF 55/min). Erläutern Sie E-E-Zeit, RSI-Durchführung bei der Schwangeren, Oxytocindosierung und den Algorithmus bei 'Cannot Intubate'.",
      speechIntro_tr: "Fetal bradikardi nedeniyle acil sezaryene (Cito-Sectio / Kategori 1) alınan gebede anestezi indüksiyonu ve bebek doğumu sonrasında uterus atonisi gelişiyor. Bebek çıkarıldıktan sonra Oksitosin nasıl dozlanmalıdır ve hızlı yüksek doz bolus neden ölümcüldür?",
      crisis: {
        title: "⚡ Kreislaufabsturz & Uterusatonie nach Oxytocin-Bolus!",
        title_tr: "⚡ Sezaryende Oksitosin Bolusu Sonrası Kardiyak Kollaps!",
        prompt_de: "Nach Kindsentwicklung wurde versehentlich eine ganze Ampulle Oxytocin (10 IE) schnell i.v. injiziert! Der Blutdruck stürzt auf 60/30 mmHg ab, der Uterus ist teigig weich und blutet massiv! Was tun Sie sofort?",
        prompt_tr: "Bebek doğduktan sonra hemşire 10 IU Oksitosini hızla İ.V. puşe etti! Tansiyon 40/15 mmHg'ye çöktü, ağır taşikardi ve EKG'de ST çökmesi başladı! Bu felaketin mekanizması ve tedavisi nedir?!",
        vitals: { spo2: "88%", bp: "60/30", map: "40 mmHg", hr: "135 /min", etco2: "22 mmHg", temp: "36.5 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Noradrenalin-Bolus/Perfusor, zügige Kristalloide, Sulproston (Nalador) i.v. titrieren, Tranexamsäure (1-2 g i.v.), Gebärmuttermassage (Credé), Linksneigung beibehalten!",
        targetAction_tr: "Oksitosin ASLA hızlı bolus verilmez (en fazla 3-5 IU yavaş infüzyonla verilir)! Tedavi: Noradrenalin bolusu/perfüzörü, hızlı kristalloid; Atonide ikinci hat olarak SULPROSTON (Nalador) titre infüzyon ve Traneksamik asit!",
      },
      koCriteria: {
        forbiddenPatterns: [/10 ie oxytocin bolus wiederholen/i, /keine linksseitenlage/i, /nur abwarten/i],
        failureReason: "Schnelle Oxytocin-Boli >5 IE lösen massive Vasodilatation und kardialen Kollaps aus; bei Atonie muss Sulproston und Tranexamsäure plus Vasopressor zum Einsatz kommen!",
        failureReason_tr: "Oksitosinin hızlı yüksek doz (10 IU) bolus verilmesi periferik vazodilatasyon, şiddetli hipotansiyon, koroner iskemi ve kardiyovasküler kollapsa yol açar; K.O. kriteridir.",
        mandatoryKeywords: ["20 minuten", "linksseitenlage", "oxytocin 3-5", "sulproston", "larynxmaske 2. generation", "rsi"]
      }
    },
    q_dus_42: {
      examiner: {
        name: "Prof. Dr. med. Andreas Hohn / Annecke",
        hospital: "ÄKNO Prüfungskommission (Aufwachraum & Atemweg)",
        focus: "Laryngospasmus, Unterdrucklungenödem (NPPE), Larson-Handgriff, CPAP & PEEP",
        focus_tr: "Postekstübasyon Laringospazmı, Negatif Basınçlı Akciğer Ödemi (NPPE), Larson manevrası, Yüksek PEEP ventilasyonu",
        trap: "Fehldiagnose als Bronchospasmus oder Auslassen von PEEP bei schaumigem Unterdrucködem",
        trap_tr: "Laringospazmı sadece maskeyle beklemek; gelişen akciğer ödeminde PEEP tedavisini atlamak",
      },
      speechIntro: "Ein 26-jähriger Patient zeigt nach laparoskopischer Appendektomie Schaukelatmung, Stridor und schließlich Apnoe bei SpO2 68%. Aus dem Mund quillt rosafarbener Schaum. Erläutern Sie Pathophysiologie und Stufentherapie.",
      speechIntro_tr: "Laparoskopik apandisit sonrası ekstübe edilen genç kaslı bir hastada aniden şiddetli tahtıravalli solunumu (Schaukelatmung), stridor ve ardından tam solunum tıkanması (sessiz akciğer) gelişiyor. Oksijen verilmesine rağmen SpO2 %65'e düşüyor ve ağızdan pembe köpüklü sekresyon geliyor. Patofizyoloji ve adım adım kurtarma tedaviniz nedir?",
      crisis: {
        title: "⚡ Akuter Laryngospasmus mit Unterdrucklungenödem!",
        title_tr: "⚡ Akut Laringospazm & Negatif Basınçlı Akciğer Ödemi!",
        prompt_de: "Der Patient saugt maximal am Thorax, kein Atemhub geht durch, SpO2 fällt auf 62%, rosafarbener Schaum schießt in die Maske! Wie handeln Sie von Sekunde zu Sekunde?",
        prompt_tr: "Hasta göğüs kafesini parçalarcasına nefes almaya çalışıyor ama hava geçmiyor, SpO2 %62, pembe köpük fışkırıyor! Saniye saniye basamaklı kurtarma protokolünüz nedir?!",
        vitals: { spo2: "62%", bp: "185/110", map: "135 mmHg", hr: "145 /min", etco2: "65 mmHg", temp: "37.0 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "100% O2 unter CPAP (APL-Ventil 15-20 cmH2O), Larson-Handgriff, Propofol (0,5-1 mg/kg) i.v., bei Versagen Succinylcholin (0,5-1 mg/kg) + Re-Intubation, invasive Beatmung mit PEEP (8-12 cmH2O)!",
        targetAction_tr: "1. %100 O2 ile CPAP (APL valfi 15-20 cmH2O), 2. LARSON MANEVRASI (çene çentiğine iki taraflı ağrılı bası), 3. PROPOFOL (0.5-1 mg/kg İ.V.), 4. Düzelmezse SÜKSİNİLKOLİN (0.5-1 mg/kg) + RE-ENTÜBASYON, 5. YÜKSEK PEEP (8-12 cmH2O) ile mekanik ventilasyon!",
      },
      koCriteria: {
        forbiddenPatterns: [/nur salbutamol geben/i, /patient auf normalstation/i, /kein peep/i],
        failureReason: "Unterdrucklungenödem entsteht durch extreme negative intrathorakale Drücke gegen die geschlossene Glottis; wer kein PEEP und keine Narkosevertiefung/Relaxierung einleitet, lässt den Patienten ersticken!",
        failureReason_tr: "Kilitli glottise karşı yapılan aşırı inspirasyon çabası intratorasik negatif basıncı (-50 ila -100 cmH2O) fırlatarak alveollere sıvı çeker (NPPE); PEEP uygulamamak ve spazmı çözmemek fatal hipoksiye yol açar.",
        mandatoryKeywords: ["laryngospasmus", "unterdrucklungenödem", "larson", "cpap", "propofol", "peep", "succinylcholin"]
      }
    }
  };

  class MockExamSimulation {
    constructor(allQuestions) {
      this.allQuestions = allQuestions || [];
      // Filter strictly for authentic Düsseldorf protocol cases
      this.dusQuestions = this.allQuestions.filter(q => q.is_dus_protocol || (q.source_book && (q.source_book.includes('Düsseldorf') || q.source_book.includes('D\u00fcsseldorf'))));
      if (!this.dusQuestions.length) {
        this.dusQuestions = this.allQuestions.filter(q => q.question_type === 'open' || !q.options || q.options.length === 0);
      }
      this.activeCases = [];
      this.currentCaseIndex = 0;
      this.secondsRemaining = EXAM_DURATION_SECONDS;
      this.timerId = null;
      this.isFinished = false;
      this.isActive = false;
      this.scores = [null, null, null, null];
      this.onTickCallback = null;
      this.onFinishCallback = null;
    }

    /**
     * Retrieves the rich simulation registry entry for a question
     */
    static getRegistry(questionId) {
      return DUS_SIMULATION_REGISTRY[questionId] || null;
    }

    /**
     * Checks if a question ID belongs to the authentic Düsseldorf pool
     */
    static isDüsseldorfProtocol(questionId) {
      return !!DUS_SIMULATION_REGISTRY[questionId];
    }

    /**
     * Evaluates a candidate's answer against ÄKNO scoring rubrics & K.O.-criteria
     * @param {string} questionId 
     * @param {string} transcript 
     * @param {Array<string>} rubricPearls 
     */
    static evaluateCandidateAnswer(questionId, transcript, rubricPearls) {
      const reg = DUS_SIMULATION_REGISTRY[questionId];
      const cleanTranscript = (transcript || '').toLowerCase();
      
      // 1. Check K.O. Criteria (Fatal Malpractice Traps)
      if (reg && reg.koCriteria && reg.koCriteria.forbiddenPatterns) {
        for (const pattern of reg.koCriteria.forbiddenPatterns) {
          if (pattern.test(cleanTranscript)) {
            return {
              passed: false,
              grade: 5.0,
              gradeText: "Note 5.0 (Ungenügend / Nicht bestanden)",
              koViolated: true,
              koReason: reg.koCriteria.failureReason,
              examinerFeedback: `🚨 PRÜFUNGSABBRUCH DURCH DIE ÄKNO-KOMMISSION: ${reg.koCriteria.failureReason}`,
              examinerName: reg.examiner ? reg.examiner.name : "ÄKNO Prüfungskommission",
              matchedKeywords: [],
              matchRatio: 0
            };
          }
        }
      }

      // 2. Extract keywords from transcript
      const words = cleanTranscript.replace(/<[^>]*>/g, ' ').split(/[\s,.;:!?\-\/\(\)]+/).filter(w => w.length >= 3);
      const transcriptSet = new Set(words);

      let mandatoryHits = 0;
      let totalMandatory = 0;
      if (reg && reg.koCriteria && reg.koCriteria.mandatoryKeywords) {
        totalMandatory = reg.koCriteria.mandatoryKeywords.length;
        reg.koCriteria.mandatoryKeywords.forEach(kw => {
          const kwClean = kw.toLowerCase();
          if (cleanTranscript.includes(kwClean) || words.some(w => w.includes(kwClean) || kwClean.includes(w))) {
            mandatoryHits++;
          }
        });
      }

      // 3. Match against high-yield rubric pearls
      let pearlHits = 0;
      const matchedPearls = [];
      const missedPearls = [];

      (rubricPearls || []).forEach(pearl => {
        const pearlKeywords = pearl.toLowerCase().replace(/<[^>]*>/g, ' ').split(/[\s,.;:!?\-\/\(\)]+/).filter(w => w.length >= 4);
        let hits = 0;
        pearlKeywords.forEach(pk => {
          if (words.some(w => w.includes(pk) || pk.includes(w))) hits++;
        });

        if (hits >= 2 || (pearlKeywords.length && hits / pearlKeywords.length >= 0.3)) {
          pearlHits++;
          matchedPearls.push(pearl);
        } else {
          missedPearls.push(pearl);
        }
      });

      const totalItems = Math.max(1, (rubricPearls || []).length);
      const pearlRatio = pearlHits / totalItems;
      const mandatoryRatio = totalMandatory ? (mandatoryHits / totalMandatory) : pearlRatio;
      const combinedScore = (pearlRatio * 0.6) + (mandatoryRatio * 0.4);

      let grade = 5.0;
      let gradeText = "Note 5.0 (Nicht bestanden)";
      let passed = false;
      let feedback = "";

      if (combinedScore >= 0.70) {
        grade = 1.0;
        gradeText = "Note 1.0 (Sehr Gut - Mit Auszeichnung)";
        passed = true;
        feedback = "Hervorragende, souveräne Prüfungsleistung! Sie haben alle Kernalgorithmen, Zielparameter und Dosierungen präzise nach den Leitlinien der DGAI und ÄKNO Düsseldorf dargestellt.";
      } else if (combinedScore >= 0.50) {
        grade = 2.0;
        gradeText = "Note 2.0 (Gut - Souverän bestanden)";
        passed = true;
        feedback = "Sehr solide und strukturierte Antwort. Die wesentlichen pathophysiologischen Zusammenhänge und Notfallmaßnahmen wurden sicher beherrscht.";
      } else if (combinedScore >= 0.35) {
        grade = 3.0;
        gradeText = "Note 3.0 (Befriedigend - Bestanden)";
        passed = true;
        feedback = "Bestanden. Die grundlegenden therapeutischen Schritte sind vorhanden, die Dosierungs- und Leitliniendetails sollten jedoch noch präziser formuliert werden.";
      } else if (combinedScore >= 0.20) {
        grade = 4.0;
        gradeText = "Note 4.0 (Ausreichend - Knapp bestanden)";
        passed = true;
        feedback = "Knapp bestanden. Sie haben die vitalen Gefahren erkannt und schwere Fehler vermieden, die Darstellung wirkte jedoch noch unsicher und lückenhaft.";
      } else {
        grade = 5.0;
        gradeText = "Note 5.0 (Mangelhaft - Nicht bestanden)";
        passed = false;
        feedback = "Nicht bestanden. Zu viele sicherheitsrelevante Kernaspekte, Algorithmen oder Zielwerte wurden ausgelassen.";
      }

      return {
        passed,
        grade,
        gradeText,
        koViolated: false,
        koReason: null,
        combinedScore: parseFloat(combinedScore.toFixed(2)),
        matchRatio: parseFloat(pearlRatio.toFixed(2)),
        matchedPearls,
        missedPearls,
        mandatoryHits,
        totalMandatory,
        examinerFeedback: feedback,
        examinerName: reg && reg.examiner ? reg.examiner.name : "ÄKNO Prüfungskommission Düsseldorf"
      };
    }

    /**
     * Starts a new 4-case oral examination drawn strictly from the 36 authentic Düsseldorf cases
     */
    startNewExam() {
      if (!this.dusQuestions.length) return false;

      // Group 36 cases by 4 clinical pillars
      const pillar1 = this.dusQuestions.filter(q => q.category.includes('Allgemein') || q.category.includes('Atemweg') || q.category.includes('Thorax'));
      const pillar2 = this.dusQuestions.filter(q => q.category.includes('Regional') || q.category.includes('Schmerz') || q.category.includes('Lokalanästhetika') || q.category.includes('Pharmakologie'));
      const pillar3 = this.dusQuestions.filter(q => q.category.includes('Intensiv') || q.category.includes('Sepsis') || q.category.includes('Herz') || q.category.includes('Neuro'));
      const pillar4 = this.dusQuestions.filter(q => q.category.includes('Notfall') || q.category.includes('Kinder') || q.category.includes('Geburtshilfe') || q.category.includes('Transfusion'));

      const pickOne = (arr) => {
        const pool = (arr && arr.length) ? arr : this.dusQuestions;
        return pool[Math.floor(Math.random() * pool.length)];
      };

      this.activeCases = [
        pickOne(pillar1),
        pickOne(pillar2),
        pickOne(pillar3),
        pickOne(pillar4)
      ];

      this.currentCaseIndex = 0;
      this.secondsRemaining = EXAM_DURATION_SECONDS;
      this.isFinished = false;
      this.isActive = true;
      this.scores = [null, null, null, null];

      this.startTimer();
      return true;
    }

    startTimer() {
      this.stopTimer();
      this.timerId = setInterval(() => {
        if (this.secondsRemaining > 0) {
          this.secondsRemaining--;
          if (this.onTickCallback) {
            this.onTickCallback(this.secondsRemaining, this.formatTime());
          }
        } else {
          this.finishExam();
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    formatTime() {
      const mins = Math.floor(this.secondsRemaining / 60);
      const secs = this.secondsRemaining % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    recordCaseScore(caseIndex, ratingOrObj, coveredPearls, totalPearls) {
      if (caseIndex >= 0 && caseIndex < 4) {
        const c = (this.activeCases && this.activeCases[caseIndex]) ? this.activeCases[caseIndex] : {};
        if (typeof ratingOrObj === 'object' && ratingOrObj !== null) {
          this.scores[caseIndex] = {
            caseId: c.id,
            title: c.stem_de || c.question_de,
            ...ratingOrObj
          };
        } else {
          this.scores[caseIndex] = {
            caseId: c.id,
            title: c.stem_de || c.question_de,
            rating: ratingOrObj,
            coveredPearls,
            totalPearls
          };
        }
      }
    }

    nextCase() {
      if (this.currentCaseIndex < 3) {
        this.currentCaseIndex++;
        return true;
      }
      return false;
    }

    finishExam() {
      this.stopTimer();
      this.isFinished = true;
      this.isActive = false;

      let totalRating = 0;
      let ratedCases = 0;
      let hadKO = false;
      let isStarRating = false;

      this.scores.forEach(s => {
        if (s) {
          if (s.koViolated) hadKO = true;
          if (typeof s.rating === 'number') {
            totalRating += s.rating;
            ratedCases++;
            isStarRating = true;
          } else if (typeof s.grade === 'number') {
            totalRating += s.grade;
            ratedCases++;
          }
        }
      });

      const avgRating = ratedCases ? (totalRating / ratedCases) : 0;
      let statusText = 'Nicht bestanden';
      let gradeStr = 'Note 5.0 (Ungenügend)';

      if (hadKO) {
        statusText = '❌ NICHT BESTANDEN (K.O.-KRITERIUM VERLETZT)';
        gradeStr = 'Note 5.0 (Ungenügend)';
      } else if (isStarRating) {
        // Star rating mode (higher is better: 5.0 is top)
        if (avgRating >= 4.5) {
          statusText = '🎉 MIT AUSZEICHNUNG BESTANDEN';
          gradeStr = 'Note 1.0 (Sehr Gut)';
        } else if (avgRating >= 3.8) {
          statusText = '✅ SOUVERÄN BESTANDEN';
          gradeStr = 'Note 2.0 (Gut)';
        } else if (avgRating >= 3.0) {
          statusText = '✅ BESTANDEN';
          gradeStr = 'Note 3.0 (Befriedigend)';
        } else if (avgRating >= 2.5) {
          statusText = '⚠️ KNAPP BESTANDEN';
          gradeStr = 'Note 4.0 (Ausreichend)';
        }
      } else {
        // German ÄKNO Grade mode (lower is better: 1.0 is top)
        if (avgRating <= 1.5 && avgRating > 0) {
          statusText = '🎉 MIT AUSZEICHNUNG BESTANDEN';
          gradeStr = 'Note 1.0 (Sehr Gut)';
        } else if (avgRating <= 2.5 && avgRating > 0) {
          statusText = '✅ SOUVERÄN BESTANDEN';
          gradeStr = 'Note 2.0 (Gut)';
        } else if (avgRating <= 3.5 && avgRating > 0) {
          statusText = '✅ BESTANDEN';
          gradeStr = 'Note 3.0 (Befriedigend)';
        } else if (avgRating <= 4.0 && avgRating > 0) {
          statusText = '⚠️ KNAPP BESTANDEN';
          gradeStr = 'Note 4.0 (Ausreichend)';
        }
      }

      const summary = {
        avgRating: parseFloat(avgRating.toFixed(2)),
        statusText,
        grade: gradeStr,
        hadKO,
        timeSpentSeconds: EXAM_DURATION_SECONDS - this.secondsRemaining,
        scores: this.scores
      };

      if (this.onFinishCallback) {
        this.onFinishCallback(summary);
      }

      return summary;
    }
  }

  MockExamSimulation.MockExamSimulation = MockExamSimulation;
  MockExamSimulation.DUS_SIMULATION_REGISTRY = DUS_SIMULATION_REGISTRY;

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockExamSimulation;
  } else {
    global.MockExamSimulation = MockExamSimulation;
    global.DUS_SIMULATION_REGISTRY = DUS_SIMULATION_REGISTRY;
  }
})(typeof window !== 'undefined' ? window : this);
