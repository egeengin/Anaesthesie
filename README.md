# Facharztprüfung Anästhesiologie — Smart Study & Oral Exam Suite (ÄKNO Düsseldorf) 🩺🎓

Ein hochmodernes, interaktives Lern- und Prüfungssystem für die **mündliche Facharztprüfung Anästhesiologie an der Ärztekammer Nordrhein (Haus der Ärzteschaft, Düsseldorf)**.

> 📖 **Ausführlicher Benutzerleitfaden**: Bitte lesen Sie die vollständige Dokumentation in [**USER_GUIDE.md**](USER_GUIDE.md).

---

## 🌟 Hauptfunktionen & Features

1. **Vollständiger, klinisch validierter Fragenkatalog (616 Prüfungsfragen)**:
   - **332 strukturierte MCQs / Mehrfachaussagen** (*Kehl & Wilke*).
   - **284 komplexe klinische Fälle** (*Annecke & Hohn, Winterhalter*).
   - **16 authentische Düsseldorfer Original-Prüfungsprotokolle** (`q_dus_01` bis `q_dus_16`) mit Prüferprofilen (*Prof. Annecke, Prof. Kienbaum, Prof. Hohn, Prof. Wappler*).
   - **0 Datenanomalien**: Alle OCR-Silbentrennungen, Formelartefakte und abgeschnittenen Zeilenenden vollständig bereinigt.

2. **Die 4-Schritte-Prüfungsmethode (Progressive Disclosure)**:
   - **Schritt 1**: Fallvorstellung & Prüfungsfrage.
   - **Schritt 2**: Vitalparameter, Hämodynamik & BGA-Befund.
   - **Schritt 3**: Prüfer-Intervention mit Audio-Ausgabe (`🔊 Prüferfrage vorlesen`) und Düsseldorfer Prüferprofil.
   - **Schritt 4**: Freischaltung der 3 High-Impact Antwortblöcke.

3. **Die 3 High-Impact Antwortblöcke**:
   - 🗣️ **"Wie sage ich es?"**: Strukturierte Formulierungshilfe & Redemittel mit nativem Aussprache-Trainer (`🔊 Redemittel vorlesen`).
   - 🎯 **Schlüsselbegriffe & Dosierungen**: Prüfer-Checkliste mit allen harten Fakten.
   - ⚠️ **Kritische Prüfungsfallen & Kardinalfehler**: K.O.-Kriterien zur Vermeidung des Durchfallens.

4. **Wissenschaftliches Spaced Repetition (SM-2)**:
   - Täglich dynamisch berechnete Wiederholungs-Queue: **`🧠 Spaced Repetition (X fällig)`**.
   - Schnelle Selbstbewertung mit <kbd>K</kbd> (*Gewusst*) oder <kbd>F</kbd> (*Nicht gewusst*).

5. **Spracherkennung (Voice Exam)**:
   - Freies mündliches Antworten per Mikrofon (<kbd>V</kbd>) via Web Speech API mit Live-Transkription.

6. **15 Notfallkarten / Pocket SOPs**:
   - Maligne Hyperthermie (Dantrolen 2,5 mg/kg), LAST & Lipid-Rescue, CICO Koniotomie, PPH, ERC ALS, DGAI S1 Rückenmarksnahe Regionalanästhesie & Antikoagulation.

7. **4 Klinische Facharztrechner**:
   - Pädiatrie (Tubus & Notfalldosen), ARDS PBW & Vt (6 & 8 ml/kg), Lokalanästhetika-Maximaldosen & Lipid-Rescue, Natriumdefizit & ODS-Sicherheitsgrenzen.

8. **45-Minuten Prüfungssimulation**:
   - Echte Simulation mit 6 randomisierten Facharzt-Fällen und digitalem Prüfungs-Timer.

9. **Verlustfreie Cloud-Synchronisation**:
   - Gehärteter Union-Merge verhindert Datenüberschreibungen zwischen Klinik-iPad und Desktop-Rechner.

---

## 🚀 Schnelleinstieg & Lokale Ausführung

```bash
# Im Projektverzeichnis ausführen:
python3 -m http.server 8080
```
Anwendung im Browser öffnen: **`http://localhost:8080`** (oder port 8085).

- **Standard-Passwort**: `egemelis`
- **In-App Leitfaden**: Klicken Sie in der oberen Leiste auf **`📖 Leitfaden`** oder lesen Sie [**USER_GUIDE.md**](USER_GUIDE.md).

---

## 🧪 Test Suite & Qualitätssicherung

```bash
node test_oral_exam_suite.js
```
✅ **23 von 23 Test-Suites bestanden (100% Coverage)**.
