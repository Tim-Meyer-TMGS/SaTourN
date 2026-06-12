# one.intelligence - Kontext und Fehlerbilder fuer KI-Modelle

Stand: 2026-06-12

Dieses Dokument beschreibt den fachlichen Kontext fuer die beiden
one.intelligence-Anwendungsfaelle im Datenqualitaets-Monitor:

- KI-Mail-Entwurf an Dateninhaber
- KI-Suche nach thematisch passenden Datensaetzen

Ziel ist nicht die technische API-Beschreibung, sondern ein gemeinsames
Verstaendnis der Aufgabe, der Sprache und der Fehlerbilder.

## 1. Fachlicher Rahmen

Der Datenqualitaets-Monitor bewertet touristische Datensaetze aus
Destination.One. Er zeigt Luecken in den Daten und hilft Redaktionen oder
Dateninhabern dabei, Datensaetze zu verbessern.

Wichtige Grundsaetze:

- Es geht um Datenpflege, nicht um Werbung.
- Die Kommunikation soll sachlich, freundlich und handlungsorientiert sein.
- Fehler bedeuten: bestimmte Angaben fehlen, sind unvollstaendig oder fuer den
  Anwendungsfall nicht ausreichend gepflegt.
- Nicht jede fachlich sinnvolle Pruefung ist schon technisch automatisch
  aktiviert.
- Das Modell darf keine Felder, Inhalte oder Fehler erfinden, die nicht im
  Input uebergeben wurden.

## 2. Wofuer die beiden Modelle da sind

### 2.1 Mail-Entwurf

Ziel:

- Ein Dateninhaber soll freundlich und konkret auf Pflegebedarf hingewiesen
  werden.
- Die Mail soll helfen, den Datensatz zu verbessern.
- Der Text soll verstaendlich sein, auch ohne internes Systemwissen.

Die Mail darf nicht:

- technische API-Begriffe verwenden
- interne Statusnamen nennen
- Schuld zuweisen
- Druck oder Drohkulissen aufbauen
- unbekannte Fakten oder Ursachen erfinden

Die Mail soll:

- den Datensatz kurz einordnen
- die relevanten Fehler knapp benennen
- kurz erklaeren, warum die Angaben wichtig sind
- eine konkrete Pflegeempfehlung geben

### 2.2 AI-Search

Ziel:

- Ein Nutzer soll per Freitext Datensaetze zu einem Thema finden koennen.
- Die Rueckgabe besteht spaeter aus `global_id`-Treffern, nicht aus Text.
- Die Suche dient dazu, Datensaetze zu Themen, Kampagnen oder inhaltlichen
  Gruppen zusammenzustellen.

Die Suche soll:

- thematisch passende touristische Datensaetze erkennen
- den Arbeitskontext beruecksichtigen, wenn Gebiet, Ort oder Datentyp
  uebergeben wurden
- eher praezise als breit antworten

Die Suche darf nicht:

- IDs erfinden
- Freitext erklaeren statt IDs liefern
- fachlich unpassende Treffer aufblasen

## 3. Was ein Fehler in diesem System bedeutet

Ein Fehler bedeutet in diesem Kontext:

- eine erwartete Angabe fehlt
- eine wichtige offene Datenangabe fehlt
- eine fuer Nutzer relevante Kontextangabe fehlt
- ein Datensatz ist dadurch schwaecher nutzbar, schlechter auffindbar oder
  nicht ausreichend open-data-faehig

Es gibt ausserdem:

- `vorbereitete` Pruefungen:
  fachlich bereits sinnvoll, aber noch nicht voll automatisch angebunden
- `manuelle` Pruefungen:
  nur redaktionell beurteilbar
- `quellseitig` abgefangene oder ausgeschlossene Faelle:
  fachlich relevant, aber keine normale Pflegeaufgabe

Fuer die Modelle ist wichtig:

- Nur die im Input enthaltenen Fehler als echte Probleme behandeln.
- Nicht jede moegliche Pruefung ist automatisch ein aktueller Fehler.

## 4. Fehlerbilder und Bedeutung

Die folgenden Fehlerbilder sind besonders relevant fuer Mails und spaetere
KI-Unterstuetzung. Die Beschreibungen sind absichtlich nutzerorientiert.

### 4.1 Lizenz / Open Data

Fehlerbild:

- Es fehlt eine gueltige Lizenzangabe fuer offene Daten.

Bedeutung:

- Ohne Lizenz ist die rechtssichere Nachnutzung erschwert oder nicht moeglich.
- Der Datensatz ist dann meist nicht oder nur eingeschraenkt open-data-faehig.

Empfohlene Sprache:

- Die Lizenzangabe fehlt noch.
- Bitte eine passende Lizenz ergaenzen oder den Open-Data-Status pruefen.

### 4.2 Beschreibung / Beschreibungstext

Fehlerbild:

- Ein zentraler Beschreibungstext fehlt.

Bedeutung:

- Nutzer verstehen das Angebot schlechter.
- Auffindbarkeit, Einordnung und redaktionelle Nutzbarkeit leiden.

Empfohlene Sprache:

- Der Datensatz enthaelt noch keine ausreichende Beschreibung.
- Bitte einen klaren Beschreibungstext ergaenzen.

### 4.3 Teaser / Kurztext

Fehlerbild:

- Ein kurzer Einstiegstext oder Teaser fehlt.

Bedeutung:

- Der Datensatz wirkt unvollstaendig.
- Kurze Uebersichten, Listen und Vorschaudarstellungen werden schwaecher.

Empfohlene Sprache:

- Ein kurzer Teaser oder Einleitungstext fehlt noch.
- Bitte einen kompakten Kurztext ergaenzen.

### 4.4 Strasse / Anschrift

Fehlerbild:

- Die Strasse oder Anschrift fehlt.

Bedeutung:

- Die Verortung des Angebots wird unklar.
- Anreise und Orientierung werden erschwert.

Empfohlene Sprache:

- Die Anschrift ist noch nicht vollstaendig.
- Bitte Strasse oder vollstaendige Adressangaben ergaenzen.

### 4.5 Telefon

Fehlerbild:

- Eine Telefonnummer fehlt.

Bedeutung:

- Rueckfragen oder kurzfristige Kontaktaufnahme sind erschwert.

Empfohlene Sprache:

- Eine Telefonnummer ist noch nicht hinterlegt.
- Bitte eine erreichbare Telefonnummer ergaenzen.

### 4.6 E-Mail

Fehlerbild:

- Eine E-Mail-Adresse fehlt.

Bedeutung:

- Schriftliche Kontaktaufnahme ist erschwert.

Empfohlene Sprache:

- Eine E-Mail-Adresse ist noch nicht gepflegt.
- Bitte eine passende Kontaktadresse hinterlegen.

### 4.7 Webseite

Fehlerbild:

- Eine Webseite oder Ziel-URL fehlt.

Bedeutung:

- Weiterfuehrende Informationen, Buchung oder Verifikation sind erschwert.

Empfohlene Sprache:

- Eine weiterfuehrende Webseite fehlt noch.
- Bitte eine passende Webadresse ergaenzen.

### 4.8 Oeffnungszeiten

Fehlerbild:

- Es sind keine Oeffnungszeiten hinterlegt.

Bedeutung:

- Nutzer koennen den Besuch schlechter planen.
- Die Aussagekraft des Datensatzes sinkt deutlich.

Empfohlene Sprache:

- Es sind noch keine Oeffnungszeiten hinterlegt.
- Bitte Oeffnungszeiten ergaenzen oder aktualisieren.

### 4.9 Preisinformation

Fehlerbild:

- Preis-, Eintritts- oder Kostenhinweise fehlen.

Bedeutung:

- Vergleichbarkeit und Erwartungsmanagement werden erschwert.

Empfohlene Sprache:

- Preisinformationen fehlen noch.
- Bitte Preis-, Eintritts- oder Kostenhinweise ergaenzen.

### 4.10 Zahlungsmoeglichkeiten

Fehlerbild:

- Es ist keine gepruefte Zahlungsart vorhanden.

Bedeutung:

- Nutzer wissen nicht, wie vor Ort oder online gezahlt werden kann.

Empfohlene Sprache:

- Zahlungsmoeglichkeiten sind noch nicht ausreichend gepflegt.
- Bitte mindestens eine passende Zahlungsart ergaenzen.

### 4.11 Buchungslink

Fehlerbild:

- Ein Buchungs-, Reservierungs- oder Ticketlink fehlt.

Bedeutung:

- Der direkte Abschluss oder die Weiterleitung ist erschwert.

Empfohlene Sprache:

- Ein direkter Buchungs- oder Reservierungslink fehlt noch.
- Bitte eine passende Buchungsmoeglichkeit hinterlegen.

### 4.12 OePNV-Anreise / Anfahrt

Fehlerbild:

- Informationen zur Anreise mit OePNV oder allgemeine Anfahrtshinweise fehlen.

Bedeutung:

- Die Planung vor Ort wird schwieriger.

Empfohlene Sprache:

- Hinweise zur Anreise fehlen noch.
- Bitte Informationen zu OePNV oder Anfahrt ergaenzen.

### 4.13 Parken / Parkhinweise

Fehlerbild:

- Parkmoeglichkeiten oder gepruefte Parkhinweise fehlen.

Bedeutung:

- Die Erreichbarkeit mit dem Auto ist schlechter einschaetzbar.

Empfohlene Sprache:

- Parkhinweise sind noch nicht ausreichend gepflegt.
- Bitte Parkmoeglichkeiten oder passende Hinweise ergaenzen.

### 4.14 Fremdsprachen

Fehlerbild:

- Es ist keine gepruefte Fremdsprache vorhanden.

Bedeutung:

- Internationale Nutzbarkeit und Auffindbarkeit sind eingeschraenkt.

Empfohlene Sprache:

- Fremdsprachenangaben fehlen noch.
- Bitte mindestens eine passende Fremdsprache ergaenzen.

### 4.15 Eignung

Fehlerbild:

- Es fehlt eine gepruefte Eignungsangabe.

Bedeutung:

- Nutzer koennen schwerer einschaetzen, fuer wen das Angebot geeignet ist.

Empfohlene Sprache:

- Wichtige Eignungsangaben fehlen noch.
- Bitte passende Merkmale zur Eignung hinterlegen.

### 4.16 Jahreszeit / Saison

Fehlerbild:

- Saison- oder Jahreszeitangaben fehlen.

Bedeutung:

- Die Nutzbarkeit einer Tour oder eines Angebots ist zeitlich schlechter
  einzuordnen.

Empfohlene Sprache:

- Angaben zu Saison oder Jahreszeit fehlen noch.
- Bitte die passende saisonale Einordnung ergaenzen.

### 4.17 Bildmaterial

Fehlerbild:

- Es fehlt pruefbares Bildmaterial.

Bedeutung:

- Der Datensatz wirkt weniger anschaulich und redaktionell schwaecher.

Empfohlene Sprache:

- Es ist noch kein geeignetes Bildmaterial hinterlegt.
- Bitte mindestens ein passendes Bild ergaenzen.

### 4.18 Bildurheber

Fehlerbild:

- Ein Bild ist vorhanden, aber der Urheberhinweis fehlt.

Bedeutung:

- Die rechtssichere Nutzung des Bildes ist erschwert.

Empfohlene Sprache:

- Beim Bildmaterial fehlt noch ein Urheberhinweis.
- Bitte Fotograf oder Copyright-Angabe ergaenzen.

### 4.19 Kuechenart / Kueche

Fehlerbild:

- Bei Gastro fehlen gepruefte Kuechenarten oder weitere Kuecheninformationen.

Bedeutung:

- Nutzer koennen das gastronomische Angebot schlechter einordnen.

Empfohlene Sprache:

- Angaben zur Kuechenart sind noch nicht vollstaendig.
- Bitte passende Kuechenarten oder Kuecheninformationen ergaenzen.

### 4.20 Autor / Organisation / Ansprechperson

Fehlerbild:

- Zustaendige Kontakt- oder Organisationsangaben fehlen.

Bedeutung:

- Verantwortlichkeiten und redaktionelle Einordnung werden schwaecher.

Empfohlene Sprache:

- Zustaendige Kontakt- oder Organisationsangaben fehlen noch.
- Bitte die passenden Angaben ergaenzen.

### 4.21 Start- und Zielbeschreibungen

Fehlerbild:

- Bei Touren fehlen Informationen zu Start oder Ziel.

Bedeutung:

- Die Orientierung und praktische Nutzbarkeit der Tour sinkt.

Empfohlene Sprache:

- Angaben zu Start oder Ziel sind noch nicht vollstaendig.
- Bitte Start- und Zielbeschreibung ergaenzen.

## 5. Datentyp-Kontext fuer die Modelle

### Hotel

Typische Schwerpunkte:

- Buchbarkeit
- Lizenz
- Kontakt und Erreichbarkeit
- Parken, Sprachen, Zahlungsarten

### Tour

Typische Schwerpunkte:

- Beschreibung
- Saison / Eignung
- Anreise und Parken
- Lizenz
- Bildmaterial

### POI

Typische Schwerpunkte:

- Basisbeschreibung
- Oeffnungszeiten
- Kontakt
- Preis
- Lizenz
- Eignung / Kontextmerkmale

### Gastro

Typische Schwerpunkte:

- Beschreibung
- Oeffnungszeiten
- Zahlungsmoeglichkeiten
- Kuechenart
- Lizenz

### Event

Typische Schwerpunkte:

- Beschreibung
- Termin- und Kontextverstaendnis
- Preis
- Kontakt
- OePNV-Anreise

### Package

Typische Schwerpunkte:

- Buchungslink
- Lizenz
- Bildurheber

## 6. Welche Eingaben ein KI-Modell idealerweise versteht

### Fuer Mail-Entwurf

Hilfreiche Eingaben:

- Datensatz-Titel
- Datentyp
- Ort / Gebiet
- globale oder interne ID
- Empfaengeradresse
- Liste der relevanten Fehler
- pro Fehler:
  - Label
  - Problemtext
  - Empfehlung
- optional:
  - nur ein einzelner Fehlerkontext
  - oder alle Probleme des Datensatzes

Das Modell soll daraus:

- einen kurzen Betreff
- einen kurzen, klaren Mailtext

erzeugen.

### Fuer AI-Search

Hilfreiche Eingaben:

- Freitext-Suchanfrage
- optionaler Arbeitskontext:
  - Gebiet
  - Ort
  - Datentyp

Das Modell soll daraus:

- thematisch passende touristische Datensaetze ableiten
- spaeter nur passende `global_id`-Treffer liefern

## 7. Sprachstil fuer beide Modelle

Gemeinsame Anforderungen:

- sachlich
- knapp
- freundlich
- nicht belehrend
- keine internen Systembegriffe
- keine Halluzinationen

Fuer Mail besonders wichtig:

- nicht vorwurfsvoll
- nicht juristisch drohend
- nicht zu lang
- klar strukturierte Bitte zur Nachpflege

Fuer Search besonders wichtig:

- kein Erklaertext
- keine freie Interpretation ohne Bezug zu realistischen touristischen
  Inhalten

## 8. Was das Modell nie tun soll

- Fehler erfinden
- IDs erfinden
- fehlende Felder als sicher vorhanden darstellen
- interne Codex-, API- oder Proxy-Logik erklaeren
- Datenschutz-, Lizenz- oder Rechtsbewertung frei erfinden
- eine fehlende Angabe mit einer vermuteten Angabe ersetzen

## 9. Einsatz als Referenz

Dieses Dokument ist sinnvoll als Referenz fuer:

- Systemprompts
- Assistentenbeschreibung in one.intelligence
- spaetere Prompt-Bausteine im Backend
- Abstimmung der Fehlertexte zwischen UI, Mail und KI-Suche

Verwandte Dateien:

- `docs/Codex/Render_OI_Einrichtung.md`
- `docs/Codex/Datenqualitaetsmonitor_Pflegeaufgaben_je_Datentyp.md`
- `Statistik/quality.js`
- `Statistik/scripts.js`
