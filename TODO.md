# ComicVault - TODO List

Diese Liste dient als Notizzettel für zukünftige Aufgaben, Ideen und Refactorings.

---

## 🚀 Zukünftige Features & Ideen

- [x] **[1] Mobiles Design / Responsive / Handy**
- [ ] **[2] Cover Bilder / Scans**
  - Bilder suchen und hinzufügen
  - Bilder anzeigen
  - Bilder bearbeiten
  - Bilder löschen
- [ ] **[4] Barcode-Scanner (ISBN/EAN) & Auto-Fill** über Kamera und offene API (z. B. Google Books / Open Library)
- [ ] **[5] Wunschzettel-Transfer („In Sammlung verschieben“)** mit Vorausfüllen der Daten
- [ ] **[6] Erweiterte Lese-Statistiken & Lese-Challenge** (monatliche Trends, Jahresziel-Fortschrittsbalken)
- [ ] **[7] Preisentwicklung & Wert-Tracker** (Vergleich Kaufpreis vs. aktueller Schätzwert)
- [ ] **[8] Automatisierte Test-Pipeline (CI/CD via GitHub Actions)**
  - Ausführung der Mocha-Tests headless (z. B. via Playwright/Puppeteer) bei jedem Pull Request
- [ ] **[9] Offline-Modus & Progressive Web App (PWA)**
  - Lokaler Offline-Speicher (IndexedDB) zur Ansicht der Sammlung ohne Internet
  - Service Worker für schnelles Laden und Offline-Nutzung
- [ ] **[10] Erweiterter Export & Import**
  - Filtermöglichkeiten beim Export (z. B. nur bestimmte Verlage oder nur Wunschliste)
  - Fortschrittsanzeige für sehr große Importe weiter verfeinern
- [x] **[11] App-Installation auf Mobilgerät** → Als PWA umgesetzt (kein Capacitor/APK)
  - Umgesetzt via Web App Manifest (`manifest.json`) + Service Worker (`sw.js`)
  - Installierbar auf Android & iOS direkt aus dem Browser ("Zum Startbildschirm hinzufügen")
  - In-App-Installations-Prompt über den `beforeinstallprompt`-Event in den Einstellungen hinzugefügt
  - Service-Worker-Update-Benachrichtigung (Toast "Neu laden") bei neuen Versionen hinzugefügt
  - Dynamisches Anpassen des `theme-color` Meta-Tags entsprechend dem gewählten Theme zur Einfärbung der Statusleiste
  - Läuft im Standalone-Modus (kein Browser-Chrome, wie eine native App)
  - Service Worker cached alle App-Dateien (Cache-First) → schnelles Laden, Offline-fähig
  - Firestore-Daten bleiben weiterhin live synchronisiert (Firebase läuft über das Netz)
- [ ] **[12] Teilen-Funktion (Web Share API)** zur nativen Weitergabe von Comics und der Wunschliste auf Mobilgeräten via Messenger, E-Mail etc.

---

## 🛠️ Performance & Refactoring (Bereits Umgesetzt)

- [x] **[12a] collection.js – Event-Delegation statt direkter Listener pro Comic-Item**
  - *Problem:* `updateGrid()` hängt bei jedem Render 2 Listener × N Comics ans DOM (z. B. 500 Comics = 1.000 Listener, werden nicht aufgeräumt).
  - *Fix:* 1 delegierter Click-Handler am grid-Container statt `querySelectorAll().forEach(addEventListener)`.
- [x] **[12b] collection.js – Filter-Optionen in einem statt 5 Durchläufen berechnen**
  - *Problem:* `renderCollection()` iteriert die Comics-Liste 5× separat (je eine `.map()` für Verlag, Format, Bestand, Quelle, Serie).
  - *Fix:* Ein einziges `forEach` mit 5 Sets.
- [x] **[12c] collection.js – Datumsparsen memoisieren**
  - *Problem:* `parseToDate()` wird bei aktiven Datumsfiltern bei JEDEM `updateGrid()`-Aufruf für jedes Comic neu aufgerufen (mit Regex).
  - *Fix:* `_kaufdatumDate` und `_gelesenAmDate` einmalig berechnen und am Comic-Objekt cachen.
- [x] **[12d] stats.js – 6 .map()-Iterationen auf 1 forEach reduzieren**
  - *Problem:* `renderStats()` berechnet Filter-Optionen mit 6 separaten `.map()-Aufrufen über die gesamte Comics-Liste.
  - *Fix:* Ein einziges `forEach` mit 6 Sets (gleiche Methode wie 12b).
- [x] **[12e] CSS & Templates – Auslagern von Inline-Styles in components.css**
  - *Problem:* `templates.js` (`.list-item`) und `collection.js` (`.list-header`) enthalten lange Inline-Styles (führt zu CSS-Redundanz und `!important` in Media Queries).
  - *Fix:* Nur dynamische Grid-Spalten inline belassen, restliche Styles in CSS-Klassen überführen und die `!important`-Regeln in den Media Queries bereinigen.
- [x] **[12f] settings.js – HTML-Templates auslagern**
  - *Problem:* Große HTML-Templates lagen inline in der View-Datei, was Logik und Präsentation vermischte.
  - *Fix:* Templates in eine eigene `settingsTemplates.js` extrahiert und in `settings.js` importiert.

---

## 🎨 Redesign (Bereits Umgesetzt)

- [x] **[13] Detailansicht & Rasteransicht**
  
  ### 1. Rasteransicht (Grid / Tiles View)
  - [x] **Cover Art Focus (Seitenverhältnis 2:3)**: Feste Bildhöhen und ein sauberes Porträt-Format.
  - [x] **Glassmorphic Info-Overlays**: Titel, Serie und Nummer liegen elegant als leicht transparentes, verschwommenes overlay über dem unteren Teil des Bildes.
  - [x] **Micro-Animations & Hover**: Feiner Zoom des Covers (`transform: scale(1.05)`) und violetter Leuchteffekt bei Hover.
  - [x] **Smarte Badges**: Status-Pills (z. B. "Ungelesen" / "Vorhanden") werden direkt semi-transparent in die Ecken des Covers projiziert.
  - [x] **Responsive CSS-Grid**: Dynamische Spaltenaufteilung mittels `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))` bzw. `minmax(520px, 1fr)` für Details.
 
  ### 2. Detailansicht (Detail Card / Detail View)
  - [x] **Zweispaltiges Premium-Layout**:
    - *Links (Das Cover):* Großes Cover mit 3D-Bücherrücken-Effekt (Falz, Glanzverlauf und Schattenwurf).
    - *Rechts (Die Metadaten):* Klare typografische Hierarchie. Großer, markanter Titel in der Schriftart *Outfit*, gefolgt von Sub-Infos.
  - [x] **Zweispaltige Key-Value-Tabelle**: Technische Daten in ein strukturiertes Grid gepackt mit dezenten, abwechselnden Hintergrundschattierungen.
  - [x] **Zustands- & Bewertungs-Visualisierung**: Sterne-Bewertungen erhalten eine markante, leuchtende Farbgebung. Farbcodierte Status-Badges für den Zustand (z. B. grün für Mint, rot für Poor).
  - [x] **Notizblock-Bemerkungsbereich**: Bemerkungen in einer Box im gelblichen Notepad-Stil dargestellt.
  - [x] **Prominente Aktionsleiste (Action Bar)**: Buttons für "Bearbeiten", "Löschen" und die Schnellaktion "Gelesen" (sofern ungelesen).
 
  ### 3. Listenansicht (List View Quick Actions)
  - [x] **Schnellaktionen pro Zeile**:
    - Hinzufügen eines kreisrunden, smaragdgrünen "Gelesen"-Buttons mit weißem Haken direkt links neben dem Löschen-Button für ungelesene Bände.
    - Hover-Effekt: Volle Farbausfüllung, Leuchteffekt (`box-shadow`) und Vergrößerung auf `1.15x`.

---

## ⚡ Aktuelle Phasen & Refactorings

### [14] Phase 3: Test-Performance verbessern (tick() Helper) [Umgesetzt]
- [x] **Problem**: Mocha-Tests nutzen über 60-mal `await new Promise(r => setTimeout(r, 50))` (oder höher), was die Gesamttestzeit künstlich um mehrere Sekunden verlängert.
- [x] **Lösung (tick() Helper & PWA Bugfix)**: 
  - Füge `export function tick(ms = 0) { return new Promise(r => setTimeout(r, ms)); }` in die `js/tests/testHelper.js` ein.
  - Ersetze alle manuellen `setTimeout`-Pausen in den Testdateien durch `await tick()`. Dadurch löst die Event-Loop direkt auf, ohne 50ms in "Echtzeit" zu warten.
  - Behebe einen PWA/UI-Bug in `wishlist.js`, indem nicht-abgelaufene Timeouts gelöscht werden (`clearTimeout`), was Race Conditions in schnellen Tests und realer Nutzung verhindert.
- [x] **Verifikation**: Die Tests in `tests.html` laufen weiterhin fehlerfrei durch, und die Gesamtausführungszeit sank drastisch von 6,5s auf unter 3s.

### [15] Phase 4: XSS-Sicherheitslücken beheben [Umgesetzt]
- [x] **Problem**: Mehrere Views (`subscriptions.js`, `changelog.js`, `aiInsights.js`, `budget.js`) rendern benutzereigene Daten ungesichert in das DOM (mittels `${var}` in innerHTML), was zu Cross-Site Scripting (XSS) führen kann.
- [x] **Lösung (escapeHTML-Integration)**:
  - Importiere `escapeHTML` aus `../utils.js` (bzw. entsprechendem relativen Pfad) in den vier betroffenen Modulen.
  - Verwende `escapeHTML` für alle potenziell benutzergesteuerten Datenfelder bei der String-Interpolation für das DOM.
- [x] **Verifikation**:
  - Füge automatisierte Tests hinzu, die überprüfen, ob Script-Tags in diesen Ansichten sicher escaped werden.
  - Test-Caching Problem in `tests.html` gelöst.
  - Manuelle Stichprobe über die Test-Suite (erfolgreich).

### [16] Phase 5: Langsame Integrationstests beschleunigen [Umgesetzt]
- [x] **Problem**: Einige Integrationstests (insb. JSON-Import-Tests) benötigen über 100 ms pro Test, da sie aufwendige DOM-Rendering-Zyklen auslösen und künstliche Timeouts im Import-Code für UI-Aktualisierungen aufrufen.
- [x] **Lösung (Event-basierte Synchronisation & Testmodus)**:
  - Vermeidung von teuren DOM-Reflows (`scrollTop`) bei aktivem `window.__TESTING__`.
  - Deaktivieren der künstlichen 10ms `setTimeout`-Pausen im Import-Service im Testmodus.
  - Einführung eines `'import-completed'` Custom Events zur synchronen und deterministischen Fortführung der Tests.

### [17] Phase 6: Mobile Ansichten für Tabellen reparieren [Umgesetzt]
- [x] **Problem**: Die Tabellen der Wunschliste, der TBR-Entwicklung (Statistiken) und der Budgets waren auf Mobilgeräten extrem gestaucht, ragten über den Bildschirmrand hinaus und wurden abgeschnitten, da `.details-card` mobil Flex-Zentrierung verwendet.
- [x] **Lösung (Block-Layout & Mindestbreiten)**:
  - Einführung der CSS-Klasse `.details-card.table-card` mit `display: block !important` und `width: 100% !important`, um das Dehnen des Flex-Containers auf Mobilgeräten zu verhindern.
  * Zuweisung gesunder Mindestbreiten (`650px` für Wunschliste/Lesestapel, `950px` für Monatsbudget) und Nutzung von `white-space: nowrap !important;` für Geldbeträge, um Zeilenumbrüche zu verhindern.
  * Dadurch lassen sich alle Tabellen mobil innerhalb der Karte horizontal scrollen.
- [x] **Verifikation**: Visuelle Prüfung im Mobilmodus und erfolgreicher Durchlauf aller 165 Tests.

### [18] Phase 7: Globale Schriftgrößen-Auswahl in Einstellungen [Umgesetzt]
- [x] **Problem**: Der Wunsch nach flexibler Schriftgrößen-Ausgabe (z. B. eine kleinere Schriftart für noch kompaktere Mobil- und Tabellendarstellungen).
- [x] **Lösung (Root-Font-Size-Skalierung)**:
  - Integration eines Dropdowns für die Schriftgröße ("Klein", "Mittel", "Groß") im Bereich "Design & Themes" in den Einstellungen.
  - Dynamisches Setzen der Klassen `font-size-small` (14px), `font-size-medium` (16px), `font-size-large` (18px) auf dem `html`-Element beim Laden und Umschalten. Da die App relative Einheiten (`rem`) nutzt, skaliert das gesamte UI nahtlos mit.
  - Globale Umstellung der `white-space: nowrap !important` Budget-Zellen-Regel auf alle Bildschirmgrößen, um Umbrüche bei Beträgen in allen Fenstergrößen zu unterbinden.
- [x] **Verifikation**: Visuelle Bestätigung der proportionalen Skalierung und Test-Suite-Durchlauf (168 Tests erfolgreich).

