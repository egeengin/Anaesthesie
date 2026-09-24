# Facharztprüfung Anästhesiologie — Smart Study & Oral Exam Suite (ÄKNO Düsseldorf) 🩺🎓

Ein hochmodernes, interaktives Lern- und Prüfungssystem für die **mündliche Facharztprüfung Anästhesiologie an der Ärztekammer Nordrhein (Haus der Ärzteschaft, Düsseldorf)**.

> 📖 **Ausführlicher Benutzerleitfaden**: Bitte lesen Sie die vollständige Dokumentation in [**USER_GUIDE.md**](USER_GUIDE.md).

---

## 🌟 Hauptfunktionen & Features

1. **Vollständiger, klinisch validierter Fragenkatalog (636 Prüfungsfragen)**:
   - **332 strukturierte MCQs / Mehrfachaussagen** (*Kehl & Wilke*).
   - **304 komplexe klinische Kasuistiken** (*Annecke & Hohn, Winterhalter*).
   - **36 authentische Düsseldorfer Original-Prüfungsprotokolle** (`q_dus_01` bis `q_dus_36`) mit detaillierten Prüferprofilen (*Prof. Annecke, Prof. Kienbaum, Prof. Hohn, Prof. Wappler*).
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

5. **Sprachaufnahme & Live-Rubrik-Auswertung (Voice Exam Cockpit)**:
   - Freies mündliches Antworten per Mikrofon (<kbd>V</kbd>) via Web Speech API mit Echtzeit-Audiowelle.
   - Automatische Signalwort-Erkennung: Gleicht die gesprochene Antwort in Echtzeit mit der Checkliste ab, berechnet Trefferquote (%) und zeigt genannte vs. vergessene Leitlinienpunkte.
   - Integrierter **60-Sekunden Antwort-Timer** (<kbd>T</kbd>).

6. **15 Notfallkarten / Pocket SOPs**:
   - Maligne Hyperthermie (Dantrolen 2,5 mg/kg), LAST & Lipid-Rescue, CICO Koniotomie, PPH, ERC ALS, DGAI S1 Rückenmarksnahe Regionalanästhesie & Antikoagulation.

7. **4 Klinische Facharztrechner**:
   - Pädiatrie (Tubus & Notfalldosen), ARDS PBW & Vt (6 & 8 ml/kg), Lokalanästhetika-Maximaldosen & Lipid-Rescue, Natriumdefizit & ODS-Sicherheitsgrenzen.

8. **45-Minuten Mündliche Prüfungssimulation (Ablenkungsfreies Cockpit)**:
   - Blendet Multiple-Choice-Optionen und Navigationsleisten automatisch aus für maximalen Prüfungsfokus.
   - 45-Minuten Gesamtuhr & 60s Antwort-Timer.

9. **Türkische Übersetzung per Ein-Klick-Ausklappung**:
   - Dezent direkt unter jedem Textabschnitt eingebetteter **🇹🇷 Türkçe Çeviri**-Button (<kbd>U</kbd>).

10. **Verlustfreie Cloud-Synchronisation & PWA-Offline-Betrieb**:
   - Gehärteter Union-Merge verhindert Datenüberschreibungen zwischen Klinik-iPad und Desktop-Rechner.
   - Vollständig offlinefähig dank modernem Service Worker.

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
✅ **24 von 24 Test-Suites bestanden (100% Coverage)**.
