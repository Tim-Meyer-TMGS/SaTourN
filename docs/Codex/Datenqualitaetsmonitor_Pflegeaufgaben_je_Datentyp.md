# Datenqualitaets-Monitor - Pflegeaufgaben je Datentyp

Stand: 2026-06-12

Diese Liste fasst zusammen, welche Pflegeaufgaben pro Datentyp fachlich
vorkommen koennen. Sie basiert auf dem `domainQualityModel` in
`Statistik/quality.js`.

Legende:

- `aktiv`: bereits technisch angebunden
- `vorbereitet`: fachlich gueltig, aber technisch noch nicht voll verifiziert
- `manuell`: keine automatische Pflegeaufgabe, nur redaktionell pruefbar
- `quellseitig`: fachlich relevant, wird aber nicht als normale Pflegeaufgabe
  im Monitor gefuehrt

Hinweis:

- Diese Liste ist die richtige Grundlage fuer deine kuenftige Gewichtung.
- `Score-Status` und kuenftige Fehler-Ebenen sind davon getrennt.
- Aufgaben wie `Geo-Information fehlt` oder `Tour-Basisdaten unvollstaendig`
  stehen hier bewusst mit drin, auch wenn sie derzeit nicht als normale
  Pflegeaufgabe ausgespielt werden.
- Der aktuelle UI-Stand zeigt vorbereitete Pruefungen bereits in der Hilfe
  und auf der Datensatz-Detailseite, aber noch nicht als automatische
  Pflegeaufgabe oder Score-Abzug.

## Hotel

### Aktiv

- Zahlungsmoeglichkeiten
- Erreichbarkeit per OePNV
- Fremdsprachenkenntnisse
- CC-Lizenz
- Parkplaetze
- Buchungslink
- Bildurheber

### Vorbereitet

- Telefon
- Strasse
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Merkmale
- Preisinformation
- Ansprechperson

### Manuell

- Bildqualitaet redaktionell pruefen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Tour

### Aktiv

- Beschreibungstext
- Eignung oder Jahreszeit
- Anreise mit OePNV
- Parken
- CC-Lizenz
- Bildmaterial
- Bildurheber

### Vorbereitet

- Teaser-Text
- Autor oder Organisation
- Start- und Zielbeschreibungen

### Manuell

- Bildqualitaet redaktionell pruefen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt
- Tour-Basisdaten unvollstaendig

## POI

### Aktiv

- Strasse
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Telefon
- Oeffnungszeiten
- Preisinformation
- Zahlungsmoeglichkeiten
- Lizenz
- OePNV-Anreise
- Fremdsprachenkenntnisse
- Parkplaetze
- Eignung
- Bildmaterial
- Bildurheber

### Vorbereitet

- keine weiteren fachlich vorbereiteten Standard-Pflegeaufgaben im aktuellen Modell

### Manuell

- Bildqualitaet redaktionell pruefen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Gastro

### Aktiv

- Beschreibungstext
- Oeffnungszeiten
- Zahlungsmoeglichkeiten
- CC-Lizenz
- Kuechenart
- Fremdsprachenkenntnisse
- Anfahrt
- Parkplaetze
- Bildmaterial
- Bildurheber

### Vorbereitet

- Telefon
- Strasse
- Teaser-Text
- E-Mail
- Webseite
- Kueche

### Manuell

- Bildqualitaet redaktionell pruefen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Event

### Aktiv

- OePNV-Anreise
- Bildurheber

### Vorbereitet

- Telefon
- Strasse
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Preisinformationen
- Zahlungsmoeglichkeiten
- CC-Lizenz

### Manuell

- Bildqualitaet redaktionell pruefen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Package

### Aktiv

- Lizenz
- Buchungslink
- Bildurheber

### Vorbereitet

- keine weiteren fachlich vorbereiteten Standard-Pflegeaufgaben im aktuellen Modell

### Manuell

- Bildqualitaet redaktionell pruefen

## Datentyp-uebergreifende Querschnittsaufgaben

Diese Aufgaben kommen in mehreren Datentypen vor und sollten bei der
Gewichtung moeglichst konsistent behandelt werden:

- Beschreibungstext
- Teaser-Text
- Telefon
- Strasse
- E-Mail
- Webseite
- Oeffnungszeiten
- Preisinformation / Preisinformationen
- Zahlungsmoeglichkeiten
- Lizenz / CC-Lizenz
- OePNV-Anreise / Anfahrt
- Fremdsprachenkenntnisse
- Parkplaetze / Parkhinweise
- Buchungslink
- Bildmaterial
- Bildurheber

## Technischer Bezug fuer die spaetere Gewichtung

Wenn du mir als Naechstes die Gewichtung gibst, sind fuer jede Aufgabe diese
Felder relevant:

- Datentyp
- Aufgabenname
- Statusgruppe:
  `aktiv`, `vorbereitet`, `manuell`, `quellseitig`
- fachliches Level im Modell:
  `minimum`, `good`, `very_good`, `supporting`
- aktuelle UI-Prioritaet:
  `hoch`, `mittel`, `niedrig`

Darauf kann ich dir dann sauber die neue 3-Ebenen-Logik
`Kritische Fehler | Fehler | Leichte Optimierungen` aufbauen.
