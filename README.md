# ComicVault 🦸‍♂️🦇🕷️

ComicVault ist eine moderne, browserbasierte (PWA-fähige) Single-Page-Application (SPA) zur umfassenden Verwaltung, Analyse und Verfolgung deiner Comicbuch-Sammlung.

## 🌟 Kernfunktionen

- **Sammlungsverwaltung**: Erfasse Comics mit Details wie Titel, Verlag, Kaufdatum, Preis, Lesestatus und Bewertung.
- **Wunschliste & Abonnements**: Verwalte zukünftige Käufe und laufende Serien-Abos separat.
- **Offline-Fähigkeit (PWA)**: Dank Service Workern und lokaler Caching-Strategien (IndexedDB) funktioniert die App auch offline oder bei schlechter Verbindung.
- **Umfangreiche Statistiken**: Analysiere dein Leseverhalten (Lesestapel/TBR), Ausgaben und Verteilungen (nach Verlag, Format, Typ) mittels interaktiver Diagramme und Tabellen.
- **KI Insights**: Automatische Generierung von Review-Vorschlägen und Analysen zu deinen gelesenen Werken basierend auf deiner Sammlung.
- **Import / Export**: Sichere deine Daten als JSON oder Excel (`.xlsx`) und importiere sie bei Bedarf wieder.
- **Massenbearbeitung (Bulk Edit)**: Selektiere mehrere Comics gleichzeitig, um Status, Verlag oder andere Felder effizient zu aktualisieren oder Einträge massenhaft zu löschen.
- **Design & Personalisierung**: Bietet umfangreiche Anpassungsmöglichkeiten durch verschiedene Farbschemata (Themes) und konfigurierbare Schriftarten.
- **Responsive Design**: Für Desktop und Mobile optimiertes, modernes UI-Design (Dark-Mode Unterstützung).

## 🚀 Installation & Start

Das Projekt besteht aus statischen HTML-, CSS- und JavaScript-Dateien. Es wird kein Node.js Backend benötigt, da die Datenhaltung clientseitig (bzw. über Firebase/IndexedDB) gelöst ist.

1. **Repository klonen**
   ```bash
   git clone https://github.com/phimafusion/comicvault.git
   cd comicvault
   ```

2. **Lokalen Server starten**
   Da ES6-Module (`type="module"`) verwendet werden, muss die App über einen Webserver ausgeliefert werden (nicht via `file://` Protokoll).
   
   **Mit Python:**
   ```bash
   python -m http.server 8080
   # oder
   py -m http.server 8080
   ```
   
   **Mit Node.js (falls installiert):**
   ```bash
   npx http-server -p 8080
   ```

3. **App öffnen**
   Navigiere im Browser zu `http://localhost:8080`.

## 🧪 Tests ausführen

Das Projekt verfügt über eine umfassende In-Browser Testsuite (Mocha & Chai).
Öffne bei laufendem Webserver einfach die Datei `tests.html` im Browser:
`http://localhost:8080/tests.html`

## 📚 Dokumentation

Für eine tiefergehende technische Übersicht über die Architektur, Services (wie `statsService` oder `db`), das Caching-Verhalten und das Event-System siehe die [DOCUMENTATION.md](DOCUMENTATION.md).
