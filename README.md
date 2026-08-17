# ComicVault 🦸‍♂️🦇🕷️

![Tests](https://img.shields.io/badge/Tests-216%20Passing-emerald?style=for-the-badge&logo=mocha)
![PWA](https://img.shields.io/badge/PWA-v2.4%20Ready-6d28d9?style=for-the-badge&logo=pwa)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**ComicVault** ist eine moderne, browserbasierte (PWA-fähige) Single-Page-Application (SPA) zur umfassenden Verwaltung, Analyse und Nachverfolgung deiner Comicbuch-Sammlung und Wunschliste.

---

## 🌟 Hauptfunktionen

- **📚 Sammlungsverwaltung**: Erfasse Comics mit Details wie Titel, Verlag, Kaufdatum, Preis, Lesestatus, Zustand und Sterne-Bewertungen.
- **⭐ Wunschliste & Abonnements**: Verwalte zukünftige Käufe und laufende Serien-Abos inkl. Pausierungs- und Übernahme-Funktion in die Sammlung.
- **📊 Umfangreiche Statistiken & Liniendiagramme**:
  - Lesestapel-Verlauf (TBR) im Liniendiagramm exakt abgestimmt auf Zeitraum- & Typfilter.
  - Monats- & Jahresbudgets inkl. Aufstockungen (TopUps) und Prognosen.
  - Top-10 Listen (Älteste ungelesene, teuerste Bände) und Verlagsvorlieben.
- **🧠 KI Insights & Review-Generator**: Automatische Generierung von Review-Vorschlägen und Sammlungsanalysen.
- **📱 PWA & Offline-Fähigkeit**: Service Worker (`sw.js`) und lokales Caching ermöglichen schnelles Laden und Standalone-Nutzung auf Smartphones (Android & iOS).
- **🔒 Massenbearbeitung & Sicherheit**: Bulk-Edit, Mehrfachlöschung mit Sicherheitsbestätigung, XSS-Schutz und Audit-Changelog.
- **🎨 Design & Themes**: 6 vordefinierte Farbschemata (Vibrant, Gotham, Cyberpunk etc.), anpassbare Schriftarten und Stufenlos-Schriftgrößen.

---

## 🏗️ Architektur & Projektstruktur

ComicVault ist modular aufgebaut (ES6-Module ohne schwere Build-Tools):

```text
comicvault/
├── css/                     # Styling (Vanilla CSS, Responsive Grid, Glassmorphic UI)
├── js/
│   ├── db/                  # Repository-Schicht (comicRepository, wishlistRepository, etc.)
│   ├── services/            # Geschäftslogik (statsService, duplicateService, timelineService)
│   ├── store/               # Anwendungszustand (stateStore.js)
│   ├── views/               # UI-Ansichten & Templates (collection, stats, wishlist, etc.)
│   ├── tests/               # In-Browser Testsuite (216 Mocha/Chai Unit- & Integrationstests)
│   └── app.js               # App-Hauptsteuerung & Routing
├── favicon.svg              # Vektor-Favicon (Superhero Vault Shield)
├── index.html               # SPA Einstiegspunkt
├── manifest.json            # Web App Manifest für Mobile/PWA
├── sw.js                    # Service Worker (Cache-First PWA)
└── tests.html               # Mocha/Chai Test-Runner UI
```

---

## 🚀 Schnellstart & Installation

Das Projekt nutzt native JavaScript-Module und benötigt kein komplexes Node.js-Build-Setup:

### 1. Repository klonen
```bash
git clone https://github.com/phimafusion/comicvault.git
cd comicvault
```

### 2. Lokalen Server starten
Da ES6-Module (`import/export`) verwendet werden, muss die App über einen HTTP-Server ausgeliefert werden:

**Mit Python:**
```bash
python -m http.server 8080
```

**Mit Node.js:**
```bash
npx http-server -p 8080
```

### 3. App öffnen
Navigiere im Browser zu **`http://localhost:8080`**.

---

## 🧪 Unit- & Integrationstests ausführen

Das Projekt verfügt über **216 automatisierte Tests** (Mocha & Chai):

1. Starte den lokalen Server (`http://localhost:8080`).
2. Öffne die Testsuite im Browser: **`http://localhost:8080/tests.html`**.
3. Alle **216 Testfälle** werden automatisch und isoliert in unter 4 Sekunden ausgeführt.

---

## 📚 Dokumentation & Roadmap

- **[DOCUMENTATION.md](DOCUMENTATION.md)**: Detaillierte technische Übersicht der Architektur, Repositories und Caching-Mechanismen.
- **[TODO.md](TODO.md)**: Aufgabenliste, Refactoring-Dokumentation und zukünftige Features.
