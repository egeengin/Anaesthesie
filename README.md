# Facharztprüfung Anästhesiologie - Smart Study System (NRW) 🩺

Ein modernes, interaktives Lern- und Prüfungssystem für die **Facharztprüfung Anästhesiologie (Nordrhein-Westfalen)**.

---

## 🌟 Hauptfunktionen & Features

1. **Vollständige Fragensammlung (580 Prüfungsfragen)**:
   - Exzerpiert und strukturiert aus den Standard-Prüfungswerken in `Books/` (*Kehl & Wilke, Annecke & Hohn, Winterhalter*).
   - Kategorisiert in alle Facharzt-Themengebiete (*Atemweg, Herz-Kreislauf, Klinische Chemie, Beatmung, Pharmakologie, Notfallmedizin, Regionalanästhesie, Intensivmedizin, Schmerztherapie, Geburtshilfe*).

2. **NRW Prüfungsformate Filter**:
   - **📋 Fallbasierte Prüfung (253 Fragen)**: Komplexe klinische Fälle aus Annecke & Hohn (*Präoperativ, Intraoperativ, Intensivstation*).
   - **✅ Aussagenbewertung (327 Fragen)**: Strukturierte Mehrfachaussagen aus Kehl & Wilke mit interaktiven *Richtig* / *Falsch* Toggles für jede einzelne Aussage (`a.`, `b.`, `c.`, `d.`, `e.`).
   - **🖼️ Befund- & Bilddiagnostik (15 Fragen)**: EKG, ROTEM, Röntgen, Beatmungs- und Atemwegsdiagramme direkt zu den Fragen eingebunden.

3. **100% Zweisprachiges System (Vollständige Türkische Satzübersetzung)**:
   - **Haupttext**: Vollständiger deutscher Fragentext und Erklärungen oben.
   - **Untertitel-Modus (Aktiv)**: Jeder Satz wird direkt darunter in einem übersichtlichen türkischen Infokasten (`🇹🇷 ...`) übersetzt.
   - **Hover-Modus**: Umschaltbar auf Hover-Tooltips.

4. **Passwort-Schutz (Login-Gate)**:
   - Zugangsschutz beim Öffnen der Anwendung (`egemelis`).
   - Verhindert unbefugten Zugriff. Der Anmeldestatus bleibt auf dem Gerät gespeichert.

5. **Geräte-Synchronisation & Backup**:
   - **Export**: Sichern Sie den gesamten Lernfortschritt als `.json`-Datei.
   - **Import**: Laden Sie die Backup-Datei auf jedem beliebigen Smartphone, Tablet oder Laptop hoch.

---

## 🚀 Live auf GitHub

- **Repository**: [https://github.com/egeengin/Anaesthesie.git](https://github.com/egeengin/Anaesthesie.git)
- **GitHub Pages Live URL**: [https://egeengin.github.io/Anaesthesie/](https://egeengin.github.io/Anaesthesie/)

---

## 💻 Lokale Ausführung

```bash
python3 -m http.server 8085
```
Anwendung aufrufen: `http://localhost:8085`

---

## 🔒 Zugangspasswort

Standard-Passwort: `egemelis`
