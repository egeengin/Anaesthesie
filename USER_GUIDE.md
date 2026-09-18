# 📖 Facharztprüfung Anästhesiologie — Offizieller Benutzerleitfaden & Lernsystem

> **Zielgruppe**: Maßgeschneidert für die Vorbereitung auf die mündliche Facharztprüfung an der **Ärztekammer Nordrhein (Haus der Ärzteschaft, Düsseldorf)**.

---

## 📑 Inhaltsverzeichnis
1. [Schnellstart & Erste Schritte](#1-schnellstart--erste-schritte)
2. [Die 4-Schritte-Prüfungsmethode (Progressive Disclosure)](#2-die-4-schritte-prüfungsmethode-progressive-disclosure)
3. [Die 3 High-Impact Antwortblöcke](#3-die-3-high-impact-antwortblöcke)
4. [Aussprache-Trainer & Audio-Funktionen (Speech Synthesis)](#4-aussprache-trainer--audio-funktionen-speech-synthesis)
5. [Sprachaufnahme & Simulation mündlicher Antworten (Voice Exam)](#5-sprachaufnahme--simulation-mündlicher-antworten-voice-exam)
6. [Spaced Repetition (SM-2) & "Heute fällig"-Filter](#6-spaced-repetition-sm-2--heute-fällig-filter)
7. [Düsseldorfer Prüfungskommission & 16 Original-Protokolle](#7-düsseldorfer-prüfungskommission--16-original-protokolle)
8. [Notfallkarten & Pocket SOPs (15 interaktive Karten)](#8-notfallkarten--pocket-sops-15-interaktive-karten)
9. [Klinische Rechner & Formeln](#9-klinische-rechner--formeln)
10. [45-Minuten Mündliche Prüfungssimulation](#10-45-minuten-mündliche-prüfungssimulation)
11. [Tastatur-Kurzbefehle (Keyboard Shortcuts)](#11-tastatur-kurzbefehle-keyboard-shortcuts)
12. [Cloud-Synchronisation, Backup & Multi-Device Nutzung](#12-cloud-synchronisation-backup--multi-device-nutzung)
13. [PWA-Installation & Offline-Nutzung (iOS / Android)](#13-pwa-installation--offline-nutzung-ios--android)

---

## 1. Schnellstart & Erste Schritte

### 🔑 Anmeldung & Passwort-Schutz
- Beim ersten Aufruf der Web-App erscheint das **Passwort-Gate**.
- Standard-Passwort: `egemelis`
- Das System speichert die Autorisierung lokal auf Ihrem Gerät (`localStorage`), sodass Sie das Passwort bei täglicher Nutzung nicht erneut eingeben müssen.

### 🧭 Navigation & Filterleiste
Oben im Dashboard finden Sie:
- **Kompakter Fortschrittsbalken**: Gesamtfortschritt (0 / 616 Fragen), Erfolgsquote (Quote %), Tagesziel (z. B. 0/20) und tägliche Lernserie (Streak in Tagen).
- **Themen-Filter (Chips)**:
  - `Alle (616)`: Gesamter Fragenkatalog.
  - `Offene Fälle (284)`: Komplexe mündliche Kasuistiken.
  - `ÄKNO Protokolle (16)`: Authentische Düsseldorfer Prüfungsprotokolle mit Prüferprofilen.
  - `🧠 Spaced Repetition (X fällig)`: Fragen, die nach dem SuperMemo-2-Algorithmus heute zur Wiederholung anstehen.
  - `⭐ Favoriten`: Ihre mit dem Stern markierten Lernkarten.
  - `⚠️ K.O.-Fallen`: Fragen mit tödlichen Fehlern / Prüfungsfallen.
- **Kategoriemenü**: 21 anästhesiologische Subspezialitäten (Atemweg, Kardio, Neuro, Kinder, Geburtshilfe, Schmerz, Intensiv, etc.).
- **Live-Suche (`⌘K` oder Suchleiste)**: Schnelle Volltextsuche nach Wirkstoffen, Leitlinien oder Krankheitsbildern.

---

## 2. Die 4-Schritte-Prüfungsmethode (Progressive Disclosure)

In der mündlichen Prüfung am Tisch im Haus der Ärzteschaft erhalten Sie die Informationen schrittweise. Die App bildet diese Prüfungssituation 1:1 nach:

```
[Schritt 1: Fallvorstellung & Frage]
         ↓
[Schritt 2: Vitalparameter & BGA-Befund]
         ↓
[Schritt 3: Prüfer-Intervention & Zwischenfrage]
         ↓
[Schritt 4: Musterantwort & Bewertungsrubrik]
```

1. **Schritt 1: Fallvorstellung (Kasuistik)**:
   - Lesen Sie die initiale Patientensituation und die Fragestellung.
   - Bilden Sie sich gedanklich sofort Ihre Verdachtsdiagnose und Ihr Prioritätenschema (cABCDE).
2. **Schritt 2: Vitalparameter & BGA-Panel**:
   - Klicken Sie auf *Schritt 2 einblenden* (oder Taste `2`).
   - Beurteilen Sie Herzfrequenz, Blutdruck, SpO₂, EtCO₂ und BGA (pH, pO₂, pCO₂, BE, Laktat).
3. **Schritt 3: Prüfer-Nachfrage & Zwischenfrage**:
   - Klicken Sie auf *Schritt 3 einblenden* (oder Taste `3`).
   - Der Prüfer konfrontiert Sie mit einer akuten Verschlechterung (z. B. plötzlicher Blutdruckabfall, Hypoxämie, Rhythmusstörung).
   - Bei Düsseldorfer Fällen: Über das **🏛️ ÄKNO Düsseldorfer Prüfer-Profil** sehen Sie den Prüfernamen, dessen klinischen Schwerpunkt, Fallen und Signalwörter.
4. **Schritt 4: Musterantwort & Bewertungsrubrik**:
   - Klicken Sie auf *Schritt 4 freischalten* (oder Taste `4` / `Space`).
   - Überprüfen Sie Ihre eigene Antwort anhand der 3 High-Impact Antwortblöcke.

---

## 3. Die 3 High-Impact Antwortblöcke

Jede Frage enthält strukturierte Rubrik-Karten, die exakt auf die Notengebung der Prüfungskommission ausgerichtet sind:

### 🗣️ Block 1: "Wie sage ich es?" (Strukturierte Formulierungshilfe & Redemittel)
- Liefert Ihnen den optimalen Einstiegssatz und die verbale Struktur für Ihre Antwort.
- Vermeidet unstrukturiertes Herumreden und demonstriert sofortige Souveränität und Führungsanspruch (*Crisis Resource Management*).
- Enthält den Button **`🔊 Redemittel vorlesen`** zum Anhören der korrekten Betonung.

### 🎯 Block 2: Schlüsselbegriffe & Dosierungen (Prüfer-Checkliste)
- Die stichpunktartige Liste aller harten medizinischen Fakten, Leitlinienwerte und Dosierungen, die der Prüfer auf seinem Protokollbogen abhakt.
- Wichtige Medikamentendosierungen (z. B. *Dantrolen 2,5 mg/kg*, *Sugammadex 16 mg/kg*, *Intralipid 1,5 ml/kg*) sind optisch hervorgehoben.

### ⚠️ Block 3: Kritische Prüfungsfallen & Kardinalfehler (K.O.-Kriterien)
- Hebt die gefährlichen Fehler hervor, die zum sofortigen Nichtbestehen der Prüfung führen können (z. B. *Permissive Hypotonie bei Schädel-Hirn-Trauma*, *Spinalanästhesie bei schwerer Aortenklappenstenose*, *Calciumantagonisten bei Maligner Hyperthermie*, *Succinylcholin bei Dialysepatient mit Hyperkaliämie*).

---

## 4. Aussprache-Trainer & Audio-Funktionen (Speech Synthesis)

Für ausländische Kolleginnen und Kollegen sowie für maximale Sprachpräzision verfügt die Suite über eine integrierte Sprachausgabe mit deutscher Sprachintonation (`de-DE`):

1. **🔊 Fragentext vorlesen** (Karten-Kopfzeile):
   - Liest den Fall und die Ausgangsfrage vor.
2. **🔊 Prüferfrage vorlesen** (Schritt 3):
   - Simuliert die direkte Ansprache durch den Prüfungsvorsitzenden. Hören Sie sich die Frage an und antworten Sie laut!
3. **🔊 Redemittel vorlesen** (Schritt 4):
   - Liest die Modellantwort im idealen Prüfungsrhythmus vor (Tempo: 0,92). Nutzen Sie die "Shadowing"-Technik: Hören Sie den Satz und sprechen Sie ihn laut nach!

---

## 5. Sprachaufnahme & Simulation mündlicher Antworten (Voice Exam)

- Klicken Sie auf **`🎙️ Antwort einsprechen (V)`** (oder Taste `V`).
- Das System nutzt die Web Speech API für eine Live-Spracherkennung im Browser.
- Sprechen Sie Ihre Antwort frei und laut auf Deutsch ein.
- Ihr Transkript wird in Echtzeit angezeigt und nach dem Aufdecken der Antwort mit den Schlüsselbegriffen der Prüfer-Checkliste abgeglichen!

---

## 6. Spaced Repetition (SM-2) & "Heute fällig"-Filter

Das System nutzt den wissenschaftlich bewährten **SuperMemo-2 (SM-2) Spaced Repetition Algorithmus**:

- Nach dem Aufdecken der Antwort bewerten Sie sich selbst:
  - **`Gewusst (4)`** (Taste `K` oder `G`): Das Wiederholungsintervall verlängert sich (z. B. von 1 Tag auf 6 Tage, dann 15 Tage).
  - **`Nicht gewusst (1)`** (Taste `F`): Die Karte wird auf Intervall 1 Tag zurückgesetzt und der Ease-Factor leicht gesenkt.
- Klicken Sie oben auf den Filter-Chip **`🧠 Spaced Repetition (X fällig)`**, um gezielt nur diejenigen Fragen abzuarbeiten, deren Wiederholungsdatum heute erreicht ist.

---

## 7. Düsseldorfer Prüfungskommission & 16 Original-Protokolle

Klicken Sie in der oberen Menüleiste auf **`🎓 Düsseldorfer Prüfer & Protokolle`** (oder nutzen Sie den Themenfilter `ÄKNO Protokolle`).

### Die 4 Düsseldorfer Leitfiguren:
1. **Prof. Dr. T. Annecke (Klinikum Leverkusen)**:
   - *Fokus*: cABCDE, Thoraxanästhesie (DLT-Hypoxie-Algorithmus), Schockraum, Leber/Dialyse.
   - *Prüfungsfalle*: Zuwarten bei Hals-Hämatom nach Karotis-TEA (K.O. = sofortige Nahtöffnung am Bett!).
2. **Prof. Dr. P. Kienbaum (Universitätsklinikum Düsseldorf - UKD)**:
   - *Fokus*: Hämodynamik, invasive Blutdruckmessung, SHT vs. Polytrauma, BGA-Interpretation.
   - *Prüfungsfalle*: Permissive Hypotonie bei SHT (MAP muss ≥ 80–90 mmHg gehalten werden!).
3. **Prof. Dr. C. Hohn (Klinikum Köln-Kalk)**:
   - *Fokus*: Muskelrelaxometrie (quantitative TOF-Messung), Sugammadex, Schrittmacher/ICD, Sepsis.
   - *Prüfungsfalle*: Extubation bei TOF < 0,9; Magnet auf ICD legt nur Schockfunktion lahm, schaltet nicht asynchron!
4. **Prof. Dr. A. Wappler (Kliniken Köln - Merheim)**:
   - *Fokus*: Maligne Hyperthermie (MH-Experte), Lokalanästhetika-Toxizität (LAST), Phäochromozytom.
   - *Prüfungsfalle*: Calciumantagonisten bei MH sind absolut kontraindiziert (Gefahr des irreversiblen Herzstillstands!).

---

## 8. Notfallkarten & Pocket SOPs (15 interaktive Karten)

Klicken Sie auf **`📇 Notfallkarte`**, um 15 interaktive Taschen-SOPs mit Dosierungsempfehlungen aufzurufen:
1. **Maligne Hyperthermie (MH)**: Dantrolen 2,5 mg/kg, Kühlung, Hyperventilation.
2. **LAST & Lipid Rescue**: Intralipid 20 % (1,5 ml/kg Bolus, dann 0,25–0,5 ml/kg/min).
3. **CICO (Cannot Intubate, Cannot Oxygenate)**: Skalpell-Bougie-Tubus Koniotomie nach DGAI.
4. **Anaphylaxie**: Adrenalin i.v. titriert (10–20 µg Boli), Vollelektrolytlösung, H1/H2-Blocker, Hydrokortison.
5. **Postpartale Blutung (PPH)**: Oxytocin, Sulproston, Fibrinogen, Tranexamsäure (1 g).
6. **Reanimation (ERC ALS)**: Rhythmusanalyse, Defibrillation, Amiodaron 300 mg / 150 mg, Adrenalin 1 mg alle 3–5 min.
7. **DGAI S1 Rückenmarksnahe Regionalanästhesie & Antikoagulation**: Vollständige Zeitabstände (Prophylaxe vs. Therapie) für NMH, UFH, DOAKs (Rivaroxaban, Apixaban, Edoxaban, Dabigatran) vor Punktion und Katheterzug.
8. **ÄKNO Düsseldorf – Prüfungskommission & KO-Kriterien**: Zusammenfassende Prüfermatrix.
9. *Weitere Karten*: Pädiatrische Notfälle, Laryngospasmus, Status epilepticus, Transfusionsreaktionen, etc.

---

## 9. Klinische Rechner & Formeln

Klicken Sie auf **`🧮 Rechner`** für 4 sofort einsatzbereite klinische Facharztrechner:
1. **Pädiatrie-Rechner**:
   - Eingabe: Alter (Monate/Jahre) und Gewicht.
   - Berechnung: Tubusgröße (mit/ohne Cuff), Tubustiefe, Larynxmaske, Notfallmedikamente (Adrenalin, Atropin, Glucose 10 %).
2. **ARDS & Lungenprotektive Beatmung**:
   - Eingabe: Körpergröße und Geschlecht.
   - Berechnung: Idealgewicht (PBW - *Predicted Body Weight* nach Devine-Formel) und exaktes Tidalvolumen (6 ml/kg und 8 ml/kg).
3. **Lokalanästhetika-Maximaldosen & Intralipid-Rescue**:
   - Berechnung: Maximale sichere Einzeldosis (Bupivacain, Ropivacain, Mepivacain, Lidocain) mit und ohne Adrenalin.
   - Intralipid 20 % Rescue-Dosierung (Initialbolus und Infusionsrate).
4. **Natriumdefizit & ODS-Sicherheitsgrenzen**:
   - Berechnung des Natriumdefizits bei Hyponatriämie.
   - **Strikte Sicherheitsgrenze**: Maximaler Anstieg von **+8 bis 10 mmol/l in 24 Stunden** zur Vermeidung der osmotischen Demyelinisierung (ODS / pontine Myelinolyse).

---

## 10. 45-Minuten Mündliche Prüfungssimulation

Klicken Sie auf **`⏱️ 45-Min Prüfung`**, um eine echte Prüfungssimulation zu starten:
- Generiert ein Prüfungsset aus **6 randomisierten Fällen** aus verschiedenen Schwerpunkten (Allgemeinchirurgie, Kardio, Trauma, Pädiatrie, Geburtshilfe, Notfall).
- **HUD-Timer**: 45 Minuten Gesamtuhr mit Zeitanzeige pro Frage (ca. 7 Minuten pro Fall).
- Trainiert das Zeitmanagement und das schnelle Umschalten zwischen verschiedenen klinischen Themen.

---

## 11. Tastatur-Kurzbefehle (Keyboard Shortcuts)

Für maximal schnelles Lernen am Desktop oder Laptop:

| Taste | Aktion | Beschreibung |
|:---:|:---|:---|
| <kbd>Space</kbd> / <kbd>Enter</kbd> | **Weiterblättern / Aufdecken** | Schaltet schrittweise durch Schritt 1 → 2 → 3 → 4 |
| <kbd>1</kbd> | **Schritt 1** | Springt zur Fallvorstellung & Prüfungsfrage |
| <kbd>2</kbd> | **Schritt 2 (Vitals)** | Blendet Vitalparameter & BGA ein/aus |
| <kbd>3</kbd> | **Schritt 3 (Prüfer)** | Blendet Prüfer-Intervention & Zwischenfrage ein/aus |
| <kbd>4</kbd> | **Schritt 4 (Rubrik)** | Deckt Musterantwort & die 3 High-Impact Blöcke auf |
| <kbd>K</kbd> / <kbd>G</kbd> | **Gewusst (4)** | Bewertet die Frage als erfolgreich (SM-2) |
| <kbd>F</kbd> | **Nicht gewusst (1)** | Bewertet die Frage zur zeitnahen Wiederholung (SM-2) |
| <kbd>U</kbd> | **Türkisch umschalten** | Öffnet/schließt die türkische Satzübersetzung |
| <kbd>P</kbd> | **Aussprache anhören** | Spielt die deutsche Sprachausgabe für Redemittel/Frage ab |
| <kbd>V</kbd> | **Mikrofon an/aus** | Startet/stoppt die Spracherkennung (Voice Exam) |
| <kbd>T</kbd> | **Timer umschalten** | Startet den 60-Sekunden Antwort-Timer |
| <kbd>→</kbd> / <kbd>D</kbd> | **Nächste Frage** | Geht zur nächsten Frage im aktuellen Filter |
| <kbd>←</kbd> / <kbd>A</kbd> | **Vorherige Frage** | Geht zur vorherigen Frage |
| <kbd>M</kbd> | **Merken (Stern)** | Markiert die Frage als Favorit / Wiederholen |
| <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> | **Schnellsuche** | Fokussiert die Suchleiste |

---

## 12. Cloud-Synchronisation, Backup & Multi-Device Nutzung

### ☁️ Automatische Cloud-Synchronisation
- Wenn Sie online sind, synchronisiert die App Ihre Antworten, Lesezeichen, SM-2-Zeitpläne und Notizen automatisch mit der gesicherten Cloud.
- **Gehärteter Union-Merge**: Wenn Sie vormittags in der Klinik auf dem iPad lernen und abends am MacBook sitzen, werden Fortschritte intelligent zusammengeführt – kein Überschreiben von neueren Notizen oder Intervallen!
- **Status-Badge**: Oben rechts zeigt das Wölkchen:
  - 🟢 *Synchronisiert*
  - 🟡 *Wird synchronisiert...*
  - ⚪ *Offline (Lokal gesichert)*

### 💾 Manuelles Backup (Export & Import)
- Unter **`⚙️ Einstellungen`**:
  - **Lernfortschritt exportieren**: Lädt eine `.json`-Datei mit allen Antworten und Notizen herunter.
  - **Lernfortschritt importieren**: Stellt Ihre Daten auf jedem Gerät wieder her.

---

## 13. PWA-Installation & Offline-Nutzung (iOS / Android)

Die Anwendung ist als **Progressive Web App (PWA)** konzipiert und funktioniert dank Service Worker vollständig ohne Internetverbindung:

### 📱 Installation auf dem iPhone / iPad (Safari)
1. Öffnen Sie die URL in **Safari**.
2. Tippen Sie auf das **Teilen-Symbol** (Viereck mit Pfeil nach oben).
3. Wählen Sie **"Zum Home-Bildschirm"** (*Add to Home Screen*).
4. Tippen Sie auf **Hinzufügen**.
5. Die App öffnet sich nun im randlosen Vollbildmodus wie eine native iOS-App und speichert alle 616 Fragen offline auf Ihrem Gerät!

### 🤖 Installation auf Android (Chrome)
1. Öffnen Sie die URL in **Google Chrome**.
2. Tippen Sie auf die drei Punkte oben rechts und wählen Sie **"App installieren"** oder **"Zum Startbildschirm hinzufügen"**.

---

*Viel Erfolg bei der Vorbereitung und ein souveränes Bestehen der Facharztprüfung an der Ärztekammer Nordrhein!* 🩺🎓
