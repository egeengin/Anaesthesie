# Facharztprüfung Anästhesiologie - Smart Study System (NRW) 🩺

Ein modernes, interaktives Lern- und Prüfungssystem für die **Facharztprüfung Anästhesiologie (Nordrhein-Westfalen)**.

---

## 🌟 Hauptfunktionen & Features

1. **Vollständige Fragensammlung (599+ Prüfungsfragen)**:
   - Exzerpiert und strukturiert aus den Standard-Prüfungswerken in `Books/` (*Kehl & Wilke, Annecke & Hohn, Winterhalter*).
   - Kategorisiert in alle Facharzt-Themengebiete (*Atemweg, Herz-Kreislauf, Klinische Chemie, Beatmung, Pharmakologie, Notfallmedizin, Regionalanästhesie, Intensivmedizin, Schmerztherapie, Geburtshilfe*).

2. **Zweisprachiges System mit Türkischem Overlay (DE / TR)**:
   - **Hover-Overlay**: Beim Bewegen des Mauszeigers über deutsche Textsegmente erscheint sofort das türkische Übersetzungs-Tooltip.
   - **Untertitel-Modus**: Ein Klick auf `🇹🇷 Untertitel` blendet serielle deutsche + türkische Untertitel ein.

3. **Passwort-Schutz (Login-Gate)**:
   - Zugangsschutz beim Öffnen der Anwendung (`egemelis`).
   - Verhindert unbefugten Zugriff. Der Anmeldestatus bleibt auf dem Gerät gespeichert.

4. **Geräte-Synchronisation & Backup**:
   - **Export**: Sichern Sie den gesamten Lernfortschritt als `.json`-Datei.
   - **Import**: Laden Sie die Backup-Datei auf jedem beliebigen Smartphone, Tablet oder Laptop hoch, um nahtlos weiterzulernen.
   - **Fortschritt Zurücksetzen**: Mit Sicherheitsbestätigung zurücksetzbar.

5. **Spaced Repetition & Smart Practice Engine**:
   - Interaktive Auswertung (*Richtig* / *Falsch* / *Wiederholen*).
   - Detaillierte medizinische Erklärungen und Begründungen nach Antwortabgabe.
   - Speicherung des Lernfortschritts im `LocalStorage`.

---

## 🚀 GitHub Pages Deployment (Aktivierung)

Dieses Projekt ist eine reine Single-Page Webanwendung (HTML5, CSS3, Vanilla JS) und kann direkt über **GitHub Pages** kostenlos gehostet werden!

### Schritte zur Aktivierung auf GitHub:
1. Push auf das Repository ausführen:
   ```bash
   git add .
   git commit -m "Add Facharzt Anästhesiologie study web app codebase"
   git push origin main
   ```
2. Gehen Sie auf GitHub zu Ihrem Repository: **Settings** -> **Pages**.
3. Wählen Sie unter **Build and deployment** -> **Source**: `Deploy from a branch`.
4. Branch: `main` (oder `master`) / Root `/` -> Klicken Sie auf **Save**.
5. Nach 1–2 Minuten ist die Anwendung unter folgender URL online erreichbar:
   `https://<ihr-github-benutzername>.github.io/<repository-name>/`

---

## 💻 Lokale Ausführung

Öffnen Sie einfach `index.html` direkt im Browser, oder starten Sie einen lokalen Webserver:

```bash
python3 -m http.server 8085
```
Anwendung aufrufen: `http://localhost:8085`

---

## 🔒 Zugangspasswort

Standard-Passwort: `egemelis`
