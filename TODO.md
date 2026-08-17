# ComicVault – TODO & Roadmap 🦸‍♂️

Dieses Dokument dient als zentrale Entwicklungs-Roadmap, Refactoring-Protokoll und Aufgabenliste für **ComicVault**.

---

## 📊 Status Dashboard

| Bereich | Status | Details |
| :--- | :--- | :--- |
| **Testsuite** | 🟢 **216 / 216 Passing** | All unit & integration tests passing 100% green |
| **PWA & Mobile** | 🟢 **v2.4 Ready** | Standalone PWA, Service Worker Cache v24, Favicon & Superhero Logo |
| **Architektur** | 🟢 **Refactored** | 4 Repositories (`js/db/`), StateStore, Template Extraktion, Event Delegation |
| **Sicherheit** | 🟢 **Protected** | XSS Escaping (`escapeHTML`), Audit Changelog, Confirmation Modals |

---

## 🚀 Zukünftige Features (Geplante Roadmap)

### 📸 1. Cover-Bilder & Scans (`[2]`)
- [ ] Bildersuche und Upload für Comic-Cover hinzufügen
- [ ] Responsive Cover-Grid-Vorschau in Detail- & Sammlungsansichten
- [ ] Cover bearbeiten und löschen

### 📷 2. Barcode-Scanner & Auto-Fill (`[4]`)
- [ ] Barcode-Scanner (ISBN/EAN) über Smartphone-Kamera (z. B. via QuaggaJS / HTML5-QRCode)
- [ ] Automatisches Abfragen von Metadaten über freie APIs (z. B. Open Library / Google Books)

### 🤖 3. Automated CI/CD Test Pipeline (`[8]`)
- [ ] GitHub Actions Workflow (`.github/workflows/test.yml`)
- [ ] Automatisches Ausführen der 216 Mocha-Tests via Headless Playwright/Chrome bei jedem Push / PR
- [ ] Build Status Badge im README einbinden

### 📤 4. Native Web Share API (`[12]`)
- [ ] Teilen-Funktion zur Weitergabe von Comics und Wunschlisten-Einträgen auf Mobilgeräten via Messenger/Mail

---

## 🛠️ Geplante Refactorings & Code-Qualität

### 📦 1. Zentrales Storage Management (`storageService.js` - `[20]`)
- [ ] Kapselung aller `localStorage`-Zugriffe (Theme, Schriftgröße, Spaltenbreiten, sichtbare Felder, Mockup-Modus) in einem zentralen Service
- [ ] Typisierte Keys, Default-Werte und sichere JSON-Serialisierung

### 🧩 2. Konsolidierung von Utility-Modulen (`[22]`)
- [ ] Strukturierung verstreuter Hilfsfunktionen (`utils.js` & `statsUtils.js`) in fokussierte Module (`dateUtils.js`, `formatUtils.js`, `domUtils.js`)

---

## ✅ Bereits Umgesetzte Meilensteine & Refactorings

### 🏛️ 4-Stufen Architektur-Refactoring (Abgeschlossen)
- [x] **Stufe 1: Modularisierung der Datenbankschicht (`db.js`)**
  - Zerlegung in 4 Repositories unter `js/db/`: `comicRepository.js`, `wishlistRepository.js`, `settingsRepository.js`, `changelogRepository.js`.
  - Facade-Pattern in `db.js` zur Abwärtskompatibilität beibehalten.
- [x] **Stufe 2: View Template Extraktion & Modale**
  - Entkopplung von `importProtocolModal.js` und `duplicateCard.js`.
- [x] **Stufe 3: Service-Schicht & Utility-Modularisierung**
  - Extraktion von `formatters.js` und `duplicateService.js`.
- [x] **Stufe 4: State-Store & Auth-Tests**
  - Einführung von `stateStore.js`.
  - Auth-Modultests in `js/tests/auth.test.js`.
  - Automated Selenium/Chrome Testrunner Verification (`verify_tests.py`).

### 📱 PWA & Branding (Abgeschlossen)
- [x] **PWA Integration (`manifest.json` & `sw.js`)**
  - Service Worker Caching (Cache-First) & Offline-Fähigkeit.
  - In-App Installations-Prompt in den Einstellungen.
- [x] **Superhero Logo & Branding v2.4**
  - Neues Superhero Vault Shield Logo & `favicon.svg` (Vorschlag C).
  - Prominentes Splash-Screen Logo auf dem Login-Bildschirm.
  - Branding Banner Header in den Einstellungen.
  - Service Worker Cache Upgrade auf `comicvault-v24`.

### 📈 Statistiken & Liniendiagramm-Abgleich (Abgeschlossen)
- [x] **Liniendiagramm exakt an KPI-Filter angeglichen**
  - Filterung gültiger Bestands-Comics (`vorhanden`, `vorbestellt`, `verliehen`) im `timelineService.js`.
  - Entfernen von Jan 2023 Platzhalter-Ausschlüssen in `kpiService.js` und `timelineService.js`.
  - Neuer Zeitraum-Filter `"currentAndLastYear"` ("Laufendes & letztes Jahr") als Standard gesetzt.

### 🔒 Sicherheit & Performance (Abgeschlossen)
- [x] **XSS-Schutz & Output Escaping** (`escapeHTML` in Subscriptions, Changelog, AI Insights, Budget)
- [x] **Event-Delegation im Grid** (1 Listener am Container statt N Listener)
- [x] **1 Durchlauf Filter-Berechnung** (`forEach` mit Sets)
- [x] **Datumsparsen Memoisierung**
