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
        trap: "Spinalanästhesie (absolutes K.O.-Kriterium!) oder Tolerieren von Tachykardie"
      },
      speechIntro: "Guten Tag, Herr Kollege. Die Prüfungskommission Düsseldorf stellt Ihnen folgenden Fall vor: Ein 76-jähriger Patient mit hochgradiger symptomatischer Aortenklappenstenose soll sich einer dringlichen laparoskopischen Hemikolektomie unterziehen. Der Operateur fragt, ob eine Spinalanästhesie schonender wäre. Wie lautet Ihre Strategie, welche Zielparameter setzen Sie und warum ist eine Spinalanästhesie absolut kontraindiziert?",
      crisis: {
        title: "⚡ Kreislaufkollaps nach Einleitung!",
        prompt_de: "Achtung, Herr Kollege! Unmittelbar nach Gabe des Narkotikums bricht der Blutdruck dramatisch auf 55/30 mmHg ein, Herzfrequenz 130/min Sinustachykardie! Der Patient wird kreideweiß! Was ist Ihre Sofortmaßnahme in den nächsten 30 Sekunden?!",
        vitals: { spo2: "90%", bp: "55/30", map: "38 mmHg", hr: "130 /min", etco2: "24 mmHg", temp: "36.8 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Sofortiger Bolus Noradrenalin/Phenylephrin zur raschen Wiederherstellung des SVR, Volumen bolusweise, Narkosetiefe reduzieren, Sinusrhythmus sichern!"
      },
      koCriteria: {
        forbiddenPatterns: [/spinal/i, /subarachnoidal/i, /peridural/i, /pda\b/i],
        failureReason: "Eine Spinalanästhesie ist bei schwerer Aortenklappenstenose absolut kontraindiziert! Die akute Sympathikolyse senkt den SVR schlagartig; der feste Stenosequerschnitt verhindert einen kompensatorischen Auswurf -> letale myokardiale Minderperfusion!",
        mandatoryKeywords: ["noradrenalin", "arterie", "sinusrhythmus", "vorlast"]
      }
    },
    q_dus_02: {
      examiner: {
        name: "Prof. Dr. med. Andreas Hohn",
        hospital: "Kliniken der Stadt Köln / Universität zu Köln · Leitender Thoraxanästhesist",
        focus: "Thoraxanästhesie, DLT, Einlungenventilation (OLV), 5-Stufen-Hypoxämieschema",
        trap: "Hektisches Reagieren ohne strukturiertes 5-Stufen-Rettungskonzept"
      },
      speechIntro: "Frau Kollegin, wir sind im Thorax-Saal: Während einer VATS mit linksseitigem Doppellumentubus fällt die SpO2 unter Einlungenventilation rasch von 98% auf 81% ab. Beschreiben Sie bitte das strukturierte 5-Stufen-Rettungsschema bei akuter OLV-Hypoxämie und wie Sie die Tubuslage fiberoptisch verifizieren.",
      crisis: {
        title: "⚡ Akute Dekompensation unter OLV!",
        prompt_de: "Frau Kollegin, trotz FiO2 1,0 sinkt die SpO2 weiter auf 74%! Der Operateur beschwert sich über schlechte Sicht. Was ist der nächste zwingende Schritt in Ihrem Algorithmus?",
        vitals: { spo2: "74%", bp: "95/55", map: "68 mmHg", hr: "118 /min", etco2: "48 mmHg", temp: "36.5 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Fiberoptische Lagekontrolle, CPAP 2-5 cmH2O mit 100% O2 an die nicht-ventilierte Lunge, PEEP-Titration abhängige Lunge!"
      },
      koCriteria: {
        forbiddenPatterns: [/kein cpap/i, /sofort extubieren/i],
        failureReason: "Fehlendes Beherrschen des 5-Stufen-Rettungsplans bei OLV-Hypoxämie gefährdet das Patientenüberleben unmittelbar.",
        mandatoryKeywords: ["fio2", "cpap", "bronchoskop", "peep", "carina"]
      }
    },
    q_dus_03: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, Universitätsklinikum Düsseldorf (UKD)",
        focus: "Schockraum Polytrauma, Schädel-Hirn-Trauma, Ziel-CPP ≥ 60-70 mmHg, ROTEM-Therapie",
        trap: "Permissive Hypotonie bei Schädel-Hirn-Trauma (absolutes K.O.-Kriterium!)"
      },
      speechIntro: "Schockraum Düsseldorf: Ein 34-jähriger Polytraumapatient präsentiert sich mit instabilem Becken, freier Flüssigkeit und schwerem SHT mit GCS 6 und Anisokorie. Blutdruck 75/40 mmHg. Wie lösen Sie das Dilemma zwischen permissiver Hypotonie und neuroprotektiver Perfusion, wie lautet das Tranexamsäure-Regime und wie steuern Sie die Gerinnung mit ROTEM?",
      crisis: {
        title: "⚡ Einklemmungszeichen im Schockraum!",
        prompt_de: "Herr Kollege, die rechte Pupille wird lichtstarr und weit, der Blutdruck fällt auf 65/35 mmHg! Was tun Sie JETZT für das Gehirn und das Becken gleichzeitig?!",
        vitals: { spo2: "86%", bp: "65/35", map: "45 mmHg", hr: "140 /min", etco2: "28 mmHg", temp: "35.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Sofort MAP auf ≥ 80-90 mmHg mit Noradrenalin anheben (CPP ≥ 60-70!), Pelvic Binder anlegen, Osmotherapie (NaCl 3%/Mannitol)!"
      },
      koCriteria: {
        forbiddenPatterns: [/permissiv/i, /hypotonie tolerieren/i, /niedrigen blutdruck/i],
        failureReason: "Permissive Hypotonie ist bei begleitendem schwerem SHT streng kontraindiziert! Der Abfall des MAP führt bei erhöhtem ICP zur irreversiblen ischämischen Hirnstammschädigung!",
        mandatoryKeywords: ["cpp", "map", "tranexamsäure", "pelvic", "becken", "rotem", "fibrinogen"]
      }
    },
    q_dus_04: {
      examiner: {
        name: "Prof. Dr. med. Frank Wappler",
        hospital: "Kliniken der Stadt Köln / Universität Witten/Herdecke · Nationales MH-Referenzzentrum",
        focus: "Maligne Hyperthermie, Hyperkapnie als Frühzeichen, Dantrolen 2,5 mg/kg, Verapamil-Verbot",
        trap: "Gabe von Kalziumantagonisten (K.O.-Kriterium!) oder Verpassen des EtCO2-Anstiegs"
      },
      speechIntro: "Herr Kollege, 15 Minuten nach Narkoseeinleitung mit Sevofluran und Succinylcholin registrieren Sie einen steilen EtCO2-Anstieg von 35 auf 84 mmHg trotz Hyperventilation. Die Herzfrequenz steigt auf 155/min, es besteht Masseterspasmus. Nennen Sie Diagnose, 8-Punkte-Notfallplan, Dantrolen-Dosis und Hyperkaliämietherapie.",
      crisis: {
        title: "⚡ Maligne Krise explodiert!",
        prompt_de: "Das EtCO2 schießt weiter auf 92 mmHg, KKT klettert auf 39,2 °C, EKG zeigt spitze T-Wellen und ventrikuläre Salven! Wie lautet die Dantrolen-Dosis und wie behandeln Sie das Kalium?!",
        vitals: { spo2: "93%", bp: "175/105", map: "128 mmHg", hr: "158 /min", etco2: "92 mmHg", temp: "39.4 °C", rhythm: "Tachykardie + VES", alert: true },
        targetAction: "Dantrolen 2.5 mg/kg i.v. Bolus sofort, Trigger stop, 100% O2, Kalziumglukonat 10 ml + Glukose/Insulin gegen Hyperkaliämie!"
      },
      koCriteria: {
        forbiddenPatterns: [/verapamil/i, /diltiazem/i, /calciumantagonist/i, /kalziumantagonist/i],
        failureReason: "Kalziumkanalblocker sind bei Maligner Hyperthermie streng kontraindiziert! In Kombination mit Dantrolen droht irreversibler Herzstillstand!",
        mandatoryKeywords: ["dantrolen", "trigger", "hyperventilation", "kühlung", "kalium", "insulin"]
      }
    },
    q_dus_05: {
      examiner: {
        name: "ÄKNO Intensivkommission (DIVI)",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfungsgremium Intensivmedizin",
        focus: "Sepsis-3 '1-Hour-Bundle', Noradrenalin Ziel-MAP ≥ 65, ARDS Berlin-Kriterien, Bauchlagerung ≥ 16h",
        trap: "Gabe synthetischer Kolloide (HES) oder Beatmung mit > 6 ml/kg PBW"
      },
      speechIntro: "Ein 68-jähriger Patient wird mit uroseptischem Schock aufgenommen: MAP 52 mmHg, Laktat 4,2 mmol/l. Was beinhaltet das '1-Hour-Bundle' nach Surviving Sepsis, welcher Vasopressor ist 1. Wahl mit welchem Zielwert und wie lauten die ARDS Berlin-Kriterien inklusive Beatmungszielen und Bauchlagerung?",
      crisis: {
        title: "⚡ Refraktäre Hypoxämie auf der Intensivstation!",
        prompt_de: "Der Horovitz-Quotient fällt unter PEEP 14 cmH2O auf 88 mmHg ab! Der Driving Pressure liegt bei 19 cmH2O. Welche lungenprotektiven Maßnahmen und welches Lagerungsmanöver leiten Sie jetzt ein?",
        vitals: { spo2: "82%", bp: "80/45", map: "56 mmHg", hr: "125 /min", etco2: "54 mmHg", temp: "38.9 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Tidalvolumen strikt 6 ml/kg PBW, Driving Pressure ≤ 14 cmH2O, sofortige Bauchlagerung (Prone Positioning) für mindestens 16 Stunden!"
      },
      koCriteria: {
        forbiddenPatterns: [/hes\b/i, /hydroxyethyl/i, /kolloid/i, /10 ml\/kg/i],
        failureReason: "Synthetische Kolloide führen bei Sepsis zu akutem Nierenversagen und erhöhter Letalität! Beatmung über 6 ml/kg PBW induziert Baro-/Volutrauma.",
        mandatoryKeywords: ["laktat", "blutkultur", "antibiotik", "noradrenalin", "6 ml", "bauchlagerung", "horovitz"]
      }
    },
    q_dus_06: {
      examiner: {
        name: "ÄKNO Spezialkommission Geburtshilfe",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Geburtshilfliche Anästhesie",
        focus: "Notsectio EEZ ≤ 20 min, Vena-cava-Syndrom Linksseitenkippung 15-30°, MgSO4 bei Präeklampsie",
        trap: "Vergessen der Linksseitenkippung oder Gabe von Benzodiazepinen statt MgSO4 bei Eklampsie"
      },
      speechIntro: "Notsectio-Alarm im Kreißsaal: Schwangere mit persistierender fetaler Bradykardie (55/min) bei V. a. Plazentalösung. Wie lautet die geforderte Entscheidungs-Entbindungs-Zeit, welche anästhesiologischen Besonderheiten gelten für RSI und Lagerung, und wie behandeln Sie eine schwere Präeklampsie?",
      crisis: {
        title: "⚡ Eklamptischer Anfall im Saal!",
        prompt_de: "Während der Vorbereitung beginnt die Schwangere generalisiert tonisch-klonisch zu krampfen! Blutdruck 210/120 mmHg. Was ist das Mittel der 1. Wahl und welches Antidot muss bereitstehen?!",
        vitals: { spo2: "84%", bp: "210/120", map: "150 mmHg", hr: "145 /min", etco2: "45 mmHg", temp: "37.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Magnesiumsulfat 4-6 g i.v. als Kurzinfusion über 15-20 min, Calciumgluconat 10% als Antidot bereithalten, Linksseitenkippung sichern, zügige RSI!"
      },
      koCriteria: {
        forbiddenPatterns: [/diazepam als 1/i, /dormicum zuerst/i, /flach lagern/i],
        failureReason: "Magnesiumsulfat ist das einzige Mittel der 1. Wahl bei Eklampsie (Benzodiazepine erhöhen perinatale Depression). Fehlende Linksseitenkippung führt zum tödlichen Vena-cava-Kollaps.",
        mandatoryKeywords: ["eez", "linksseitenkippung", "magnesium", "rsi", "calciumgluconat", "urapidil"]
      }
    },
    q_dus_07: {
      examiner: {
        name: "DGAI Kommission Regionalanästhesie",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Referenzprüfer Rückenmarksnahe Regionalanästhesie",
        focus: "Rivaroxaban Karenz 48h, LAST Notfallprotokoll, Intralipid 20% 1,5 ml/kg Bolus",
        trap: "Punktion unter NOAK ohne Karenz oder Vasopressin/Verapamil bei LA-Intoxikation"
      },
      speechIntro: "Eine 64-jährige Patientin unter Rivaroxaban und ASS soll eine Knie-TEP in Spinalanästhesie mit Femoraliskatheter erhalten. Welche Karenzzeiten gelten nach Leitlinie? Wenn es nach Bolusgabe von Ropivacain am Katheter zu Krampfanfall und Arrhythmie kommt: Wie lautet Ihr Notfallprotokoll (LAST) inklusive Lipidtherapie?",
      crisis: {
        title: "⚡ LAST: Herz-Kreislauf-Stillstand!",
        prompt_de: "Herr Kollege, die Patientin krampft, das EKG zeigt breite bizarre Kammerkomplexe, kein Carotispuls mehr tastbar! Nennen Sie sofort die exakte Intralipid-Dosierung und was Sie bei der CPR modifizieren!",
        vitals: { spo2: "60%", bp: "0/0", map: "0 mmHg", hr: "180 /min", etco2: "12 mmHg", temp: "36.4 °C", rhythm: "Breitkomplextachykardie / VF", alert: true },
        targetAction: "LA-Stop, Intralipid 20% Bolus 1.5 ml/kg i.v. über 1 min, dann 0.25 ml/kg/min! Adrenalin reduzieren (< 1 µg/kg), prolongierte CPR > 60 min!"
      },
      koCriteria: {
        forbiddenPatterns: [/vasopressin/i, /lidocain zur therapie/i, /verapamil/i],
        failureReason: "Vasopressin, Lidocain und Kalziumantagonisten sind bei LAST streng kontraindiziert! Adrenalin muss niedrig dosiert werden.",
        mandatoryKeywords: ["rivaroxaban", "48", "lipid", "intralipid", "1,5 ml/kg", "midazolam"]
      }
    },
    q_dus_08: {
      examiner: {
        name: "ÄKNO Pädiatriekommission",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Kinderanästhesie",
        focus: "Laryngospasmus, Larson-Manöver, Succinylcholin IMMER mit Atropin beim Kleinkind, Tubusformel Alter/4 + 3.5",
        trap: "Succinylcholin ohne Atropin beim Kleinkind (Gefahr der vagalen Asystolie!)"
      },
      speechIntro: "Ein 4-jähriges Kind (16 kg) entwickelt unmittelbar nach Extubation nach Tonsillotomie schwere juguläre Einziehungen, Stridor, SpO2-Abfall auf 74% und Bradykardie von 55/min. Beschreiben Sie Differenzialdiagnose, anatomische Besonderheiten, Tubusgrößenformel und den Stufenplan zur Notfallbeherrschung.",
      crisis: {
        title: "⚡ Hypoxische Bradykardie beim Kleinkind!",
        prompt_de: "Trotz CPAP-Maskenbeatmung fällt die Herzfrequenz weiter auf 38/min, das Kind wird zyanotisch! Wie lautet Ihre medikamentöse Notfallkombination und Dosis JETZT?!",
        vitals: { spo2: "62%", bp: "50/25", map: "33 mmHg", hr: "38 /min", etco2: "58 mmHg", temp: "36.7 °C", rhythm: "Schwere Bradykardie", alert: true },
        targetAction: "Succinylcholin 0.5-1.0 mg/kg i.v. zwingend ZUSAMMEN mit Atropin 0.02 mg/kg i.v. (mind. 0.1 mg) zur Verhinderung der vagalen Asystolie!"
      },
      koCriteria: {
        forbiddenPatterns: [/succinylcholin allein/i, /ohne atropin/i],
        failureReason: "Succinylcholin ohne begleitendes Atropin führt beim hypoxischen Kleinkind zur unmittelbaren letalen vagalen Asystolie!",
        mandatoryKeywords: ["laryngospasmus", "larson", "succinylcholin", "atropin", "cpap", "alter/4"]
      }
    },
    q_dus_09: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, Universitätsklinikum Düsseldorf (UKD)",
        focus: "Schockraum Polytrauma & SHT, Beckenfraktur, Tranexamsäure, MAP ≥ 80-90 mmHg",
        trap: "Permissive Hypotonie bei Schädel-Hirn-Trauma"
      },
      speechIntro: "Ein 34-jähriger Motorradfahrer wird nach Hochrasanztrauma eingeliefert: GCS 6, Anisokorie rechts, instabiler Beckenring, RR 75/40 mmHg, SpO2 88%. Wie lösen Sie den Konflikt zwischen permissiver Hypotonie und CPP bei SHT? Erläutern Sie Schockraum-SOP, Narkoseeinleitung und intensivmedizinische Zielkorridore.",
      crisis: {
        title: "⚡ Unkale Herniation droht!",
        prompt_de: "Der Blutdruck fällt auf 60/35 mmHg, die rechte Pupille wird lichtstarr! Der Chirurg will erst auf die Röntgen-Thorax warten. Was ist Ihre Sofortentscheidung?",
        vitals: { spo2: "85%", bp: "60/35", map: "43 mmHg", hr: "135 /min", etco2: "29 mmHg", temp: "35.0 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Kein Zeitverlust! Sofort Beckenschlinge anlegen, Noradrenalin auf Ziel-MAP ≥ 80-90 mmHg titrieren, RSI mit Ketamin/Rocuronium, Notfall-CT Kopf/Becken!"
      },
      koCriteria: {
        forbiddenPatterns: [/permissive hypotonie/i, /niedrigen blutdruck tolerieren/i],
        failureReason: "Permissive Hypotonie bei SHT ist ein sofortiges K.O.-Kriterium in Düsseldorf! MAP muss mindestens 80-90 mmHg betragen.",
        mandatoryKeywords: ["map", "cpp", "beckenschlinge", "pelvic", "ketamin", "tranexamsäure"]
      }
    },
    q_dus_10: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Karotis-TEA, zervikale Plexusblockade, NIRS/Shunt-Indikation, akutes Wundhämatom am Bett eröffnen",
        trap: "Warten auf OP-Saal bei akutem Hals-Wundhämatom (K.O.-Kriterium - Ersticken!)"
      },
      speechIntro: "Bei einem 68-jährigen Patienten soll eine Karotis-TEA durchgeführt werden. Vergleichen Sie Allgemeinanästhesie vs. zervikale Plexusblockade, erläutern Sie das perioperative Neuromonitoring, Shunt-Kriterien sowie das Notfallmanagement eines akuten postoperativen Hals-Wundhämatoms.",
      crisis: {
        title: "⚡ Akute Erstickungsgefahr im Aufwachraum!",
        prompt_de: "Im Aufwachraum schwillt der Hals innerhalb von 2 Minuten prall-elastisch an! Der Patient ringt nach Luft, SpO2 stürzt auf 70%! Die Pflege will den OP anrufen. Was tun Sie in DIESER Sekunde?",
        vitals: { spo2: "70%", bp: "190/100", map: "130 mmHg", hr: "130 /min", etco2: "55 mmHg", temp: "36.8 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "SOFORTIGE Naht- und Faszieneröffnung am Bett mit der Schere! Keine Zeit vergeuden mit Transport oder OP-Rufen vor Dekompression!"
      },
      koCriteria: {
        forbiddenPatterns: [/warten auf den op/i, /in den op transportieren vor eröffnung/i],
        failureReason: "Warten auf den OP-Saal bei akutem Hals-Wundhämatom nach Karotis-TEA führt zur Erstickung durch Larynxkompression! Die Wunde MUSS am Bett sofort eröffnet werden!",
        mandatoryKeywords: ["bett", "nahtöffnung", "eröffnen", "zervikoplexus", "shunt", "nirs"]
      }
    },
    q_dus_11: {
      examiner: {
        name: "Prof. Dr. med. Frank Wappler",
        hospital: "Kliniken der Stadt Köln / Nationales MH-Zentrum",
        focus: "Phäochromozytom, Alpha- vor Betablockade (Roizen-Kriterien), Urapidil intraoperativ, Noradrenalin nach Ligatur",
        trap: "Gabe von Betablockern vor Alphablockern (sofortiges Nichtbestehen!)"
      },
      speechIntro: "Eine 45-jährige Patientin mit paroxysmaler Hypertonie und 5 cm Nebennierenraumforderung (Phäochromozytom) wird vorgestellt. Erläutern Sie die präoperative Vorbereitung (Roizen-Kriterien), die Narkoseführung und das Management der extremen hämodynamischen Schwankungen.",
      crisis: {
        title: "⚡ Hypertensive Krise bei Tumormanipulation!",
        prompt_de: "Der Operateur manipuliert am Tumor: Der Blutdruck explodiert auf 250/135 mmHg, Herzfrequenz 145/min! Welches vasodilatierende Akutmedikament spritzen Sie sofort?",
        vitals: { spo2: "97%", bp: "250/135", map: "173 mmHg", hr: "145 /min", etco2: "38 mmHg", temp: "37.0 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Urapidil (Ebrantil 12.5-25 mg i.v.), Phentolamin oder Nitroprussid; Esmolol erst NACH Alpha-Blockade! Nach Venenligatur Noradrenalin bereitstellen!"
      },
      koCriteria: {
        forbiddenPatterns: [/betablocker vor alpha/i, /erst betablocker/i, /metoprolol zuerst/i],
        failureReason: "Betablocker vor Alphablockern beim Phäochromozytom blockieren Beta-2-Vasodilation bei ungehemmter Alpha-1-Stimulation -> letales Lungenödem!",
        mandatoryKeywords: ["phenoxybenzamin", "roizen", "urapidil", "phentolamin", "noradrenalin"]
      }
    },
    q_dus_12: {
      examiner: {
        name: "ÄKNO Spezialkommission Geburtshilfe",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Spezielle Geburtshilfe",
        focus: "HELLP-Syndrom, Notsectio, Thrombozytopenie < 50.000/µl, Magnesiumsulfat",
        trap: "Spinalanästhesie bei Thrombozyten < 50.000/µl (Kardinalfehler!)"
      },
      speechIntro: "Eine 32-jährige Schwangere (34. SSW) mit HELLP-Syndrom (Thrombozyten 38.000/µl, RR 190/115 mmHg) benötigt eine sofortige Notsectio wegen fetaler Bradykardie. Welches Anästhesieverfahren wählen Sie, warum scheidet eine Spinalanästhesie aus und wie lauten Ihre Schritte?",
      crisis: {
        title: "⚡ Druckabfall und fetale Dezeleration!",
        prompt_de: "Frau Kollegin, der Gynäkologe verlangt eine Spinalanästhesie, um Zeit zu sparen. Wie reagieren Sie juristisch und medizinisch, und welche Einleitung führen Sie durch?",
        vitals: { spo2: "92%", bp: "195/118", map: "143 mmHg", hr: "115 /min", etco2: "35 mmHg", temp: "37.1 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "Kategorie-1-Notsectio in VOLLNARKOSE (RSI mit Sellick und Rocuronium/Succinylcholin)! Spinalanästhesie strikt ablehnen (Gefahr spinales Hämatom und Querschnitt)!"
      },
      koCriteria: {
        forbiddenPatterns: [/spinalanästhesie durchführen/i, /pda stechen/i, /spinalanästhesie wähle/i],
        failureReason: "Spinal- und Periduralanästhesie sind bei Thrombozyten < 50.000/µl wegen des Risikos eines raumfordernden spinalen Hämatoms mit permanenter Paraplegie streng verboten!",
        mandatoryKeywords: ["kontraindiziert", "hämatom", "vollnarkose", "rsi", "magnesium", "linksseitenkippung"]
      }
    },
    q_dus_13: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "TRALI vs. TACO, Permeabilitätsödem vs. Volumenüberladung, Furosemid-Verbot bei TRALI",
        trap: "Gabe von Furosemid bei TRALI (K.O.-Kriterium - hypovolämischer Schock!)"
      },
      speechIntro: "Ein 62-jähriger Patient entwickelt 25 Minuten nach FFP-Transfusion akuten SpO2-Abfall auf 78%, Anstieg des Pmax auf 38 mbar, schaumiges Trachealsekret und bilaterale Infiltrate. Wie differenzieren Sie TRALI vs. TACO und wie gestalten Sie die Akuttherapie?",
      crisis: {
        title: "⚡ Respiratorische Katastrophe nach Transfusion!",
        prompt_de: "Der Weiterbildungsassistent schlägt 40 mg Furosemid i.v. vor. Der Blutdruck liegt bei 85/50 mmHg. Stimmen Sie zu oder widersprechen Sie und warum?",
        vitals: { spo2: "78%", bp: "85/50", map: "61 mmHg", hr: "125 /min", etco2: "48 mmHg", temp: "38.6 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Widerspruch! Furosemid ist bei TRALI kontraindiziert (Permeabilitätsödem ohne Vorlastüberhang)! Transfusionsstopp, Lungenprotektion Vt 6 ml/kg PBW, Kreislaufstützung Noradrenalin!"
      },
      koCriteria: {
        forbiddenPatterns: [/furosemid bei trali/i, /lasix geben/i],
        failureReason: "TRALI ist ein immunologisches Permeabilitätsödem; die Patienten sind oft hypovoläm. Diuretika führen zum schweren distributiven Kreislaufschock!",
        mandatoryKeywords: ["transfusionsstopp", "permeabilität", "ards", "noradrenalin", "taco"]
      }
    },
    q_dus_14: {
      examiner: {
        name: "ÄKNO Spezialkommission Pädiatrie",
        hospital: "Ärztekammer Nordrhein (Düsseldorf) · Fachprüfer Kinderanästhesie",
        focus: "Fremdkörperaspiration, Inhalative Einleitung unter Erhalt der Spontanatmung, Relaxanzien-Verbot",
        trap: "Verabreichung von Muskelrelaxanzien bei tracheobronchialem Fremdkörper (sofortiger K.O.!)"
      },
      speechIntro: "Ein 2-jähriges Kleinkind (12 kg) wird mit V. a. Erdnussaspiration vorgestellt. Warum ist die Narkoseeinleitung unter Erhalt der Spontanatmung der Goldstandard, welche Medikamente setzen Sie ein und welche Komplikationen drohen bei Narkoseeinleitung mit Muskelrelaxanzien?",
      crisis: {
        title: "⚡ Erdnuss verlegt die Trachea!",
        prompt_de: "Das Kind wird im Saal unruhig, der Stridor wird leiser, Thoraxexkursionen versiegen, SpO2 fällt auf 72%! Ein Kollege ruft: 'Gib schnell Rocuronium und drück mit der Maske rein!' Was tun Sie?!",
        vitals: { spo2: "72%", bp: "70/40", map: "50 mmHg", hr: "65 /min", etco2: "62 mmHg", temp: "36.8 °C", rhythm: "Sinusbradykardie", alert: true },
        targetAction: "KEIN Relaxans! Starre Bronchoskopie unter Spontanatmung sofort einführen, Fremdkörper mit optischer Zange bergen! Masken-Überdruckbeatmung würde Erdnuss verkeilen!"
      },
      koCriteria: {
        forbiddenPatterns: [/rocuronium geben/i, /relaxieren/i, /succinylcholin spritzen/i],
        failureReason: "Muskelrelaxanzien und Überdruckbeatmung bei liegendem Trachealfremdkörper führen zum totalen Ventilverschluss (Cannot Ventilate, Cannot Oxygenate) oder Spannungspneumothorax!",
        mandatoryKeywords: ["spontanatmung", "sevofluran", "kein relaxans", "starre bronchoskopie", "atropin"]
      }
    },
    q_dus_15: {
      examiner: {
        name: "Prof. Dr. med. Andreas Hohn",
        hospital: "Kliniken der Stadt Köln / Universität zu Köln",
        focus: "ICD vs. Herzschrittmacher, Magnetwirkung, externe Defibrillationspads vor Schnitt, Kauterisation",
        trap: "Annahme, der Magnet mache den ICD schrittmacher-asynchron (K.O.-Fehlannahme!)"
      },
      speechIntro: "Ein 73-jähriger Patient mit koronarer Herzkrankheit und 2-Kammer-ICD soll sich einer laparoskopischen Rektumresektion mit Hochfrequenz-Chirurgie unterziehen. Erläutern Sie das Vorgehen: Was bewirkt ein Magnet beim ICD im Vergleich zum Schrittmacher und wie reagieren Sie bei intraoperativem Kammerflimmern?",
      crisis: {
        title: "⚡ Kammerflimmern unter Kauterisation!",
        prompt_de: "Der Ringmagnet liegt auf dem ICD: Plötzlich entsteht Kammerflimmern im EKG! Was tun Sie in den ersten 5 Sekunden?!",
        vitals: { spo2: "65%", bp: "0/0", map: "0 mmHg", hr: "0 /min", etco2: "10 mmHg", temp: "36.2 °C", rhythm: "Kammerflimmern (VF)", alert: true },
        targetAction: "Kauter sofort stoppen! Ringmagnet sofort abziehen (ICD reaktiviert Schockfunktion) ODER unmittelbare manuelle Defibrillation mit den präoperativ geklebten Pads!"
      },
      koCriteria: {
        forbiddenPatterns: [/magnet macht asynchron beim icd/i, /icd schlägt im voo/i],
        failureReason: "Ein Magnet schaltet beim ICD NUR die Schocktherapie ab, nicht die Schrittmacherfunktion in den asynchronen Modus! Schrittmacherabhängige ICD-Patienten müssen umprogrammiert werden.",
        mandatoryKeywords: ["magnet", "deaktiviert schock", "klebepads", "defibrillator", "bipolar"]
      }
    },
    q_dus_16: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Chronische Niereninsuffizienz, Muskelrelaxanzien, Succinylcholin-Hyperkaliämie, Sugammadex",
        trap: "Gabe von Succinylcholin bei Dialysepatienten mit Hyperkaliämie (K.O. - Herzstillstand!)"
      },
      speechIntro: "Eine 65-jährige Dialysepatientin (Stadium Vd) benötigt eine Notfall-Laparotomie bei Ileus. Kalium liegt bei 5,6 mmol/l. Wie gestalten Sie die RSI, welche Muskelrelaxanzien sind geeignet oder kontraindiziert und wie dosieren Sie Sugammadex?",
      crisis: {
        title: "⚡ Spitze T-Wellen und Bradykardie!",
        prompt_de: "Nach Einleitung klettert das Kalium in der BGA auf 6,8 mmol/l, QRS-Komplexe verbreitern sich! Wie lautet die kardioprotektive Soforttherapie?",
        vitals: { spo2: "95%", bp: "75/40", map: "51 mmHg", hr: "48 /min", etco2: "36 mmHg", temp: "36.5 °C", rhythm: "Schenkelblockbreit", alert: true },
        targetAction: "10 ml Calciumgluconat 10% langsam i.v. zur Membranstabilisierung, Glukose 20% + Altinsulin, Hyperventilation, Natriumbikarbonat!"
      },
      koCriteria: {
        forbiddenPatterns: [/succinylcholin geben/i, /suxamethonium bei ileus/i],
        failureReason: "Succinylcholin erhöht den Serumkaliumspiegel um 0,5-1,0 mmol/l; bei vorbestehender Hyperkaliämie führt dies zur unmittelbaren Asystolie!",
        mandatoryKeywords: ["succinylcholin kontraindiziert", "rocuronium", "calciumgluconat", "sugammadex", "hyperkaliämie"]
      }
    },
    q_dus_17: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Schwieriger Atemweg, Adipositas per magna, CICO-Algorithmus, eFONA Skalpell-Koniotomie",
        trap: "Mehr als 3 Intubationsversuche ohne Larynxmaske oder Zögern bei eFONA"
      },
      speechIntro: "Ein 52-jähriger adipöser Patient (BMI 38 kg/m²) soll narkotisiert werden. Nach Einleitung gelingt die Maskenbeatmung nicht, Videolaryngoskopie Cormack IV, Larynxmaske scheitert: SpO2 65%. Beschreiben Sie den DGAI-Atemwegsalgorithmus und die Koniotomie.",
      crisis: {
        title: "⚡ Cannot Intubate, Cannot Oxygenate (CICO)!",
        prompt_de: "SpO2 fällt auf 54%, Herzfrequenz 35/min! Die Koniotomie muss in 20 Sekunden stehen. Welches Werkzeug nehmen Sie und wie führen Sie den Schnitt?",
        vitals: { spo2: "54%", bp: "50/25", map: "33 mmHg", hr: "35 /min", etco2: "15 mmHg", temp: "36.7 °C", rhythm: "Bradykardie", alert: true },
        targetAction: "eFONA nach DGAI: Skalpell quer durch Lig. cricothyroideum, 90° Drehung, Bougie vorschieben, 6.0 mm Tubus über Bougie in die Trachea!"
      },
      koCriteria: {
        forbiddenPatterns: [/weiter mit laryngoskop versuchen/i, /auf hno-arzt warten/i],
        failureReason: "Zögern bei CICO führt binnen Minuten zum hypoxischen Hirntod. Die Koniotomie ist unverzüglich durchzuführen!",
        mandatoryKeywords: ["cico", "koniotomie", "skalpell", "bougie", "cricothyroid", "efona"]
      }
    },
    q_dus_18: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "Laparoskopie, CO2-Embolie, Mühlenradgeräusch, Durant-Manöver (Kopftief-Linksseitenlage)",
        trap: "Fortführen der Laparoskopie bei akuter Gasembolie"
      },
      speechIntro: "Während laparoskopischer Cholezystektomie stürzt das EtCO2 plötzlich von 38 auf 11 mmHg ab. Blutdruck 60/30 mmHg, im Stethoskop Mühlenradgeräusch. Erläutern Sie Pathophysiologie, Differenzialdiagnose und Sofortmaßnahmen der venösen CO2-Gasembolie.",
      crisis: {
        title: "⚡ Kreislaufstillstand durch Gasembolie!",
        prompt_de: "Der Patient entwickelt eine pulslose elektrische Aktivität (PEA)! Was befehlen Sie dem Operateur und wie lagern Sie den Patienten sofort um?",
        vitals: { spo2: "62%", bp: "0/0", map: "0 mmHg", hr: "140 /min", etco2: "8 mmHg", temp: "36.6 °C", rhythm: "PEA", alert: true },
        targetAction: "Sofortige Desufflation des Abdomens! 100% O2, Durant-Manöver (Kopftieflage + Linksseitenlage zur Verlagerung der Gasblase aus dem RVOT), CPR starten!"
      },
      koCriteria: {
        forbiddenPatterns: [/weiter operieren/i, /kopfhochlagerung/i],
        failureReason: "Kopfhochlagerung begünstigt paradoxe zerebrale Embolien; Unterlassen der Desufflation führt zum persistierenden Verschluss des Ausflusstrakts.",
        mandatoryKeywords: ["desufflation", "durant", "linksseitenlage", "100%", "gasembolie"]
      }
    },
    q_dus_19: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Intravenöse Regionalanästhesie (Bier-Block), Prilocain vs. Lidocain, Manschettensicherheit, Mindestzeit 20 min",
        trap: "Öffnen der Manschette vor Ablauf von 20 Minuten (K.O.-Kriterium - letale LAST!)"
      },
      speechIntro: "Eine 44-jährige Patientin erhält für eine Radiusfraktur eine intravenöse Regionalanästhesie (Bier-Block) mit Prilocain 0,5% 40 ml. Welche Sicherheitsregeln gelten für die Doppelmanschette und warum darf die Manschette keinesfalls vor 20 Minuten geöffnet werden?",
      crisis: {
        title: "⚡ Akuter Druckverlust der Manschette nach 12 Minuten!",
        prompt_de: "Nach 12 Minuten meldet die Manschette Druckabfall! Die Patientin äußert metallischen Geschmack, Schwindel und fängt an zu zucken! Was ist Ihre Rettungskette?",
        vitals: { spo2: "88%", bp: "80/45", map: "56 mmHg", hr: "125 /min", etco2: "44 mmHg", temp: "36.8 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "Manschette sofort wieder aufpumpen! 100% O2, Midazolam zur Krampfdurchbrechung, Intralipid 20% Rescue-Kit anfordern!"
      },
      koCriteria: {
        forbiddenPatterns: [/manschette nach 10 min öffnen/i, /bupivacain für bier-block/i],
        failureReason: "Bupivacain ist für IVRA wegen extremer Kardiotoxizität streng verboten! Vorzeitiges Öffnen vor 20 Minuten schwemmt freies Lokalanästhetikum ungebunden in den Kreislauf.",
        mandatoryKeywords: ["prilocain", "20 minuten", "doppelmanschette", "lipid", "met-hämoglobin"]
      }
    },
    q_dus_20: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "Septischer Schock, Vasopressor-Eskalation, Vasopressin 0,03 IE/min, Hydrocortison 200 mg",
        trap: "Gabe von Dopamin statt Noradrenalin als First-Line-Vasopressor"
      },
      speechIntro: "Ein 68-jähriger Patient im septischen Schock benötigt bereits 0,35 µg/kg/min Noradrenalin für einen MAP von 58 mmHg. Wie eskalieren Sie die Schocktherapie nach Surviving Sepsis, welche Rolle spielen Vasopressin, Hydrocortison und Inodilatatoren?",
      crisis: {
        title: "⚡ Refraktärer Vasoplegie-Schock!",
        prompt_de: "Trotz 0,5 µg/kg/min Noradrenalin fällt der MAP auf 50 mmHg ab, Laktat steigt auf 6,5 mmol/l. Was hängen Sie jetzt sofort als zweiten Vasopressor an?",
        vitals: { spo2: "90%", bp: "70/40", map: "50 mmHg", hr: "135 /min", etco2: "32 mmHg", temp: "38.8 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "Vasopressin (Argipressin) mit fixer Rate von 0.03 IE/min starten + Hydrocortison 200 mg/Tag i.v. bei refraktärem Schock!"
      },
      koCriteria: {
        forbiddenPatterns: [/dopamin als 1/i, /vasopressin hochtitrieren/i],
        failureReason: "Dopamin erhöht Tachyarrhythmien und Mortalität. Vasopressin darf nicht über 0,03-0,04 IE/min titriert werden (Gefahr mesenterialer Ischämie).",
        mandatoryKeywords: ["noradrenalin", "vasopressin", "0,03", "hydrocortison", "laktat", "map >= 65"]
      }
    },
    q_dus_21: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Schädel-Hirn-Trauma, Hirndrucktherapie, NaCl 3% vs. Mannitol, Normokapnie PaCO2 35-38",
        trap: "Aggressive prophylaktische Hyperventilation (PaCO2 < 30 mmHg - K.O. Hirnischämie!)"
      },
      speechIntro: "Ein 24-jähriger Motorradfahrer mit schwerem SHT liegt intubiert im OP: ICP steigt auf 28 mmHg, MAP 75 mmHg. Erläutern Sie das Stufenschema zur Senkung des intrakraniellen Drucks und warum prophylaktische tiefe Hyperventilation schädlich ist.",
      crisis: {
        title: "⚡ Einklemmungsdruck ICP 35 mmHg!",
        prompt_de: "Der ICP springt auf 35 mmHg, Pupillen werden träge. Der Kollege will den Beatmer auf PaCO2 25 mmHg drehen. Stimmen Sie zu und was verabreichen Sie?",
        vitals: { spo2: "98%", bp: "140/85", map: "103 mmHg", hr: "52 /min", etco2: "36 mmHg", temp: "37.0 °C", rhythm: "Cushing-Bradykardie", alert: true },
        targetAction: "Widerspruch gegen tiefe Hyperventilation (zerebrale Vasokonstriktion induziert Ischämie)! NaCl 3% Bolus 2 ml/kg oder Mannitol 20% 0.5-1 g/kg, Oberkörper 30° hoch, Sedierung vertiefen!"
      },
      koCriteria: {
        forbiddenPatterns: [/paco2 unter 30/i, /dauerhafte hyperventilation/i],
        failureReason: "Dauerhafte Hyperventilation (PaCO2 < 30 mmHg) führt über exzessive Vasokonstriktion zur ischämischen Hirngewebsnekrose!",
        mandatoryKeywords: ["osmose", "nacl 3%", "mannitol", "normokapnie", "oberkörper 30°", "icp"]
      }
    },
    q_dus_22: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Postpartale Blutung (PPH), Uterusatonie, Sulproston-Perfusor, Fibrinogen, Tranexamsäure",
        trap: "Sulproston als unverdünnter schneller Bolus (K.O.-Kriterium - Koronarspasmen und Herzstillstand!)"
      },
      speechIntro: "Nach unkomplizierter Spontangeburt kommt es zur massiven vaginalen Blutung (> 1500 ml). Der Uterus ist weich und atonisch. Wie lautet Ihr medikamentöser Stufenplan (Oxytocin, Sulproston), welche Koagulopathie-Therapie leiten Sie ein und wie wird Sulproston appliziert?",
      crisis: {
        title: "⚡ Hämorrhagischer Schock im Kreißsaal!",
        prompt_de: "Die Hebamme reicht eine Nalador-Ampulle (Sulproston 500 µg) und fragt: 'Soll ich das schnell als Bolus in die Viggo spritzen?' Was antworten Sie und wie wird es richtig gegeben?",
        vitals: { spo2: "91%", bp: "70/35", map: "46 mmHg", hr: "142 /min", etco2: "26 mmHg", temp: "35.5 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "STOPP! Niemals als Bolus! Sulproston darf NUR langsam über Perfusor infundiert werden (Gefahr letaler Koronarspasmen)! Tranexamsäure 1g i.v. + Fibrinogen sofort!"
      },
      koCriteria: {
        forbiddenPatterns: [/sulproston als bolus/i, /nalador schnell spritzen/i],
        failureReason: "Sulproston als schneller Bolus führt zu fatalen Koronarspasmen, Myokardinfarkt und Kreislaufkollaps!",
        mandatoryKeywords: ["oxytocin", "sulproston perfusor", "tranexamsäure", "fibrinogen", "b-lynch"]
      }
    },
    q_dus_23: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "Pneumonektomie, Rechtsherzüberlastung, restriktives Flüssigkeitsregime, PEEP niedrig",
        trap: "Großzügige Volumengabe (K.O. - postpneumonektomisches Lungenödem mit hoher Mortalität!)"
      },
      speechIntro: "Bei einer 62-jährigen Patientin wird eine Pneumonektomie links durchgeführt. Warum ist das Flüssigkeitsregime bei Pneumonektomie streng restriktiv zu halten und wie verhindern Sie eine postoperative Rechtsherzdekompensation?",
      crisis: {
        title: "⚡ Akutes Rechtsherzversagen nach Gefäßligatur!",
        prompt_de: "Nach Abklemmen der Pulmonalarterie steigt der ZVD steil auf 18 mmHg, MAP fällt auf 50 mmHg ab. Was unternehmen Sie?",
        vitals: { spo2: "89%", bp: "75/45", map: "55 mmHg", hr: "115 /min", etco2: "30 mmHg", temp: "36.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Flüssigkeit sofort drosseln! Noradrenalin zur MAP-Sicherung, Dobutamin oder Milrinon zur Inotropie, PEEP niedrig halten (< 5-7 cmH2O)!"
      },
      koCriteria: {
        forbiddenPatterns: [/volumenbolus geben/i, /großzügig kristalloide/i],
        failureReason: "Übermäßige Volumengabe führt bei reduzierter vaskulärer Lungenstrombahn zum tödlichen postpneumonektomischen Lungenödem!",
        mandatoryKeywords: ["restriktiv", "lungenödem", "rechtsherz", "noradrenalin", "peep niedrig"]
      }
    },
    q_dus_24: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Pädiatrische Nachblutung (Adenotomie/Tonsillotomie), 'Magen voller Blut', RSI mit gecufftem Tubus",
        trap: "Narkoseeinleitung in Rückenlage ohne Vorbereitung auf massive Blutaspiration"
      },
      speechIntro: "Ein 3-jähriges Kind (14 kg) wird 4 Stunden nach Adenotomie mit Bluterbrechen und Schockzeichen vorgestellt. Schildern Sie das sekundengenaue Vorgehen: Vorbereitung, Lagerung, Einleitung und warum dieser Fall zu den gefährlichsten Kindernarkosen zählt.",
      crisis: {
        title: "⚡ Massives Bluterbrechen bei Einleitung!",
        prompt_de: "Beim Vorhalten der Maske erbricht das Kind schwallartig 200 ml Kaffeesatz- und Frischblut! Das Absaugglas ist voll. Wie sichern Sie sofort den Atemweg?",
        vitals: { spo2: "75%", bp: "65/35", map: "45 mmHg", hr: "155 /min", etco2: "32 mmHg", temp: "36.1 °C", rhythm: "Tachykardie", alert: true },
        targetAction: "Sofort Kopf tief und Linksseitenlage! Zwei funktionierende Absauger parallel, RSI mit gecufftem Tubus unter Sicht (Videolaryngoskop), Magensonde vor Extubation!"
      },
      koCriteria: {
        forbiddenPatterns: [/ungecufften tubus wählen/i, /ohne absauger einleiten/i],
        failureReason: "Aspiration von Koageln führt zur letalen Asphyxie. Ein gecuffter Tubus und doppelte Absaugbereitschaft sind zwingend!",
        mandatoryKeywords: ["voller magen", "blut", "rsi", "gecufft", "absauger", "magensonde"]
      }
    },
    q_dus_25: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Schrittmacher, Magnetwirkung, monopolare Elektrokauterisation, Strompfad-Sicherheit",
        trap: "Neutralelektrode so anbringen, dass Strompfad über das Aggregat fließt"
      },
      speechIntro: "Ein 72-jähriger schrittmacherabhängiger Patient wird zur TUR-Blase mit monopolarer Kauterisation vorgestellt. Wie verhält sich der Schrittmacher bei Magnetauflage, wo platzieren Sie die Neutralelektrode und wie schützen Sie den Patienten vor Asystolie?",
      crisis: {
        title: "⚡ Kauter-Inhibition führt zur Asystolie!",
        prompt_de: "Der Operateur aktiviert den Kauter: Der Monitor zeigt Asystolie durch elektromagnetische Interferenz! Was ist der unmittelbare Handgriff?",
        vitals: { spo2: "94%", bp: "0/0", map: "0 mmHg", hr: "0 /min", etco2: "14 mmHg", temp: "36.5 °C", rhythm: "Asystolie", alert: true },
        targetAction: "Kauter sofort stoppen! Ringmagnet auflegen (Schrittmacher schaltet in asynchronen Starrfrequenzmodus VOO/DOO mit 85-100/min)!"
      },
      koCriteria: {
        forbiddenPatterns: [/neutralelektrode am thorax anbringen/i],
        failureReason: "Ein Strompfad über das Aggregat kann den Schrittmacher zerstören oder Myokardverbrennungen an der Sondenspitze verursachen.",
        mandatoryKeywords: ["magnet", "asynchron", "voo", "doo", "neutralelektrode", "bipolar"]
      }
    },
    q_dus_26: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Direkte orale Antikoagulanzien (DOAK), Apixaban (Eliquis), Karenzzeiten nach DGAI/ÖGARI",
        trap: "Durchführung einer Spinalanästhesie unter Apixaban vor Ablauf von mind. 48-72h"
      },
      speechIntro: "Eine 78-jährige Patientin unter therapeutischer Antikoagulation mit Apixaban (5 mg 1-0-1) soll wegen einer Schenkelhalsfraktur versorgt werden. Letzte Einnahme vor 18 Stunden. GFR 45 ml/min. Welche Optionen haben Sie bezüglich Anästhesieverfahren und Karenzzeiten?",
      crisis: {
        title: "⚡ Operateur drängt auf vorzeitige Spinalpunktion!",
        prompt_de: "Der Chirurg sagt: 'Ich brauche eine Spinalanästhesie in 30 Minuten, der Saal ist frei!' Wie begründen Sie Ihre Entscheidung rechtlich und leitliniengerecht?",
        vitals: { spo2: "96%", bp: "145/85", map: "105 mmHg", hr: "78 /min", etco2: "36 mmHg", temp: "36.6 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "Spinalanästhesie strikt verweigern! Nach DGAI-Leitlinie sind bei GFR < 50 ml/min mindestens 72h Pause nötig. Operation in Vollnarkose durchführen!"
      },
      koCriteria: {
        forbiddenPatterns: [/spinalanästhesie nach 18h stechen/i, /pda anlegen/i],
        failureReason: "Eine rückenmarksnahe Punktion unter therapeutischem DOAK führt zum spinalen Epiduralhämatom mit irreversibler Querschnittslähmung!",
        mandatoryKeywords: ["48 stunden", "72 stunden", "apixaban", "dgai", "spinalhämatom", "vollnarkose"]
      }
    },
    q_dus_27: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Phäochromozytom Ligatur-Hypotonie, Vasoplegie, Noradrenalin, Volumensubstitution",
        trap: "Unterlassen der Noradrenalin-Bereitstellung vor Ligatur der Vena centralis"
      },
      speechIntro: "Bei einer laparoskopischen Adrenalektomie wegen Phäochromozytom wird die Vena centralis glandulae suprarenalis abgeklemmt. Warum kommt es genau in dieser Sekunde zum extremen Blutdruckabfall und wie steuern Sie den Übergang therapeutisch?",
      crisis: {
        title: "⚡ Kreislaufsturz nach Ligatur der Tumorvene!",
        prompt_de: "Der Clip sitzt auf der Nebennierenvene: Binnen 10 Sekunden stürzt der Blutdruck von 160/90 auf 45/25 mmHg ab! Welche beiden Maßnahmen ergreifen Sie sofort?",
        vitals: { spo2: "92%", bp: "45/25", map: "31 mmHg", hr: "110 /min", etco2: "22 mmHg", temp: "36.4 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "Sofort Noradrenalin-Perfusor hochdosiert starten (ggf. Vasopressin) + rasche Druckinfusion von Kristalloiden zum Ausgleich der relativen Hypovolämie!"
      },
      koCriteria: {
        forbiddenPatterns: [/weiter vasodilatatoren geben/i],
        failureReason: "Nach Venenligatur entfällt der endogene Katecholaminstrom schlagartig; bei herabregulierten Alpha-Rezeptoren droht der letale Schock ohne Vasopressoren.",
        mandatoryKeywords: ["ligatur", "noradrenalin", "volumen", "downregulation", "vasopressin"]
      }
    },
    q_dus_28: {
      examiner: {
        name: "Prof. Dr. med. J. Peters",
        hospital: "Universität Duisburg-Essen / ÄKNO Prüfungsausschuss",
        focus: "TUR-Syndrom, Hypotone Hyperhydratation, Hyponatriämie, ODS-Prävention (max. 8 mmol/l/d)",
        trap: "Zu rasche Natriumkorrektur mit Gefahr der pontinen Myelinolyse (ODS)"
      },
      speechIntro: "Ein 71-jähriger Patient wird während einer transurethralen Prostataresektion (TURP) unter Spinalanästhesie plötzlich unruhig, verwirrt, klagt über Engegefühl und wird bradykard. Serum-Natrium liegt bei 112 mmol/l. Beschreiben Sie Diagnose, Pathophysiologie und das strikte Korrekturregime.",
      crisis: {
        title: "⚡ Krampfanfall bei schwerem TURP-Syndrom!",
        prompt_de: "Der Patient krampft generalisiert auf dem OP-Tisch, Na+ 110 mmol/l! Der Urologe will noch 15 Minuten weiterschneiden. Was befehlen Sie und wie korrigieren Sie das Natrium?",
        vitals: { spo2: "86%", bp: "185/110", map: "135 mmHg", hr: "42 /min", etco2: "45 mmHg", temp: "35.8 °C", rhythm: "Bradykardie", alert: true },
        targetAction: "Resektion SOFORT abbrechen! Krampfdurchbrechung, NaCl 3% als Kurzinfusion zur Symptomkontrolle, Natriumkorrektur strikt auf maximal 8-10 mmol/l pro 24h limitieren (ODS-Schutz)!"
      },
      koCriteria: {
        forbiddenPatterns: [/natrium um 20 mmol schnell heben/i, /weiter operieren/i],
        failureReason: "Eine zu schnelle Natriumkorrektur (> 8-10 mmol/l in 24h) führt zur irreversiblen osmotischen Demyelinisierung (pontine Myelinolyse) mit Locked-in-Syndrom!",
        mandatoryKeywords: ["tur-syndrom", "hyponatriämie", "nacl 3%", "ods", "myelinolyse", "abbruch"]
      }
    },
    q_dus_29: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Hypertrophe Pylorusstenose, hypochlorämische hypokaliämische metabolische Alkalose, keine Notfall-OP!",
        trap: "Einleitung zur Operation vor vollständigem Elektrolyt- und Säure-Basen-Ausgleich (K.O.!)"
      },
      speechIntro: "Ein 5 Wochen alter Säugling (4,0 kg) mit Pylorusstenose erbricht seit Tagen schwallartig. BGA: pH 7,56, Chlorid 78 mmol/l, Kalium 2,9 mmol/l. Der Chirurg möchte das Kind sofort im Notprogramm operieren. Wie positionieren Sie sich und wie sieht die präoperative Vorbereitung aus?",
      crisis: {
        title: "⚡ Chirurg drängt auf sofortige Narkose!",
        prompt_de: "Der Chirurg sagt: 'Das Kind verhungert, wir müssen jetzt schneiden!' Welches Narkoserisiko besteht bei unkorrigierter hypochlorämischer Alkalose und wie setzen Sie sich durch?",
        vitals: { spo2: "98%", bp: "70/40", map: "50 mmHg", hr: "155 /min", etco2: "48 mmHg", temp: "36.8 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "OP strikt ablehnen! Pylorusstenose ist NIEMALS eine chirurgische Notfallindikation, sondern ein internistischer Ausgleichsnotfall! Voller Magen mit Magensonde absaugen, NaCl 0.9% + KCl bis Chlorid > 100 mmol/l!"
      },
      koCriteria: {
        forbiddenPatterns: [/sofort einleiten/i, /im saal ausgleichen während op/i],
        failureReason: "Narkoseeinleitung bei unkorrigierter metabolischer Alkalose führt zu lebensbedrohlichen postoperativen Atemstillständen und Herzrhythmusstörungen!",
        mandatoryKeywords: ["kein notfall", "chlorid > 100", "alkalose", "magensonde", "rsi", "ausgleich"]
      }
    },
    q_dus_30: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Myasthenia gravis, veränderte Relaxanzienempfindlichkeit, TIVA, Sugammadex vs. Neostigmin",
        trap: "Gabe von Standarddosen nicht-depolarisierender Relaxanzien ohne Monitoring (K.O. - Lähmung!)"
      },
      speechIntro: "Eine 32-jährige Patientin mit Myasthenia gravis soll sich einer Thymektomie unterziehen. Erläutern Sie die Besonderheiten bezüglich depolarisierender und nicht-depolarisierender Muskelrelaxanzien und warum Sugammadex die Narkoseführung revolutioniert hat.",
      crisis: {
        title: "⚡ Postoperative Atemlähmung nach Neostigmin!",
        prompt_de: "Nach Gabe von Neostigmin zur Reversierung klagt die Patientin über Speichelfluss, Bauchkrämpfe und zunehmende Muskelschwäche (TOF 40%). Liegt eine myasthene oder cholinerge Krise vor und wie handeln Sie?",
        vitals: { spo2: "87%", bp: "105/60", map: "75 mmHg", hr: "48 /min", etco2: "52 mmHg", temp: "36.7 °C", rhythm: "Bradykardie", alert: true },
        targetAction: "Cholinerge Krise durch Neostigmin-Überdosierung! Re-Intubation/Beatmung sichern, Atropin i.v.; Sugammadex wäre das risikofreie Antidot der 1. Wahl bei Rocuronium gewesen!"
      },
      koCriteria: {
        forbiddenPatterns: [/normale dosis relaxans geben/i],
        failureReason: "Myasthenie-Patienten reagieren hochgradig überempfindlich auf nicht-depolarisierende Relaxanzien; Überdosierung führt zur tagelangen Nachbeatmung.",
        mandatoryKeywords: ["myasthenie", "sugammadex", "tiva", "relaxometrie", "reduzierte dosis"]
      }
    },
    q_dus_31: {
      examiner: {
        name: "Prof. Dr. med. Thorsten Annecke",
        hospital: "Klinikum Leverkusen / ÄKNO Prüfungsvorsitzender",
        focus: "Karotis-TEA Shunteinlage, NIRS rSO2-Abfall > 20%, Blutdruckführung während Klemmung (MAP +20%)",
        trap: "Blutdruckabfall während Karotisklemmung tolerieren"
      },
      speechIntro: "Ein 70-jähriger Patient unterzieht sich einer Karotis-TEA in Vollnarkose. Die A. carotis interna wird abgeklemmt. Wie steuern Sie den systemischen Blutdruck während der Abklemmphase und ab welchen Schwellenwerten im Neuromonitoring (NIRS, SEP) fordern Sie eine Shunteinlage?",
      crisis: {
        title: "⚡ Zerebrale Ischämie bei Klemmung!",
        prompt_de: "30 Sekunden nach Karotisklemmung fällt der NIRS-Wert ipsilateral von 68% auf 44% ab! Wie lautet Ihre Anweisung an Operateur und Narkoseteam?",
        vitals: { spo2: "99%", bp: "110/65", map: "80 mmHg", hr: "72 /min", etco2: "37 mmHg", temp: "36.5 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "NIRS-Abfall um > 20% ist zwingende Shunt-Indikation! Operateur zur sofortigen temporären Shunteinlage auffordern, MAP mit Noradrenalin um 20% über Ausgangswert heben!"
      },
      koCriteria: {
        forbiddenPatterns: [/abwarten bei nirs-abfall/i, /blutdruck senken während klemmung/i],
        failureReason: "Tolerieren eines NIRS-Abfalls > 20% oder Hypotonie während der Klemmphase führt zum perioperativen ischämischen Schlaganfall.",
        mandatoryKeywords: ["shunt", "nirs > 20%", "map +20%", "noradrenalin", "willisii"]
      }
    },
    q_dus_32: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Massivtransfusion, 'Tödliche Trias' (Hypothermie, Azidose, Koagulopathie), ionisiertes Kalzium > 1,1 mmol/l",
        trap: "Vergessen der Kalziumsubstitution bei Massivtransfusion (Zitrattoxizität K.O.!)"
      },
      speechIntro: "Während einer Revisions-OP erhält ein Patient 8 EK und 6 FFP. Was versteht man unter der 'tödlichen Trias', welche Rolle spielt das ionisierte Kalzium bei Zitrattoxizität und wie lauten Ihre Zielparameter zur Gerinnungssicherung?",
      crisis: {
        title: "⚡ Zitrat-induzierter Herzstillstand droht!",
        prompt_de: "Der Blutdruck fällt auf 60/35 mmHg, EKG zeigt extremes QT-Verlängerung und electromechanical dissociation! Ionisiertes Kalzium liegt bei 0,65 mmol/l. Was spritzen Sie sofort?",
        vitals: { spo2: "94%", bp: "60/35", map: "43 mmHg", hr: "48 /min", etco2: "22 mmHg", temp: "34.8 °C", rhythm: "QT-Verlängerung", alert: true },
        targetAction: "Sofortige Gabe von 10-20 ml Calciumchlorid 10% (oder Calciumgluconat) i.v.! Aktive Wärmung (Ziel > 36°C), Azidose ausgleichen!",
        failureReason: "Zitrat in Blutprodukten bindet freies Kalzium; Hypokalzämie (< 0,9 mmol/l) lähmt die Gerinnungskaskade und führt zur elektromechanischen Entkopplung des Herzens."
      },
      koCriteria: {
        forbiddenPatterns: [/kalzium ignorieren/i, /keine substitution/i],
        failureReason: "Unterlassene Kalziumsubstitution bei Massivtransfusion führt zu letalem myokardialem Pumpversagen und unstillbarer Koagulopathie!",
        mandatoryKeywords: ["trias", "kalzium", "zitrat", "hypothermie", "azidose", "rotem"]
      }
    },
    q_dus_33: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor UKD / Prüfungsvorsitzender",
        focus: "Thoraxtrauma, Spannungspneumothorax, klinische Diagnose, Nadeldekompression vor Röntgen!",
        trap: "Warten auf ein Röntgen-Thorax bei V. a. Spannungspneumothorax (K.O.-Kriterium!)"
      },
      speechIntro: "Ein 34-jähriger Unfallfahrer zeigt im Schockraum einseitig aufgehobenes Atemgeräusch, hypersonoren Klopfschall, gestaute Halsvenen und einen Blutdruckabfall auf 60/30 mmHg. Erläutern Sie Diagnose und warum die Entlastung ohne radiologische Diagnostik erfolgen muss.",
      crisis: {
        title: "⚡ Kreislaufzusammenbruch bei Spannungspneumothorax!",
        prompt_de: "Der Assistenzarzt will das Röntgengerät holen. SpO2 fällt auf 65%, Herzfrequenz 145/min, Patient dekompensiert. Wo stechen Sie in DIESER Sekunde mit welcher Nadel hinein?",
        vitals: { spo2: "65%", bp: "55/30", map: "38 mmHg", hr: "148 /min", etco2: "18 mmHg", temp: "36.2 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "SOFORTIGE Nadeldekompression ohne Röntgen! 2. ICR Medioklavikularlinie (Monaldi) oder 4./5. ICR vordere Axillarlinie (Bülau) mit großlumiger Kanüle, danach Thoraxdrainage!"
      },
      koCriteria: {
        forbiddenPatterns: [/röntgen abwarten/i, /ct vor entlastung/i],
        failureReason: "Ein Spannungspneumothorax ist eine rein klinische Blickdiagnose! Warten auf radiologische Bildgebung führt zum letalen obstruktiven Schock!",
        mandatoryKeywords: ["spannungspneumothorax", "kein röntgen", "nadeldekompression", "monaldi", "bülau", "thoraxdrainage"]
      }
    },
    q_dus_34: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Notsectio Nabelschnurvorfall, Linksseitenkippung 15-30°, Intubationsfreigabe vor Schnitt",
        trap: "Chirurgischen Schnitt freigeben VOR gesicherter Intubation und blockiertem Cuff"
      },
      speechIntro: "Notsectio im Kreißsaal: 29-jährige Erstgebärende mit Nabelschnurvorfall und fetaler Bradykardie (45/min). Patientin hat vor 2 Stunden gegessen. Erläutern Sie das sekundengenaue Vorgehen bei Vollnarkose (RSI), Lagerung und Zeitmanagement.",
      crisis: {
        title: "⚡ Chirurg setzt das Skalpell vor Intubation an!",
        prompt_de: "Während Sie das Laryngoskop einführen, will der Operateur die Haut durchtrennen. Was rufen Sie durch den Saal und wann darf der Schnitt erfolgen?",
        vitals: { spo2: "94%", bp: "135/80", map: "98 mmHg", hr: "110 /min", etco2: "36 mmHg", temp: "36.8 °C", rhythm: "Sinusrhythmus", alert: true },
        targetAction: "'HALT, Schnitt erst nach Tubuslage und geblocktem Cuff!' Freigabe erst nach Verifikation der 4 Kapnographiewellen: 'Tubus liegt, Schnitt frei!' Linksseitenkippung sichern!"
      },
      koCriteria: {
        forbiddenPatterns: [/vor intubation schneiden lassen/i, /flach lagern/i],
        failureReason: "Schnitt vor gesicherter Intubation führt bei Aspiration zum unkontrollierbaren Erbrechen und Erstickungstod der Mutter!",
        mandatoryKeywords: ["eez 20 min", "linksseitenkippung", "rsi", "schnitt erst nach tubus", "succinylcholin", "oxytocin"]
      }
    },
    q_dus_35: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum",
        hospital: "Direktor der Klinik für Anästhesiologie, UK Düsseldorf",
        focus: "Intraoperative Anaphylaxie Grad III, Adrenalin 10-50 µg als 1. Wahl, Serum-Tryptase",
        trap: "Gabe von Cortison als erstes Akutmedikament (K.O.-Kriterium! Cortison wirkt erst nach Stunden)"
      },
      speechIntro: "Ein 60-jähriger Patient entwickelt unmittelbar nach Narkoseeinleitung mit Rocuronium schwere Hypotonie (RR 55/30 mmHg), Tachykardie (130/min), Beatmungsdruckanstieg auf 42 mbar und Flush mit Urtikaria. Nennen Sie Diagnose, das unverzichtbare Medikament der 1. Wahl und dessen Dosierung.",
      crisis: {
        title: "⚡ Anaphylaktischer Schock dekompensiert!",
        prompt_de: "Der Kollege greift nach 250 mg Prednisolon. Der Karotispuls wird fadenförmig! Welches ist das EINZIGE lebensrettende Medikament in DIESER Sekunde und wie dosieren Sie es?",
        vitals: { spo2: "80%", bp: "50/25", map: "33 mmHg", hr: "142 /min", etco2: "18 mmHg", temp: "36.9 °C", rhythm: "Sinustachykardie", alert: true },
        targetAction: "ADRENALIN (Epinephrin) i.v.! Initial 10-50 µg i.v. titriert bolusweise (wiederholen alle 1-2 min)! Cortison ist kein Akutmedikament! 20-30 ml/kg Kristalloide!"
      },
      koCriteria: {
        forbiddenPatterns: [/cortison als erstes/i, /prednisolon zuerst/i, /fenistil zuerst/i],
        failureReason: "Wer bei schwerer Anaphylaxie Cortison statt Adrenalin als erstes Akutmedikament nennt, fällt sofort durch! Adrenalin ist das einzige unverzichtbare Lebensrettungsmedikament!",
        mandatoryKeywords: ["adrenalin", "epinephrin", "10-50", "volumen", "tryptase", "allergenstopp"]
      }
    },
    q_dus_36: {
      examiner: {
        name: "Prof. Dr. med. Peter Kienbaum / Annecke",
        hospital: "ÄKNO Düsseldorf Prüfungskommission (ERC / ALS)",
        focus: "Reanimation ERC ALS, Kammerflimmern, Adrenalin & Amiodaron erst NACH dem 3. Schock!",
        trap: "Adrenalingabe vor dem 3. Schock bei schockbarem Rhythmus (K.O.-Kriterium!)"
      },
      speechIntro: "Ein 64-jähriger Patient im Aufwachraum kollabiert, kein Puls, Monitor zeigt Kammerflimmern (VF). Erläutern Sie die genaue Sequenz der ersten 3 Schocks, die Applikationszeitpunkte von Adrenalin und Amiodaron sowie die 4 H's und HITS.",
      crisis: {
        title: "⚡ Persistierendes Kammerflimmern!",
        prompt_de: "Der 1. Schock wurde abgegeben. Der Assistent will sofort 1 mg Adrenalin i.v. injizieren. Was sagen Sie und wann genau dürfen Adrenalin und Amiodaron gegeben werden?",
        vitals: { spo2: "45%", bp: "0/0", map: "0 mmHg", hr: "0 /min", etco2: "12 mmHg", temp: "36.3 °C", rhythm: "Kammerflimmern (VF)", alert: true },
        targetAction: "STOPP! Kein Adrenalin nach dem 1. Schock! Sofort 2 Minuten CPR! Adrenalin (1 mg) und Amiodaron (300 mg) werden erst NACH DEM 3. SCHOCK verabreicht!"
      },
      koCriteria: {
        forbiddenPatterns: [/adrenalin nach dem 1. schock/i, /adrenalin vor dem 3. schock/i, /adrenalin sofort bei vf/i],
        failureReason: "Frühzeitige Adrenalingabe vor dem 3. Schock bei VF/pVT senkt die Defibrillationserfolgsrate und das Überleben drastisch (ERC-Leitlinie K.O.-Kriterium)!",
        mandatoryKeywords: ["3. schock", "adrenalin 1 mg", "amiodaron 300", "cpr 2 minuten", "4 h", "hits"]
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
