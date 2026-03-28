# Torhymne-Quiz

Ein interaktives Quiz rund um die Torhymnen der Bundesliga. Hör dir den Sound an und errate, welcher Verein dahintersteckt!

## Features

- Torhymnen werden als Audio abgespielt (YouTube-Embed, nur Steuerleiste sichtbar)
- Alle Vereine pro Runde, in zufälliger Reihenfolge
- Individuelle Fehlermeldungen pro Verein direkt aus der Datenquelle
- Ergebnisseite am Ende jeder Runde mit Auswertung
- Live-Daten aus Google Sheets — neue Vereine hinzufügen ohne Code-Änderung
- Komplett auf Deutsch

## Tech Stack

- **Jekyll** — statischer Seitengenerator
- **SCSS** — Styling im "German Stadium"-Look (Schwarz, Rot, Weiß)
- **Google Apps Script** — JSON-API aus Google Sheets
- **Vanilla JavaScript** — keine Frameworks, keine Build-Tools
