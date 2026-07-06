# Datenqualitäts-Monitor - Pflegeaufgaben je Datentyp

Stand: 2026-07-06

Diese Liste fasst zusammen, welche Pflegeaufgaben pro Datentyp fachlich
vorkommen können. Sie basiert auf dem `domainQualityModel` und der operativen
Liste `qualityCriteria` in `Statistik/quality.js`.

## Legende

- `aktiv`: technisch angebunden und score-/listenwirksam
- `manuell`: keine automatische Pflegeaufgabe, nur redaktionell prüfbar
- `quellseitig`: fachlich relevant, wird aber nicht als normale Pflegeaufgabe
  im Monitor geführt

Hinweis: Die früher vorbereiteten Standardkriterien wurden am 2026-07-06 als
Server-Scan-Regeln aktiviert. API-Pushdowns bleiben nur dort aktiv, wo sie
bereits belastbar geprüft waren.

## Hotel

### Aktiv

- Telefon
- Straße
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Merkmale
- Zahlungsmöglichkeiten
- Preisinformation
- Ansprechperson
- Erreichbarkeit per ÖPNV
- Fremdsprachenkenntnisse
- CC-Lizenz
- Parkplätze
- Buchungslink
- Bildurheber

### Manuell

- Bildqualität redaktionell prüfen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Tour

### Aktiv

- Beschreibungstext
- Teaser-Text
- Eignung oder Jahreszeit
- Anreise mit ÖPNV
- Parken
- Autor oder Organisation
- Start- und Zielbeschreibungen
- CC-Lizenz
- Bildmaterial
- Bildurheber

### Manuell

- Bildqualität redaktionell prüfen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt
- Tour-Basisdaten unvollständig

## POI

### Aktiv

- Straße
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Telefon
- Öffnungszeiten
- Preisinformation
- Zahlungsmöglichkeiten
- Lizenz
- ÖPNV-Anreise
- Fremdsprachenkenntnisse
- Parkplätze
- Eignung
- Bildmaterial
- Bildurheber

### Manuell

- Bildqualität redaktionell prüfen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Gastro

### Aktiv

- Telefon
- Straße
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Öffnungszeiten
- Zahlungsmöglichkeiten
- CC-Lizenz
- Küchenart
- Fremdsprachenkenntnisse
- Anfahrt
- Parkplätze
- Küche
- Bildmaterial
- Bildurheber

### Manuell

- Bildqualität redaktionell prüfen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Event

### Aktiv

- Telefon
- Straße
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Preisinformationen
- Zahlungsmöglichkeiten
- CC-Lizenz
- ÖPNV-Anreise
- Bildurheber

### Manuell

- Bildqualität redaktionell prüfen

### Quellseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Package

### Aktiv

- Lizenz
- Buchungslink
- Bildurheber

### Manuell

- Bildqualität redaktionell prüfen

## Datentypübergreifende Querschnittsaufgaben

Diese Aufgaben kommen in mehreren Datentypen vor und sollten bei der Gewichtung
möglichst konsistent behandelt werden:

- Beschreibungstext
- Teaser-Text
- Telefon
- Straße
- E-Mail
- Webseite
- Öffnungszeiten
- Preisinformation / Preisinformationen
- Zahlungsmöglichkeiten
- Lizenz / CC-Lizenz
- ÖPNV-Anreise / Anfahrt
- Fremdsprachenkenntnisse
- Parkplätze / Parkhinweise
- Buchungslink
- Bildmaterial
- Bildurheber

## Technischer Bezug für die Gewichtung

Für jede Aufgabe sind diese Felder relevant:

- Datentyp
- Aufgabenname
- Statusgruppe: `aktiv`, `manuell`, `quellseitig`
- fachliches Level im Modell: `minimum`, `good`, `very_good`, `supporting`
- aktuelle UI-Priorität: `hoch`, `mittel`, `niedrig`

Darauf kann die 3-Ebenen-Logik
`Kritische Fehler | Fehler | Leichte Optimierungen` sauber aufgebaut werden.
