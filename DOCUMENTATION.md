# ComicVault - Technische Dokumentation

Diese Dokumentation bietet einen technischen Überblick über die Architektur und die wichtigsten Komponenten von **ComicVault**, um Entwicklern das Verständnis und die Weiterentwicklung der Applikation zu erleichtern.

## Architektur & Ordnerstruktur

Die Applikation folgt dem Paradigma einer Single-Page-Application (SPA) und nutzt Vanilla JavaScript (ES6 Module) ohne ein schwergewichtiges Frontend-Framework wie React oder Vue. Die Datenhaltung erfolgt in Firebase Firestore (mit lokalem IndexedDB Offline-Cache).

### Verzeichnisstruktur

```text
/
├── css/                  # Zentrale Stylesheets (index.css, theme.css, modals.css)
├── js/
│   ├── components/       # Wiederverwendbare UI-Komponenten (Modals, Toast, AutoComplete)
│   ├── services/         # Geschäftslogik und Datenaufbereitung (statsService, aiService, etc.)
│   ├── views/            # Logik für die einzelnen Tabs/Seiten (collection, stats, settings)
│   ├── tests/            # Mocha/Chai Unit- und Integrationstests
│   ├── app.js            # Initialisierung und Event-Listener-Setup
│   ├── db.js             # Firebase-Initialisierung und Offline-Cache
│   └── utils.js          # Globale Hilfsfunktionen (z.B. renderStars, calculateStatus)
├── index.html            # Haupteinstiegspunkt der SPA
├── tests.html            # In-Browser Test-Runner (Mocha)
├── sw.js                 # Service Worker für PWA (Offline-Fähigkeit)
└── manifest.json         # PWA Manifest
```

## Die Daten-Ebene (`db.js` & Firebase)

Die `db.js` kapselt jegliche Interaktion mit der Datenbank. 
- **Offline-Fähigkeit**: Firestore ist mit `enablePersistence({ synchronizeTabs: true })` konfiguriert.
- **Cache-Invalidierung**: Um die Performance zu steigern, werden große Listen (z. B. alle Comics) im Speicher gecacht (`comicsCache`). Wird ein Comic hinzugefügt, bearbeitet oder gelöscht, wird der Cache (`comicsCacheInvalid = true`) gezielt geleert, sodass beim nächsten Aufruf frische Daten geladen werden.

## Services (Die Geschäftslogik)

Die Kernlogik zur Aggregation von Daten liegt entkoppelt von der UI in dedizierten Services:

- `statsService.js`: Einer der größten Services der App. Enthält reine Datenfunktionen, um KPIs (wie Gesamtwert, Lesestapel-Größe) zu berechnen oder Datenreihen für Charts aufzubereiten (z. B. `calculateInventoryTBRDevelopment` oder `groupTBRDataByYear`).
- `importExportService.js`: Handhabt das Umwandeln von JSON oder Excel (`.xlsx` via SheetJS) in Datenbankobjekte und umgekehrt.
- `aiService.js`: Enthält Prompts und Parser, um über Gemini / OpenAI (sofern in Settings hinterlegt) automatische Insights oder Reviews zu generieren.

## Views (Die Präsentations-Schicht)

Jeder "Tab" in der Navigation (`#collection`, `#stats`, `#wishlist`) hat ein eigenes Modul im Ordner `js/views/`.

- **`collection.js`**: Rendert die Hauptliste der Comics. Unterstützt Ansichten als Grid (Karten) oder als Liste. Behandelt auch das Filtern, Sortieren und die Bulk-Edit-Logik.
- **`stats.js`**: Holt Daten aus dem `statsService.js` und rendert damit Chart.js-Diagramme sowie komplexe Tabellen (z. B. die Lesestapel-Entwicklung mit Accordion-Gruppierung).
- **`subscriptions.js`**: Eine separierte Ansicht zur reinen Verwaltung von Serien-Abos (wird nicht in die Hauptstatistik oder Sammlungswerte eingerechnet).
- **`settings.js` & `settingsTemplates.js`**: Handhabt Konfigurationen wie Theme-Auswahlen, Schriftarten, Standardwerte und API-Keys. Die reine HTML-Präsentation wurde zur besseren Wartbarkeit in die `settingsTemplates.js` ausgelagert.

## Event-System und Globale Zustände

ComicVault nutzt Custom Events, um Module lose miteinander zu koppeln:
- `data-changed`: Wird z. B. von `collection.js` nach einem Save/Delete getriggert. Andere Module (wie `stats.js` oder `wishlist.js`) lauschen darauf, um ihre Caches zu leeren oder ihre Ansicht zu aktualisieren.

## PWA, Offline- & Mockup-Modus

ComicVault ist als Progressive Web App konzipiert und bietet hochentwickelte Offline-Features:
- **Offline-Fähigkeit**: Firestore cached Abfragen in einer lokalen IndexedDB (`enablePersistence`). Der Service Worker (`sw.js`) cached zusätzlich alle statischen Assets (HTML, CSS, JS, Bilder) mittels einer Cache-First-Strategie.
- **Service Worker Update Notification**: Ein Event-Listener überwacht Aktualisierungen des Service Workers. Steht eine neue Version bereit, wird der Nutzer über ein In-App-Toast-Overlay aufgefordert, die Seite neu zu laden.
- **In-App Installations-Prompt**: Die App fängt den `beforeinstallprompt`-Event ab und bietet dem Nutzer in den Einstellungen eine native Installations-Schaltfläche an.
- **Dynamische Statusleiste**: Das Meta-Tag `theme-color` wird bei jedem Theme-Wechsel dynamisch aktualisiert, um die Statusleiste im Standalone-Modus des Mobilgeräts farblich anzupassen.
- **Mockup-Modus**: Ermöglicht das Testen und Erkunden der App vollständig offline und ohne Google-Konto. In diesem Modus greift die App auf lokale Dummy-Daten zurück und simuliert eine erfolgreiche Authentifizierung über `localStorage`.

## Tests (`tests.html`)

Da ComicVault vollständig im Browser läuft, werden auch die Tests in einem In-Browser Mocha-Environment ausgeführt.
- **Unit-Tests**: Prüfen isolierte Funktionen (z. B. `parseToDate()` oder `calculateKPIs()`).
- **Integrationstests**: Die UI wird in einem versteckten Container gerendert, um Interaktionen (wie das Filtern oder das Aufklappen von Tabellen) realitätsnah zu testen. 

*Um die Tests auszuführen, navigiere bei lokal laufendem Server einfach zu `http://localhost:8080/tests.html`.*
