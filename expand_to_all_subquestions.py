import PyPDF2
import re
import json
import os
import io
from PIL import Image

print("🏥 Facharztprüfung Anästhesiologie - Full Question Bank Builder")
print("=" * 70)

# =============================================================================
# SECTION 1: COMPREHENSIVE GERMAN→TURKISH MEDICAL TRANSLATION DICTIONARY
# =============================================================================
# Each entry: German term → Turkish annotation (shown parenthetically)
# Goal: Annotate every medical German sentence with inline Turkish glosses

TRANSLATION_MAP = {
    # ── Elektrolyte & Laborwerte ──
    "Hyponatriämie": "Hiponatremi",
    "Hypernatriämie": "Hipernatremi",
    "Hyperkaliämie": "Hiperkalemi",
    "Hypokaliämie": "Hipokalemi",
    "Hyperkalzämie": "Hiperkalsemi",
    "Hypokalzämie": "Hipokalsemi",
    "Hypomagnesiämie": "Hipomagnezemi",
    "Hypermagnesiämie": "Hipermagnezemi",
    "Hypophosphatämie": "Hipofosfatemi",
    "Hyperphosphatämie": "Hiperfosfatemi",
    "Hypoproteinämie": "Hipoproteinemi",
    "Hyperproteinämie": "Hiperproteinemi",
    "Hypoglykämie": "Hipoglisemi",
    "Hyperglykämie": "Hiperglisemi",
    "Hypalbuminämie": "Hipoalbüminemi",
    "Hyperbilirubinämie": "Hiperbilirubinemi",
    "Hyperurikämie": "Hiperürisemi",
    "Hyperlipidämie": "Hiperlipidemi",
    "Hyperlaktatämie": "Hiperlaktatemi",
    "Laktat": "Laktat",
    "Hämoglobin": "Hemoglobin",
    "Hämatokrit": "Hematokrit",
    "Leukozyten": "Lökositler",
    "Thrombozyten": "Trombositler",
    "Erythrozyten": "Eritrositler",
    "Blutglukose": "Kan şekeri",
    "Blutzucker": "Kan şekeri",
    "Serumkalium": "Serum potasyumu",
    "Serumnatrium": "Serum sodyumu",
    "Kreatinin": "Kreatinin",
    "Harnstoff": "Üre",
    "Bilirubin": "Bilirubin",
    "Albumin": "Albümin",
    "Troponin": "Troponin",
    "BNP": "BNP",
    "CRP": "CRP",
    "Procalcitonin": "Prokalsitonin",
    "Fibrinogen": "Fibrinojen",
    "D-Dimere": "D-Dimer",
    "INR": "INR",
    "PTT": "PTT",
    "Quick-Wert": "Quick değeri",

    # ── Säure-Basen-Haushalt ──
    "Alkalose": "Alkaloz",
    "Azidose": "Asidoz",
    "metabolische Azidose": "Metabolik asidoz",
    "respiratorische Azidose": "Respiratuar asidoz",
    "metabolische Alkalose": "Metabolik alkaloz",
    "respiratorische Alkalose": "Respiratuar alkaloz",
    "Pufferbase": "Tampon baz",
    "Bikarbonat": "Bikarbonat",
    "Base Excess": "Baz açığı",
    "Anionenlücke": "Anyon açığı",
    "pH-Wert": "pH değeri",
    "Basenüberschuss": "Baz fazlası",

    # ── Organsysteme ──
    "Herz": "Kalp",
    "Lunge": "Akciğer",
    "Leber": "Karaciğer",
    "Niere": "Böbrek",
    "Nieren": "Böbrekler",
    "Gehirn": "Beyin",
    "Milz": "Dalak",
    "Magen": "Mide",
    "Darm": "Bağırsak",
    "Dünndarm": "İnce bağırsak",
    "Dickdarm": "Kalın bağırsak",
    "Pankreas": "Pankreas",
    "Schilddrüse": "Tiroid bezi",
    "Nebenniere": "Böbrek üstü bezi",
    "Nebennierenrinde": "Adrenal korteks",
    "Nebennierenmark": "Adrenal medulla",
    "Knochenmark": "Kemik iliği",
    "Rückenmark": "Omurilik",
    "Zwerchfell": "Diyafram",
    "Pleura": "Plevra",
    "Peritoneum": "Periton",
    "Perikard": "Perikard",
    "Myokard": "Miyokard",
    "Endokard": "Endokard",
    "Muskel": "Kas",
    "Muskulatur": "Kas yapısı",
    "Skelettmuskulatur": "İskelet kası",
    "Gefäß": "Damar",
    "Gefäße": "Damarlar",
    "Blutgefäß": "Kan damarı",
    "Arterie": "Arter",
    "Vene": "Ven",
    "Kapillare": "Kapiller",
    "Aorta": "Aort",

    # ── Anatomische Strukturen (Atemweg) ──
    "Trachea": "Trakea",
    "Larynx": "Larinks",
    "Pharynx": "Farinks",
    "Epiglottis": "Epiglottis",
    "Glottis": "Glottis",
    "Stimmband": "Ses teli",
    "Stimmbänder": "Ses telleri",
    "Bronchus": "Bronş",
    "Bronchien": "Bronşlar",
    "Hauptbronchus": "Ana bronş",
    "Alveole": "Alveoller",
    "Alveolen": "Alveoller",
    "Kehlkopf": "Gırtlak",
    "Luftröhre": "Soluk borusu",
    "Atemweg": "Havayolu",
    "Atemwege": "Havayolları",
    "Ringknorpel": "Krikoid kıkırdak",
    "Schildknorpel": "Tiroid kıkırdak",
    "Membrana cricothyroidea": "Krikotiroid membran",

    # ── Anatomische Strukturen (Nervensystem) ──
    "Nervus vagus": "Vagus siniri",
    "N. vagus": "Vagus siniri",
    "N. phrenicus": "Frenik sinir",
    "N. recurrens": "Rekürren sinir",
    "N. laryngeus recurrens": "Rekürren laringeal sinir",
    "N. laryngeus superior": "Süperior laringeal sinir",
    "Plexus brachialis": "Brakiyal pleksus",
    "Plexus cervicalis": "Servikal pleksus",
    "Plexus lumbalis": "Lomber pleksus",
    "Sympathikus": "Sempatik sinir sistemi",
    "Parasympathikus": "Parasempatik sinir sistemi",
    "Sympathisches Nervensystem": "Sempatik sinir sistemi",
    "Zentrales Nervensystem": "Merkezi sinir sistemi",
    "ZNS": "MSS",
    "Rückenmarkskanal": "Spinal kanal",
    "Epiduralraum": "Epidural boşluk",
    "Subarachnoidalraum": "Subaraknoid boşluk",
    "Liquor": "BOS",
    "Liquor cerebrospinalis": "Beyin omurilik sıvısı",
    "Hirnnerv": "Kraniyal sinir",

    # ── Anatomische Strukturen (Wirbelsäule) ──
    "Wirbelsäule": "Omurga",
    "Halswirbelsäule": "Servikal omurga",
    "Brustwirbelsäule": "Torakal omurga",
    "Lendenwirbelsäule": "Lomber omurga",
    "Bandscheibe": "Disk",
    "Spinalkanal": "Spinal kanal",
    "Dura mater": "Dura mater",
    "Ligamentum flavum": "Ligamentum flavum",

    # ── Herz-Kreislauf ──
    "Blutdruck": "Kan basıncı",
    "Herzfrequenz": "Kalp hızı",
    "Herzrhythmus": "Kalp ritmi",
    "Herzzeitvolumen": "Kalp debisi",
    "Schlagvolumen": "Atım hacmi",
    "Schlagvolumenvariation": "Atım hacmi varyasyonu",
    "Pulsdruckvariation": "Nabız basıncı varyasyonu",
    "Vorlast": "Ön yük",
    "Nachlast": "Ard yük",
    "Kontraktilität": "Kontraktilite",
    "Inotropie": "İnotropi",
    "Chronotropie": "Kronotropi",
    "Dromotropie": "Dromotropi",
    "Bathmotropie": "Batmotropi",
    "Lusitropie": "Lüzitopi",
    "Ejektionsfraktion": "Ejeksiyon fraksiyonu",
    "Herzinsuffizienz": "Kalp yetmezliği",
    "Herzinfarkt": "Miyokard enfarktüsü",
    "Myokardinfarkt": "Miyokard enfarktüsü",
    "Koronarsyndrom": "Koroner sendrom",
    "Koronare Herzkrankheit": "Koroner arter hastalığı",
    "Herzrhythmusstörung": "Aritmi",
    "Arrhythmie": "Aritmi",
    "Tachykardie": "Taşikardi",
    "Bradykardie": "Bradikardi",
    "Vorhofflimmern": "Atriyal fibrilasyon",
    "Kammerflimmern": "Ventriküler fibrilasyon",
    "Kammertachykardie": "Ventriküler taşikardi",
    "Supraventrikuläre Tachykardie": "Supraventriküler taşikardi",
    "AV-Block": "AV blok",
    "Schenkelblock": "Dal bloğu",
    "Asystolie": "Asistoli",
    "Reizleitungsstörung": "İleti bozukluğu",
    "QRS-Verbreiterung": "QRS genişlemesi",
    "ST-Hebung": "ST elevasyonu",
    "ST-Senkung": "ST depresyonu",
    "T-Welle": "T dalgası",
    "Pulslosigkeit": "Nabızsızlık",
    "Pulslose elektrische Aktivität": "Nabızsız elektriksel aktivite",
    "PEA": "NEA",
    "Puls": "Nabız",
    "EKG": "EKG",
    "Herzschrittmacher": "Kalp pili",
    "Defibrillation": "Defibrilasyon",
    "Kardioversion": "Kardiyoversiyon",
    "Herzklappe": "Kalp kapağı",
    "Aortenklappe": "Aort kapağı",
    "Mitralklappe": "Mitral kapak",
    "Aortenstenose": "Aort stenozu",
    "Mitralstenose": "Mitral stenoz",
    "Aorteninsuffizienz": "Aort yetmezliği",
    "Mitralinsuffizienz": "Mitral yetmezlik",
    "Endokarditis": "Endokardit",
    "Perikarderguss": "Perikardiyal efüzyon",
    "Perikardtamponade": "Kardiyak tamponad",
    "Herzbeuteltamponade": "Kardiyak tamponad",
    "Lungenembolie": "Pulmoner emboli",
    "Thromboembolie": "Tromboemboli",
    "Tiefe Venenthrombose": "Derin ven trombozu",

    # ── Kreislauf & Schock ──
    "Schock": "Şok",
    "Hypovolämie": "Hipovolemi",
    "Hypervolämie": "Hipervolemi",
    "Kreislaufstillstand": "Dolaşım durması",
    "Kreislaufversagen": "Dolaşım yetmezliği",
    "Hypotonie": "Hipotansiyon",
    "Hypertonie": "Hipertansiyon",
    "hypovolämer Schock": "Hipovolemik şok",
    "kardiogener Schock": "Kardiyojenik şok",
    "septischer Schock": "Septik şok",
    "anaphylaktischer Schock": "Anafilaktik şok",
    "distributiver Schock": "Distributif şok",
    "obstruktiver Schock": "Obstrüktif şok",
    "neurogener Schock": "Nörojenik şok",
    "Zentralisierung": "Santral dolaşıma geçiş",
    "Vasokonstriktion": "Vazokonstriksiyon",
    "Vasodilatation": "Vazodilatasyon",

    # ── Atmung & Beatmung ──
    "Beatmung": "Mekanik ventilasyon",
    "Spontanatmung": "Spontan solunum",
    "kontrollierte Beatmung": "Kontrollü ventilasyon",
    "assistierte Beatmung": "Destekli ventilasyon",
    "Intubation": "Entübasyon",
    "Extubation": "Ekstübasyon",
    "Tracheotomie": "Trakeotomi",
    "Koniotomie": "Koniotomi",
    "Maskenbeatmung": "Maske ile ventilasyon",
    "Larynxmaske": "Laringeal maske",
    "Endotrachealtubus": "Endotrakeal tüp",
    "Tubus": "Tüp",
    "Kapnografie": "Kapnografi",
    "Kapnometrie": "Kapnometri",
    "Pulsoximetrie": "Pulse oksimetri",
    "Sauerstoffsättigung": "Oksijen satürasyonu",
    "Sauerstoff": "Oksijen",
    "Kohlendioxid": "Karbondioksit",
    "PEEP": "PEEP",
    "Tidalvolumen": "Tidal hacim",
    "Atemzugvolumen": "Tidal hacim",
    "Atemminutenvolumen": "Dakika ventilasyonu",
    "Vitalkapazität": "Vital kapasite",
    "Residualvolumen": "Rezidüel hacim",
    "Funktionelle Residualkapazität": "Fonksiyonel rezidüel kapasite",
    "Totraum": "Ölü boşluk",
    "Totraumvolumen": "Ölü boşluk hacmi",
    "Atemfrequenz": "Solunum sayısı",
    "Atemwegsdruck": "Havayolu basıncı",
    "Compliance": "Kompliyans",
    "Resistance": "Rezistans",
    "Surfactant": "Sürfaktan",
    "Atelektase": "Atelektazi",
    "Bronchospasmus": "Bronkospazm",
    "Laryngospasmus": "Laringospazm",
    "Stridor": "Stridor",
    "Aspiration": "Aspirasyon",
    "Pneumothorax": "Pnömotoraks",
    "Spannungspneumothorax": "Tansiyon pnömotoraks",
    "Hämatothorax": "Hemotoraks",
    "Pleuraerguss": "Plevral efüzyon",
    "ARDS": "ARDS",
    "Lungenödem": "Akciğer ödemi",
    "Hypoxie": "Hipoksi",
    "Hyperoxie": "Hiperoksi",
    "Hypoxämie": "Hipoksemi",
    "Hyperkapnie": "Hiperkapni",
    "Hypokapnie": "Hipokapni",
    "Zyanose": "Siyanoz",
    "Diffusionsstörung": "Difüzyon bozukluğu",
    "Rechts-Links-Shunt": "Sağ-sol şant",
    "Oxygenierung": "Oksijenasyon",
    "Ventilations-Perfusions-Verhältnis": "Ventilasyon-perfüzyon oranı",
    "Sauerstoffbindungskurve": "Oksijen dissosiasyon eğrisi",
    "Bohr-Effekt": "Bohr etkisi",
    "Haldane-Effekt": "Haldane etkisi",

    # ── Anästhesie (Allgemein) ──
    "Narkose": "Anestezi",
    "Allgemeinanästhesie": "Genel anestezi",
    "Regionalanästhesie": "Rejyonel anestezi",
    "Spinalanästhesie": "Spinal anestezi",
    "Epiduralanästhesie": "Epidural anestezi",
    "Periduralanästhesie": "Peridural anestezi",
    "Plexusanästhesie": "Pleksus anestezisi",
    "Nervenblockade": "Sinir bloğu",
    "Lokalanästhesie": "Lokal anestezi",
    "Sedierung": "Sedasyon",
    "Analgosedierung": "Analjezik sedasyon",
    "Narkoseeinleitung": "Anestezi indüksiyonu",
    "Narkoseausleitung": "Anesteziden uyanma",
    "Induktion": "İndüksiyon",
    "Aufrechterhaltung": "İdame",
    "Narkosetiefe": "Anestezi derinliği",
    "Muskelrelaxierung": "Kas gevşemesi",
    "Neuromuskuläre Blockade": "Nöromüsküler blokaj",
    "Relaxometrie": "Relaksometri",
    "Nervenstimulator": "Sinir stimülatörü",
    "TOF": "TOF",
    "Train-of-Four": "Dörtlü uyarı dizisi",
    "Awareness": "Farkındalık",
    "MAC": "MAK",
    "Minimale alveoläre Konzentration": "Minimum alveoler konsantrasyon",
    "Rapid Sequence Induction": "Hızlı sıralı indüksiyon",
    "RSI": "HSİ",
    "Präoxygenierung": "Preoksijenasyon",
    "Ileuseinleitung": "İleus indüksiyonu",
    "Mallampati": "Mallampati",
    "Cormack-Lehane": "Cormack-Lehane",
    "schwieriger Atemweg": "Zor havayolu",

    # ── Pharmakologie (Hypnotika) ──
    "Propofol": "Propofol",
    "Etomidat": "Etomidat",
    "Thiopental": "Tiopental",
    "Ketamin": "Ketamin",
    "Esketamin": "Esketamin",
    "Midazolam": "Midazolam",
    "Diazepam": "Diazepam",
    "Sevofluran": "Sevofluran",
    "Desfluran": "Desfluran",
    "Isofluran": "İzofluran",
    "Lachgas": "Azot protoksit",
    "Stickoxydul": "Azot protoksit",
    "Inhalationsanästhetikum": "İnhalasyon anesteziği",
    "Intravenöses Anästhetikum": "İntravenöz anestezik",
    "TIVA": "TİVA",
    "Balancierte Anästhesie": "Dengeli anestezi",

    # ── Pharmakologie (Opioide) ──
    "Opioid": "Opioid",
    "Opioide": "Opioidler",
    "Fentanyl": "Fentanil",
    "Sufentanil": "Süfentanil",
    "Remifentanil": "Remifentanil",
    "Alfentanil": "Alfentanil",
    "Morphin": "Morfin",
    "Morphium": "Morfin",
    "Piritramid": "Piritramid",
    "Tramadol": "Tramadol",
    "Pethidin": "Petidin",
    "Hydromorphon": "Hidromorfon",
    "Oxycodon": "Oksikodon",
    "Buprenorphin": "Buprenorfin",
    "Naloxon": "Nalokson",
    "Naltrexon": "Naltrekson",
    "Atemdepression": "Solunum depresyonu",
    "Ceiling-Effekt": "Tavan etkisi",

    # ── Pharmakologie (Muskelrelaxanzien) ──
    "Muskelrelaxans": "Kas gevşetici",
    "Muskelrelaxanzien": "Kas gevşeticiler",
    "Succinylcholin": "Süksinilkolin",
    "Rocuronium": "Rokuronyum",
    "Vecuronium": "Vekuronyum",
    "Cisatracurium": "Sisatrakuryum",
    "Atracurium": "Atrakuryum",
    "Mivacurium": "Mivakuryum",
    "Pancuronium": "Pankuronyum",
    "Sugammadex": "Sugammadeks",
    "Neostigmin": "Neostigmin",
    "Cholinesterasehemmer": "Kolinesteraz inhibitörü",
    "depolarisierend": "Depolarizan",
    "nicht-depolarisierend": "Non-depolarizan",

    # ── Pharmakologie (Lokalanästhetika) ──
    "Lokalanästhetikum": "Lokal anestezik",
    "Lokalanästhetika": "Lokal anestezikler",
    "Bupivacain": "Bupivakain",
    "Ropivacain": "Ropivakain",
    "Lidocain": "Lidokain",
    "Mepivacain": "Mepivakain",
    "Prilocain": "Prilokain",
    "Methämoglobinämie": "Methemoglobinemi",
    "Lipophilie": "Lipofiliklik",
    "Proteinbindung": "Protein bağlanması",
    "Wirkdauer": "Etki süresi",
    "Wirkeintritt": "Etki başlangıcı",

    # ── Pharmakologie (Katecholamine & Vasopressoren) ──
    "Katecholamine": "Katekolaminler",
    "Katecholamintherapie": "Katekolamin tedavisi",
    "Adrenalin": "Adrenalin/Epinefrin",
    "Noradrenalin": "Noradrenalin/Norepinefrin",
    "Dobutamin": "Dobutamin",
    "Dopamin": "Dopamin",
    "Vasopressin": "Vazopressin",
    "Phenylephrin": "Fenilefrin",
    "Milrinon": "Milrinon",
    "Levosimendan": "Levosimendan",
    "Vasopressor": "Vazopressör",
    "Vasopressoren": "Vazopressörler",
    "Inotropikum": "İnotropik ajan",

    # ── Pharmakologie (Sonstige) ──
    "Atropin": "Atropin",
    "Amiodaron": "Amiodaron",
    "Adenosin": "Adenozin",
    "Magnesium": "Magnezyum",
    "Calciumgluconat": "Kalsiyum glukonat",
    "Calciumchlorid": "Kalsiyum klorür",
    "Natriumbikarbonat": "Sodyum bikarbonat",
    "Heparin": "Heparin",
    "Protamin": "Protamin",
    "Tranexamsäure": "Traneksamik asit",
    "Desmopressin": "Desmopressin",
    "Cortisol": "Kortizol",
    "Hydrocortison": "Hidrokortizon",
    "Dexamethason": "Deksametazon",
    "Prednisolon": "Prednizolon",
    "Antibiotikum": "Antibiyotik",
    "Antibiotika": "Antibiyotikler",
    "Antikoagulation": "Antikoagülasyon",
    "Antikoagulanzien": "Antikoagülanlar",
    "Thrombozytenaggregationshemmer": "Trombosit agregasyon inhibitörü",
    "Gerinnungsfaktor": "Pıhtılaşma faktörü",
    "Gerinnungsfaktoren": "Pıhtılaşma faktörleri",
    "Gerinnungsstörung": "Koagülopati",
    "Gerinnung": "Pıhtılaşma",
    "Gerinnungsdiagnostik": "Koagülasyon tanısı",
    "Blutgerinnung": "Kan pıhtılaşması",
    "Fibrinolyse": "Fibrinoliz",
    "Antiemetikum": "Antiemetik",
    "PONV": "POBK",
    "Übelkeit": "Bulantı",
    "Erbrechen": "Kusma",
    "Histamin": "Histamin",
    "Anaphylaxie": "Anafilaksi",
    "allergische Reaktion": "Alerjik reaksiyon",

    # ── Intensivmedizin ──
    "Sepsis": "Sepsis",
    "septischer Schock": "Septik şok",
    "SOFA-Score": "SOFA skoru",
    "qSOFA": "qSOFA",
    "SIRS": "SIRS",
    "Multiorganversagen": "Çoklu organ yetmezliği",
    "Organversagen": "Organ yetmezliği",
    "Organdysfunktion": "Organ disfonksiyonu",
    "Intensivstation": "Yoğun bakım ünitesi",
    "Intensivmedizin": "Yoğun bakım tıbbı",
    "Beatmungstherapie": "Ventilatör tedavisi",
    "Entwöhnung": "Weaning",
    "Weaning": "Weaning",
    "Tracheostoma": "Trakeostomi",
    "Delir": "Deliryum",
    "Critical-Illness-Polyneuropathie": "Kritik hastalık polinöropatisi",
    "Nierenersatztherapie": "Böbrek yerine koyma tedavisi",
    "Dialyse": "Diyaliz",
    "Hämodialyse": "Hemodiyaliz",
    "CVVH": "SVVH",
    "Ernährungstherapie": "Beslenme tedavisi",
    "enterale Ernährung": "Enteral beslenme",
    "parenterale Ernährung": "Parenteral beslenme",
    "Hirntod": "Beyin ölümü",
    "Hirntodfeststellung": "Beyin ölümü tespiti",

    # ── Notfallmedizin & Reanimation ──
    "Reanimation": "Resüsitasyon",
    "Wiederbelebung": "Kardiyopulmoner resüsitasyon",
    "Herzdruckmassage": "Göğüs basısı",
    "Thoraxkompression": "Göğüs basısı",
    "Herz-Lungen-Wiederbelebung": "Kardiyopulmoner resüsitasyon",
    "Advanced Life Support": "İleri yaşam desteği",
    "ALS": "İYD",
    "Basic Life Support": "Temel yaşam desteği",
    "BLS": "TYD",
    "Defibrillator": "Defibrilatör",
    "Notfall": "Acil durum",
    "Notfallmedizin": "Acil tıp",
    "Polytrauma": "Çoklu travma",
    "Trauma": "Travma",
    "Schädel-Hirn-Trauma": "Kafa travması",
    "SHT": "KT",
    "Bewusstlosigkeit": "Bilinç kaybı",
    "Bewusstseinsstörung": "Bilinç bozukluğu",
    "Glasgow Coma Scale": "Glasgow Koma Skalası",
    "GCS": "GKS",
    "Krampfanfall": "Nöbet",
    "epileptischer Anfall": "Epileptik nöbet",
    "Volumentherapie": "Sıvı tedavisi",
    "Volumenmangel": "Hacim eksikliği",
    "Flüssigkeitstherapie": "Sıvı tedavisi",
    "Infusionstherapie": "İnfüzyon tedavisi",
    "Kristalloide": "Kristalloidler",
    "Kolloide": "Kolloidler",
    "Bluttransfusion": "Kan transfüzyonu",
    "Transfusion": "Transfüzyon",
    "Erythrozytenkonzentrat": "Eritrosit süspansiyonu",
    "Frischplasma": "Taze donmuş plazma",
    "FFP": "TDP",
    "Thrombozytenkonzentrat": "Trombosit konsantresi",
    "Massivtransfusion": "Masif transfüzyon",

    # ── Schmerztherapie ──
    "Schmerz": "Ağrı",
    "Schmerztherapie": "Ağrı tedavisi",
    "Analgesie": "Analjezi",
    "Analgetikum": "Analjezik",
    "Analgetika": "Analjezikler",
    "Nozizeption": "Nosisepsiyon",
    "nozizeptiv": "Nosiseptif",
    "neuropathisch": "Nöropatik",
    "Allodynie": "Allodini",
    "Hyperalgesie": "Hiperaljezi",
    "chronischer Schmerz": "Kronik ağrı",
    "akuter Schmerz": "Akut ağrı",
    "postoperativer Schmerz": "Postoperatif ağrı",
    "WHO-Stufenschema": "DSÖ basamak şeması",
    "PCA": "HKA",
    "Patientenkontrollierte Analgesie": "Hasta kontrollü analjezi",
    "Tumorschmerz": "Kanser ağrısı",
    "Nichtopioidanalgetikum": "Non-opioid analjezik",
    "NSAR": "NSAİİ",
    "Paracetamol": "Parasetamol",
    "Metamizol": "Metamizol",
    "Ibuprofen": "İbuprofen",
    "Diclofenac": "Diklofenak",

    # ── Klinische Zustände & Erkrankungen ──
    "Niereninsuffizienz": "Böbrek yetmezliği",
    "Nierenversagen": "Böbrek yetmezliği",
    "akutes Nierenversagen": "Akut böbrek hasarı",
    "Leberinsuffizienz": "Karaciğer yetmezliği",
    "Leberversagen": "Karaciğer yetmezliği",
    "Leberzirrhose": "Karaciğer sirozu",
    "Diabetes mellitus": "Diyabet",
    "Schilddrüsenüberfunktion": "Hipertiroidizm",
    "Schilddrüsenunterfunktion": "Hipotiroidizm",
    "Hypothyreose": "Hipotiroidizm",
    "Hyperthyreose": "Hipertiroidizm",
    "thyreotoxische Krise": "Tirotoksik kriz",
    "Morbus Addison": "Addison hastalığı",
    "Cushing-Syndrom": "Cushing sendromu",
    "Phäochromozytom": "Feokromositoma",
    "Maligne Hyperthermie": "Malign hipertermi",
    "MH": "MH",
    "Rhabdomyolyse": "Rabdomiyoliz",
    "Hirnödem": "Beyin ödemi",
    "erhöhter Hirndruck": "Artmış kafa içi basıncı",
    "intrakranieller Druck": "Kafa içi basıncı",
    "ICP": "KİB",
    "Meningitis": "Menenjit",
    "Enzephalitis": "Ensefalit",
    "Pneumonie": "Pnömoni",
    "Asthma": "Astım",
    "COPD": "KOAH",
    "Ileus": "İleus",
    "Peritonitis": "Peritonit",
    "Pankreatitis": "Pankreatit",
    "Eklampsie": "Eklampsi",
    "Präeklampsie": "Preeklampsi",
    "HELLP-Syndrom": "HELLP sendromu",
    "Sectio caesarea": "Sezaryen",
    "Sectio": "Sezaryen",
    "Koagulopathie": "Koagülopati",
    "DIC": "YDİK",
    "Verbrauchskoagulopathie": "Tüketim koagülopatisi",
    "Thrombose": "Tromboz",
    "Embolie": "Emboli",
    "Fettembolie": "Yağ embolisi",
    "Luftembolie": "Hava embolisi",
    "Fruchtwasserembolie": "Amniyotik sıvı embolisi",
    "Hypothermie": "Hipotermi",
    "Hyperthermie": "Hipertermi",
    "Fieber": "Ateş",
    "Temperaturregulation": "Sıcaklık düzenlemesi",
    "Wärmehaushalt": "Isı dengesi",
    "Shivering": "Titreme",
    "Tetanie": "Tetani",
    "Parästhesie": "Parestezi",
    "Parästhesien": "Paresteziler",

    # ── Monitoring ──
    "Monitoring": "Monitörizasyon",
    "Pulmonalarterienkatheter": "Pulmoner arter kateteri",
    "Swan-Ganz-Katheter": "Swan-Ganz kateteri",
    "Zentraler Venenkatheter": "Santral venöz kateter",
    "ZVK": "SVK",
    "Zentraler Venendruck": "Santral venöz basınç",
    "ZVD": "SVB",
    "arterieller Katheter": "Arteriyel kateter",
    "invasive Blutdruckmessung": "İnvaziv kan basıncı ölçümü",
    "nicht-invasive Blutdruckmessung": "Non-invaziv kan basıncı ölçümü",
    "BIS-Monitoring": "BIS monitörizasyonu",
    "Relaxometrie": "Relaksometri",
    "Temperaturmessung": "Sıcaklık ölçümü",
    "Diurese": "Diürez",
    "Urinausscheidung": "İdrar çıkışı",
    "Echokardiografie": "Ekokardiyografi",
    "TEE": "TEE",
    "TTE": "TTE",
    "Sonografie": "Ultrasonografi",
    "Ultraschall": "Ultrason",
    "Röntgen": "Röntgen",
    "CT": "BT",
    "MRT": "MRG",
    "Bronchoskopie": "Bronkoskopi",

    # ── Operative Medizin / Perioperativ ──
    "perioperativ": "Perioperatif",
    "präoperativ": "Preoperatif",
    "intraoperativ": "İntraoperatif",
    "postoperativ": "Postoperatif",
    "Prämedikation": "Premedikasyon",
    "Aufklärung": "Aydınlatma",
    "Einwilligung": "Onam",
    "Nüchternheit": "Açlık süresi",
    "Nüchternheitszeiten": "Açlık süreleri",
    "ASA-Klassifikation": "ASA sınıflandırması",
    "Risikoeinschätzung": "Risk değerlendirmesi",
    "Lagerung": "Pozisyonlama",
    "Wärmemanagement": "Isı yönetimi",
    "Blutverlust": "Kan kaybı",
    "Volumenersatz": "Hacim replasmanı",
    "Aufwachraum": "Derlenme odası",
    "PACU": "PACU",
    "ambulante Anästhesie": "Ayaktan anestezi",

    # ── Kinderanästhesie ──
    "Kinderanästhesie": "Pediatrik anestezi",
    "Pädiatrie": "Pediatri",
    "Neugeborenes": "Yenidoğan",
    "Frühgeborenes": "Prematüre",
    "Säugling": "Süt çocuğu",
    "Kind": "Çocuk",
    "Kinder": "Çocuklar",
    "Kaudalanästhesie": "Kaudal anestezi",
    "Laryngospasmus bei Kindern": "Çocuklarda laringospazm",

    # ── Geburtshilfliche Anästhesie ──
    "Schwangerschaft": "Gebelik",
    "Geburt": "Doğum",
    "Wehen": "Doğum sancıları",
    "Periduralanästhesie zur Geburt": "Doğum epidural anestezisi",
    "Spinalanästhesie zur Sectio": "Sezaryen spinal anestezisi",
    "Peripartale Blutung": "Peripartum kanama",
    "Uterusatonie": "Uterus atonisi",
    "Aortokavales Kompressionssyndrom": "Aortokaval kompresyon sendromu",

    # ── Klinische Scores ──
    "APGAR-Score": "APGAR skoru",
    "ASA-Klassifikation": "ASA sınıflandırması",
    "NYHA-Klassifikation": "NYHA sınıflandırması",
    "CHA2DS2-VASc-Score": "CHA2DS2-VASc skoru",
    "HAS-BLED-Score": "HAS-BLED skoru",
    "APACHE-Score": "APACHE skoru",
    "SAPS": "SAPS",
    "Lee-Index": "Lee indeksi",

    # ── Häufige klinische Verben & Adjektive ──
    "erhöht": "yükselmiş/artmış",
    "erniedrigt": "düşmüş/azalmış",
    "vermindert": "azalmış",
    "gesteigert": "artmış",
    "pathologisch": "patolojik",
    "physiologisch": "fizyolojik",
    "therapeutisch": "terapötik",
    "symptomatisch": "semptomatik",
    "asymptomatisch": "asemptomatik",
    "reversibel": "geri dönüşümlü",
    "irreversibel": "geri dönüşümsüz",
    "akut": "akut",
    "chronisch": "kronik",
    "intermittierend": "aralıklı",
    "kontinuierlich": "sürekli",
    "intravenös": "intravenöz",
    "subkutan": "subkütan",
    "intramuskulär": "intramusküler",
    "oral": "oral",
    "rektal": "rektal",
    "sublingual": "sublingual",
    "intraossär": "intraosseöz",
    "kontraindiziert": "kontrendike",
    "indiziert": "endike",
    "Indikation": "Endikasyon",
    "Kontraindikation": "Kontrendikasyon",
    "Nebenwirkung": "Yan etki",
    "Nebenwirkungen": "Yan etkiler",
    "Komplikation": "Komplikasyon",
    "Komplikationen": "Komplikasyonlar",
    "Dosierung": "Dozaj",
    "Dosis": "Doz",
    "Halbwertszeit": "Yarı ömür",
    "Wirkmechanismus": "Etki mekanizması",
    "Pharmakokinetik": "Farmakokinetik",
    "Pharmakodynamik": "Farmakodinamik",
    "Clearance": "Klirens",
    "Verteilungsvolumen": "Dağılım hacmi",
    "Bioverfügbarkeit": "Biyoyararlanım",
    "Plasmaspiegel": "Plazma düzeyi",
    "Rezeptor": "Reseptör",
    "Agonist": "Agonist",
    "Antagonist": "Antagonist",
    "Inhibitor": "İnhibitör",
    "Enzym": "Enzim",

    # ── Klinische Befunde / Diagnostik ──
    "Auskultation": "Oskültasyon",
    "Palpation": "Palpasyon",
    "Perkussion": "Perküsyon",
    "Inspektion": "İnspeksiyon",
    "Diagnose": "Tanı",
    "Differenzialdiagnose": "Ayırıcı tanı",
    "Differentialdiagnose": "Ayırıcı tanı",
    "Differenzialdiagnosen": "Ayırıcı tanılar",
    "Anamnese": "Öykü",
    "Untersuchung": "Muayene",
    "Befund": "Bulgu",
    "Symptom": "Semptom",
    "Symptome": "Semptomlar",
    "Therapie": "Tedavi",
    "Behandlung": "Tedavi",
    "Prognose": "Prognoz",
    "Pathophysiologie": "Patofizyoloji",
    "Ätiologie": "Etiyoloji",
    "Inzidenz": "İnsidans",
    "Prävalenz": "Prevalans",
    "Mortalität": "Mortalite",
    "Letalität": "Letalite",
    "Morbidität": "Morbidite",
    "Leitlinie": "Kılavuz",
    "Leitlinien": "Kılavuzlar",
    "Evidenz": "Kanıt",

    # ── Sonstige medizinische Begriffe ──
    "Blut": "Kan",
    "Serum": "Serum",
    "Plasma": "Plazma",
    "Infusion": "İnfüzyon",
    "Injektion": "Enjeksiyon",
    "Bolus": "Bolus",
    "Titration": "Titrasyon",
    "Katheter": "Kateter",
    "Kanüle": "Kanül",
    "Drainage": "Drenaj",
    "Punktion": "Ponksiyon",
    "Biopsie": "Biyopsi",
    "Resektion": "Rezeksiyon",
    "Operation": "Ameliyat",
    "Eingriff": "Girişim",
    "Wunde": "Yara",
    "Naht": "Sütür",
    "Verband": "Pansuman",
    "Blutung": "Kanama",
    "Hämorrhagie": "Hemoraji",
    "Ödem": "Ödem",
    "Entzündung": "İnflamasyon",
    "Infektion": "Enfeksiyon",
    "Fieber": "Ateş",
    "Nekrose": "Nekroz",
    "Ischämie": "İskemi",
    "Gewebeischämie": "Doku iskemisi",
    "Hypoperfusion": "Hipoperfüzyon",
    "Reperfusion": "Reperfüzyon",
    "Perfusion": "Perfüzyon",
    "Vasokonstriktor": "Vazokonstriktör",
    "Vasodilatator": "Vazodilatör",
    "Point-of-care": "Hasta başı test",
}

# Sort by length (longest first) to avoid partial matches
SORTED_TERMS = sorted(TRANSLATION_MAP.keys(), key=len, reverse=True)


def auto_translate(text_de):
    """Add inline Turkish annotations to German medical text."""
    if not text_de:
        return ""
    text_tr = text_de
    already_annotated = set()

    for de_term in SORTED_TERMS:
        tr_term = TRANSLATION_MAP[de_term]
        # Skip if Turkish is same as German (e.g., proper nouns)
        if tr_term == de_term:
            continue
        # Skip if already annotated in a longer term
        if de_term in already_annotated:
            continue

        # Use word boundary matching (case-insensitive for first match)
        pattern = r'(?<!\()' + re.escape(de_term) + r'(?!\s*[\(\[])'
        match = re.search(pattern, text_tr)
        if match:
            # Only annotate first occurrence
            replacement = f"{match.group(0)} ({tr_term})"
            text_tr = text_tr[:match.start()] + replacement + text_tr[match.end():]
            # Mark sub-terms as annotated
            for sub_term in SORTED_TERMS:
                if sub_term != de_term and sub_term in de_term:
                    already_annotated.add(sub_term)

    return text_tr


def clean_pdf_text(text):
    """Clean up PDF extraction artifacts."""
    # Remove page markers
    text = re.sub(r'---\s*PAGE\s+\d+\s*---', '', text)
    # Fix hyphenated line breaks (German word splitting)
    text = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', text)
    # Fix broken lines within sentences
    text = re.sub(r'(?<=[a-zäöüß,;])\s*\n\s*(?=[a-zäöüß])', ' ', text)
    # Collapse multiple spaces/newlines
    text = re.sub(r'\s+', ' ', text)
    # Remove page numbers that leaked in
    text = re.sub(r'\b\d{1,3}\s+[IVX]+\b', '', text)
    return text.strip()


def detect_category(text):
    """Categorize question by content analysis."""
    t_lower = text.lower()
    if any(k in t_lower for k in ["laktat", "elektrolyt", "natrium", "kalium", "kalzium", "glukose", "stoffwechsel", "leber", "niere", "kreatinin", "harnstoff"]):
        if any(k in t_lower for k in ["ph-wert", "azidose", "alkalose", "blutgas", "paco2", "pao2", "bikarbonat", "base excess"]):
            return "Säure-Basen-Haushalt & Blutgase"
        return "Klinische Chemie & Elektrolyte"
    elif any(k in t_lower for k in ["atemweg", "intubation", "beatmung", "lunge", "trachea", "koniotomie", "peep", "totraum", "larynx", "bronch", "ards", "respirator", "ventilat", "extubation"]):
        return "Atemwegsmanagement & Beatmung"
    elif any(k in t_lower for k in ["herz", "kardi", "blutdruck", "blutverlust", "svv", "ppv", "zvd", "arrhythmie", "schock", "infarkt", "ekg", "vorhofflimm", "tamponade", "embolie"]):
        return "Herz-Kreislauf & Hämodynamik"
    elif any(k in t_lower for k in ["propofol", "etomidat", "ketamin", "opioid", "fentanyl", "sugammadex", "rocuronium", "muskelrelax", "narkose", "pharmako", "sevofluran", "desfluran", "remifentanil"]):
        return "Pharmakologie"
    elif any(k in t_lower for k in ["sepsis", "intensiv", "sofa", "bakteri", "infektion", "organversagen", "delir", "weaning", "ernährung", "dialyse"]):
        return "Intensivmedizin & Sepsis"
    elif any(k in t_lower for k in ["regional", "epidural", "spinal", "plexus", "lokalanästhe", "bupivacain", "ropivacain", "last ", "nervenblo"]):
        return "Regionalanästhesie & Lokalanästhetika"
    elif any(k in t_lower for k in ["reanimation", "bls", "notfall", "defibrillation", "trauma", "polytrauma", "kreislaufstillstand"]):
        return "Notfallmedizin & Reanimation"
    elif any(k in t_lower for k in ["schmerz", "analgesie", "palliativ", "pca", "tumorschmerz", "who-stufen", "nsar"]):
        return "Schmerztherapie & Palliativmedizin"
    elif any(k in t_lower for k in ["kind", "pädiatr", "neugeboren", "frühgeboren", "säugling", "kaudal"]):
        return "Kinderanästhesie & Pädiatrie"
    elif any(k in t_lower for k in ["schwanger", "geburt", "sectio", "präeklampsie", "eklampsie", "hellp", "wehen", "uterus"]):
        return "Geburtshilfliche Anästhesie"
    elif any(k in t_lower for k in ["transfusion", "blutgrupp", "blutprodukt", "gerinnung", "hämostase", "thrombo", "antikoagul", "heparin"]):
        return "Transfusionsmedizin & Hämostaseologie"
    elif any(k in t_lower for k in ["monitor", "zvk", "katheter", "echokardio", "sono", "kapno", "pulsoxy"]):
        return "Monitoring & Diagnostik"
    elif any(k in t_lower for k in ["prämedik", "nüchtern", "aufklärung", "asa-klass", "perioperativ", "ambulant"]):
        return "Perioperative Medizin"
    else:
        return "Allgemeine Anästhesie"


# =============================================================================
# SECTION 2: IMAGE EXTRACTION FROM PDFs
# =============================================================================

def extract_images_from_pdf(pdf_path, output_dir, page_range=None):
    """Extract images from PDF pages and save as PNG files."""
    os.makedirs(output_dir, exist_ok=True)
    reader = PyPDF2.PdfReader(pdf_path)
    extracted = {}  # page_num -> [image_filenames]

    pages = range(len(reader.pages)) if page_range is None else page_range

    for page_idx in pages:
        if page_idx >= len(reader.pages):
            continue
        page = reader.pages[page_idx]
        try:
            resources = page.get('/Resources')
            if not resources:
                continue
            res_obj = resources.get_object() if hasattr(resources, 'get_object') else resources
            xobjects = res_obj.get('/XObject')
            if not xobjects:
                continue
            xobj_dict = xobjects.get_object() if hasattr(xobjects, 'get_object') else xobjects

            img_num = 0
            for obj_name in xobj_dict:
                xobj = xobj_dict[obj_name]
                if hasattr(xobj, 'get_object'):
                    xobj = xobj.get_object()

                subtype = str(xobj.get('/Subtype', ''))
                if '/Image' not in subtype:
                    continue

                width = xobj.get('/Width', 0)
                height = xobj.get('/Height', 0)

                # Skip tiny images (icons, decorations)
                if width < 100 or height < 100:
                    continue

                try:
                    data = xobj.get_data()
                    color_space = str(xobj.get('/ColorSpace', ''))
                    bits = xobj.get('/BitsPerComponent', 8)
                    filt = str(xobj.get('/Filter', ''))

                    img_filename = f"page_{page_idx+1}_img_{img_num}.png"
                    img_path = os.path.join(output_dir, img_filename)

                    if '/DCTDecode' in filt:
                        # JPEG data
                        img = Image.open(io.BytesIO(data))
                        img.save(img_path, 'PNG')
                    elif '/FlateDecode' in filt:
                        # Raw pixel data
                        if '/DeviceRGB' in color_space or 'RGB' in color_space:
                            mode = 'RGB'
                        elif '/DeviceGray' in color_space or 'Gray' in color_space:
                            mode = 'L'
                        else:
                            mode = 'RGB'
                        try:
                            img = Image.frombytes(mode, (width, height), data)
                            img.save(img_path, 'PNG')
                        except Exception:
                            continue
                    else:
                        continue

                    if page_idx not in extracted:
                        extracted[page_idx] = []
                    extracted[page_idx].append(img_filename)
                    img_num += 1
                    print(f"  📸 Extracted image: {img_filename} ({width}x{height})")

                except Exception as e:
                    continue

        except Exception as e:
            continue

    return extracted


# =============================================================================
# SECTION 3: PARSE QUESTIONS FROM BOOKS
# =============================================================================

all_items = []
q_counter = 1

# ─── 3A: Parse Kehl & Wilke (1670 Fakten) ────────────────────────────────────
# Instead of splitting each sub-item into a true/false card,
# we regroup them into the original multi-part open Q&A question.

print("\n📖 Parsing: Kehl & Wilke - Anästhesie: 1670 Fakten...")
pdf_path_kehl = 'Books/Anästhesie. Fragen und Antworten_ 1670 Fakten für die Facharztprüfung und das Europäische Diplom (DESA).pdf'
reader_kehl = PyPDF2.PdfReader(pdf_path_kehl)
full_kehl = ""
for idx, page in enumerate(reader_kehl.pages[15:285]):
    full_kehl += f"\n--- PAGE {idx+16} ---\n" + page.extract_text()

q_blocks = re.split(r'\n\s*\?\s*(\d+)\s+', full_kehl)

for i in range(1, len(q_blocks)-1, 2):
    block_num = q_blocks[i]
    block = q_blocks[i+1]

    parts = re.split(r'\n\s*v\s*Antworten\s*\n|\n\s*Antworten\s*\n', block, maxsplit=1)
    q_raw = parts[0].strip()
    ans_raw = parts[1].strip() if len(parts) > 1 else ""

    opt_matches = list(re.finditer(r'(?:^|\n)\s*([a-e])\.\s*([^\n]+(?:\n(?![a-e]\.|\n)[^\n]+)*)', q_raw))
    if not opt_matches:
        continue

    stem_text = re.sub(r'\s+', ' ', q_raw[:opt_matches[0].start()]).strip()
    stem_text = clean_pdf_text(stem_text)

    # Build the full open Q&A card with all sub-items
    sub_items = []
    answer_parts = []

    for om in opt_matches:
        letter = om.group(1)
        item_statement = clean_pdf_text(re.sub(r'\s+', ' ', om.group(2)).strip())

        # Skip options where text looks like a leaked explanation
        if re.match(r'^(Richtig|Falsch)\.', item_statement.strip()):
            continue

        # Find the answer for this sub-item using a non-greedy match
        # that stops at the next answer boundary (next "letter. Richtig/Falsch")
        ans_match = re.search(
            r'\b' + letter + r'\.\s*(Richtig|Falsch)\.\s*(.*?)(?=\b[a-e]\.\s*(?:Richtig|Falsch)\b|\Z)',
            ans_raw, re.IGNORECASE | re.DOTALL
        )
        is_correct = True
        expl_text = ""
        if ans_match:
            status = ans_match.group(1).lower()
            is_correct = (status == "richtig")
            expl_text = clean_pdf_text(re.sub(r'\s+', ' ', ans_match.group(2)).strip())
            # Strip book chapter/page artifacts from explanation
            expl_text = re.sub(r'\d+\s+\d+Kapitel\s+\d+\s*·\s*[^\n.]+', '', expl_text).strip()
            expl_text = re.sub(r'\s*\d+\s+\d+\s*·\s*\w+\d*\s*$', '', expl_text).strip()

        sub_items.append({
            "letter": letter,
            "statement": item_statement,
            "correct": is_correct,
            "explanation": expl_text
        })

        verdict = "✅ Richtig" if is_correct else "❌ Falsch"
        answer_parts.append(f"{letter}. {verdict}. {expl_text}" if expl_text else f"{letter}. {verdict}.")

    category = detect_category(stem_text + " " + " ".join(si['statement'] for si in sub_items))

    # Deduplicate option keys and cap at 5 (a-e)
    opts_list = []
    seen_keys = set()
    for si in sub_items:
        if si['letter'] in seen_keys or si['letter'] not in 'abcde':
            continue
        seen_keys.add(si['letter'])
        opts_list.append({
            "key": si['letter'],
            "text_de": si['statement'],
            "is_correct": si['correct'],
            "explanation_de": si['explanation']
        })
        if len(opts_list) >= 5:
            break

    all_items.append({
        "id": f"q_{q_counter}",
        "category": category,
        "source_book": "Anästhesie: 1670 Fakten für die Facharztprüfung (Kehl & Wilke)",
        "question_type": "options",
        "stem_de": stem_text,
        "options": opts_list,
        "image": None
    })
    q_counter += 1

print(f"  ✅ Extracted {q_counter - 1} questions from Kehl & Wilke")


# ─── 3B: Parse Annecke & Hohn (Clinical Cases) ───────────────────────────────

print("\n📖 Parsing: Annecke & Hohn - Facharztprüfung in Fällen...")
pdf_path_annecke = 'Books/Thorsten Annecke (Autor), Andreas Hohn (Autor) - Facharztprüfung Anästhesiologie_ in Fällen, Fragen und Antworten (2019, Elsevier).pdf'
reader_annecke = PyPDF2.PdfReader(pdf_path_annecke)
full_annecke = ""
for idx, page in enumerate(reader_annecke.pages[13:260]):
    full_annecke += f"\n--- PAGE {idx+14} ---\n" + page.extract_text()

# Extract images from Annecke book
print("\n🖼️  Extracting images from Annecke book...")
annecke_images = extract_images_from_pdf(
    pdf_path_annecke,
    'images',
    page_range=range(13, 260)
)
print(f"  ✅ Extracted images from {len(annecke_images)} pages")

# Parse questions
q_matches = re.finditer(
    r'((?:Welche|Beschreiben Sie|Was|Wie|Nennen Sie|Definieren Sie|In welchem|Warum|Erklären Sie|Wann|Welcher|Welches|Welchem|Unter welchen|Worauf|Worin|Wodurch|Wozu|Wovon|Gibt es|Kennen Sie|Können Sie|Haben Sie|Ist|Sind)[^\n?]+\?)\s*\n([^\n]+(?:\n[^\n]+){1,15})',
    full_annecke
)

annecke_start = q_counter
for m in q_matches:
    q_stem = clean_pdf_text(re.sub(r'\s+', ' ', m.group(1)).strip())
    raw_answer = m.group(2).strip()
    expl = clean_pdf_text(re.sub(r'\s+', ' ', raw_answer).strip())

    if len(q_stem) > 10 and len(expl) > 20:
        category = detect_category(q_stem + " " + expl)

        # Try to find associated image (from the same approximate page area)
        # Find which page this question is on
        q_pos = m.start()
        page_match = None
        for pm in re.finditer(r'--- PAGE (\d+) ---', full_annecke[:q_pos+500]):
            page_match = int(pm.group(1))

        image_file = None
        if page_match and page_match - 1 in annecke_images:
            image_file = f"images/{annecke_images[page_match - 1][0]}"

        item = {
            "id": f"q_{q_counter}",
            "category": category,
            "source_book": "Facharztprüfung Anästhesiologie in Fällen (Annecke & Hohn)",
            "question_type": "open",
            "question_de": q_stem,
            "question_tr": auto_translate(q_stem),
            "answer_de": expl,
            "answer_tr": auto_translate(expl),
            "explanation_de": expl,
            "explanation_tr": auto_translate(expl),
            "options_de": [],
            "options_tr": []
        }

        if image_file:
            item["image"] = image_file

        all_items.append(item)
        q_counter += 1

annecke_count = q_counter - annecke_start
print(f"  ✅ Extracted {annecke_count} questions from Annecke & Hohn")


# ─── 3C: Parse Winterhalter (1500 Fragen) ─────────────────────────────────────

print("\n📖 Parsing: Winterhalter - 1500 kommentierte Prüfungsfragen...")
pdf_path_winterhalter = 'Books/FacharztPrufung1500.pdf'
reader_winterhalter = PyPDF2.PdfReader(pdf_path_winterhalter)
full_winterhalter = ""
for idx, page in enumerate(reader_winterhalter.pages):
    text = page.extract_text()
    if text:
        full_winterhalter += f"\n--- PAGE {idx+1} ---\n" + text

# Winterhalter uses "Frage XXXX" format
w_matches = re.finditer(
    r'Frage\s+(\d+)\s*\n(.+?)(?=Frage\s+\d+\s*\n|$)',
    full_winterhalter, re.DOTALL
)

winterhalter_start = q_counter
for wm in w_matches:
    frage_num = wm.group(1)
    content = wm.group(2).strip()

    # The question is the first line/sentence, rest is the answer
    lines = content.split('\n')

    # Find the question (first substantial line ending with ?)
    q_text = ""
    answer_start = 0
    for li, line in enumerate(lines):
        q_text += " " + line.strip()
        if '?' in line:
            answer_start = li + 1
            break

    q_text = clean_pdf_text(q_text.strip())
    answer_text = clean_pdf_text('\n'.join(lines[answer_start:]).strip())

    if len(q_text) > 15 and len(answer_text) > 20:
        category = detect_category(q_text + " " + answer_text)

        all_items.append({
            "id": f"q_{q_counter}",
            "category": category,
            "source_book": "Facharztprüfung Anästhesiologie: 1500 Fragen (Winterhalter)",
            "question_type": "open",
            "question_de": q_text,
            "question_tr": auto_translate(q_text),
            "answer_de": answer_text,
            "answer_tr": auto_translate(answer_text),
            "explanation_de": answer_text,
            "explanation_tr": auto_translate(answer_text),
            "options_de": [],
            "options_tr": []
        })
        q_counter += 1

winterhalter_count = q_counter - winterhalter_start
print(f"  ✅ Extracted {winterhalter_count} questions from Winterhalter")


# =============================================================================
# SECTION 4: VERIFY TRANSLATION COVERAGE
# =============================================================================
# SECTION 4: FULL TURKISH TRANSLATIONS WITH DEEP-TRANSLATOR
# =============================================================================

print("\n🌐 Performing Full Turkish Sentence Translations...")

from concurrent.futures import ThreadPoolExecutor, as_completed
from deep_translator import GoogleTranslator

cache_file = 'translation_cache.json'
if os.path.exists(cache_file):
    with open(cache_file, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

translator = GoogleTranslator(source='de', target='tr')

def get_tr(text):
    if not text or not text.strip():
        return ""
    t = text.strip()
    if t in cache:
        return cache[t]
    try:
        res = translator.translate(t)
        cache[t] = res
        return res
    except Exception as e:
        return t

uncached_set = set()
for q in all_items:
    if q['question_type'] == 'options':
        uncached_set.add(q['stem_de'])
        for opt in q['options']:
            uncached_set.add(opt['text_de'])
            if opt['explanation_de']:
                uncached_set.add(opt['explanation_de'])
    else:
        if q.get('question_de'):
            uncached_set.add(q['question_de'])
        if q.get('answer_de'):
            uncached_set.add(q['answer_de'])

uncached_list = [t for t in uncached_set if t and t.strip() and t.strip() not in cache]
print(f"  Total unique texts: {len(uncached_set)}. Already cached: {len(uncached_set) - len(uncached_list)}. To translate: {len(uncached_list)}")

if uncached_list:
    def worker(txt):
        t = txt.strip()
        try:
            res = translator.translate(t)
            return t, res
        except Exception as e:
            return t, t
    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = [executor.submit(worker, t) for t in uncached_list]
        done = 0
        for future in as_completed(futures):
            orig, tr = future.result()
            cache[orig] = tr
            done += 1
            if done % 100 == 0 or done == len(uncached_list):
                print(f"    Translated {done}/{len(uncached_list)} items...")
                with open(cache_file, 'w', encoding='utf-8') as cf:
                    json.dump(cache, cf, ensure_ascii=False)

# Attach translations
for q in all_items:
    if q['question_type'] == 'options':
        q['stem_tr'] = get_tr(q['stem_de'])
        for opt in q['options']:
            opt['text_tr'] = get_tr(opt['text_de'])
            opt['explanation_tr'] = get_tr(opt['explanation_de']) if opt['explanation_de'] else ""
    else:
        q['question_tr'] = get_tr(q['question_de'])
        q['answer_tr'] = get_tr(q['answer_de']) if q.get('answer_de') else ""

# =============================================================================
# SECTION 5: EXPORT TO questions.js
# =============================================================================

print("\n💾 Writing questions.js...")

js_output = f"""// Facharztprüfung Anästhesiologie NRW - Complete Question Bank
// {len(all_items)} Questions (Multi-Option Interactive & Open Q&A Flashcards)
// Includes full natural Turkish sentence translations

const QUESTIONS_DATA = {json.dumps(all_items, ensure_ascii=False, indent=2)};
var EXAM_QUESTIONS = QUESTIONS_DATA;
"""

with open("questions.js", "w", encoding="utf-8") as f:
    f.write(js_output)

file_size_mb = os.path.getsize("questions.js") / (1024 * 1024)
print(f"  ✅ questions.js written ({file_size_mb:.1f} MB, {len(all_items)} questions)")
print(f"  Options questions (interactive T/F): {sum(1 for q in all_items if q['question_type'] == 'options')}")
print(f"  Open questions (flashcard Q&A): {sum(1 for q in all_items if q['question_type'] == 'open')}")
print("\n🎉 Question bank generation complete!")

