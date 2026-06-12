# Datenqualitäts-Monitor - Pflegeaufgaben je Datentyp

Stand: 2026-06-12

Diese Liste fasst zusammen, welche Pflegeaufgaben pro Datentyp fachlich
vorkommen können. Sie basiert auf dem `domainQualityModel` in
`Statistik/quality.js`.

Legende:

- `aktiv`: bereits technisch angebunden
- `vorbereitet`: fachlich gültig, aber technisch noch nicht voll verifiziert
- `manüll`: keine automatische Pflegeaufgabe, nur redaktionell prüfbar
- `qüllseitig`: fachlich relevant, wird aber nicht als normale Pflegeaufgabe
  im Monitor geführt

Hinweis:

- Diese Liste ist die richtige Grundlage für deine künftige Gewichtung.
- `Score-Status` und künftige Fehler-Ebenen sind davon getrennt.
- Aufgaben wie `Geo-Information fehlt` oder `Tour-Basisdaten unvollständig`
  stehen hier bewusst mit drin, auch wenn sie derzeit nicht als normale
  Pflegeaufgabe ausgespielt werden.
- Der aktülle UI-Stand zeigt vorbereitete Prüfungen bereits in der Hilfe
  und auf der Datensatz-Detailseite, aber noch nicht als automatische
  Pflegeaufgabe oder Score-Abzug.

## Hotel

### Aktiv

- Zahlungsmöglichkeiten
- Erreichbarkeit per ÖPNV
- Fremdsprachenkenntnisse
- CC-Lizenz
- Parkplätze
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

### Manüll

- Bildqualität redaktionell prüfen

### Qüllseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Tour

### Aktiv

- Beschreibungstext
- Eignung oder Jahreszeit
- Anreise mit ÖPNV
- Parken
- CC-Lizenz
- Bildmaterial
- Bildurheber

### Vorbereitet

- Teaser-Text
- Autor oder Organisation
- Start- und Zielbeschreibungen

### Manüll

- Bildqualität redaktionell prüfen

### Qüllseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt
- Tour-Basisdaten unvollständig

## POI

### Aktiv

- Strasse
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

### Vorbereitet

- keine weiteren fachlich vorbereiteten Standard-Pflegeaufgaben im aktüllen Modell

### Manüll

- Bildqualität redaktionell prüfen

### Qüllseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Gastro

### Aktiv

- Beschreibungstext
- Öffnungszeiten
- Zahlungsmöglichkeiten
- CC-Lizenz
- Küchenart
- Fremdsprachenkenntnisse
- Anfahrt
- Parkplätze
- Bildmaterial
- Bildurheber

### Vorbereitet

- Telefon
- Strasse
- Teaser-Text
- E-Mail
- Webseite
- Küche

### Manüll

- Bildqualität redaktionell prüfen

### Qüllseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Event

### Aktiv

- ÖPNV-Anreise
- Bildurheber

### Vorbereitet

- Telefon
- Strasse
- Beschreibungstext
- Teaser-Text
- E-Mail
- Webseite
- Preisinformationen
- Zahlungsmöglichkeiten
- CC-Lizenz

### Manüll

- Bildqualität redaktionell prüfen

### Qüllseitig / nicht als normale Pflegeaufgabe

- Geo-Information fehlt

## Package

### Aktiv

- Lizenz
- Buchungslink
- Bildurheber

### Vorbereitet

- keine weiteren fachlich vorbereiteten Standard-Pflegeaufgaben im aktüllen Modell

### Manüll

- Bildqualität redaktionell prüfen

## Datentyp-übergreifende Qürschnittsaufgaben

Diese Aufgaben kommen in mehreren Datentypen vor und sollten bei der
Gewichtung möglichst konsistent behandelt werden:

- Beschreibungstext
- Teaser-Text
- Telefon
- Strasse
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

## Technischer Bezug für die spätere Gewichtung

Wenn du mir als Nächstes die Gewichtung gibst, sind für jede Aufgabe diese
Felder relevant:

- Datentyp
- Aufgabenname
- Statusgruppe:
  `aktiv`, `vorbereitet`, `manüll`, `qüllseitig`
- fachliches Level im Modell:
  `minimum`, `good`, `very_good`, `supporting`
- aktülle UI-Priorität:
  `hoch`, `mittel`, `niedrig`

Darauf kann ich dir dann sauber die neü 3-Ebenen-Logik
`Kritische Fehler | Fehler | Leichte Optimierungen` aufbaün.
