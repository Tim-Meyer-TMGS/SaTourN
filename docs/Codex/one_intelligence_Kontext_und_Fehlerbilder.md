# one.intelligence - Kontext und Fehlerbilder für KI-Modelle

Stand: 2026-06-12

Dieses Dokument beschreibt den fachlichen Kontext für die beiden
one.intelligence-Anwendungsfälle im Datenqualitäts-Monitor:

- KI-Mail-Entwurf an Dateninhaber
- KI-Suche nach thematisch passenden Datensätzen

Ziel ist nicht die technische API-Beschreibung, sondern ein gemeinsames
Verständnis der Aufgabe, der Sprache und der Fehlerbilder.

## 1. Fachlicher Rahmen

Der Datenqualitäts-Monitor bewertet touristische Datensätze aus
Destination.One. Er zeigt Lücken in den Daten und hilft Redaktionen oder
Dateninhabern dabei, Datensätze zu verbessern.

Wichtige Grundsätze:

- Es geht um Datenpflege, nicht um Werbung.
- Die Kommunikation soll sachlich, freundlich und handlungsorientiert sein.
- Fehler bedeuten: bestimmte Angaben fehlen, sind unvollständig oder für den
  Anwendungsfall nicht ausreichend gepflegt.
- Nicht jede fachlich sinnvolle Prüfung ist schon technisch automatisch
  aktiviert.
- Das Modell darf keine Felder, Inhalte oder Fehler erfinden, die nicht im
  Input übergeben wurden.

## 2. Wofür die beiden Modelle da sind

### 2.1 Mail-Entwurf

Ziel:

- Ein Dateninhaber soll freundlich und konkret auf Pflegebedarf hingewiesen
  werden.
- Die Mail soll helfen, den Datensatz zu verbessern.
- Der Text soll verständlich sein, auch ohne internes Systemwissen.

Die Mail darf nicht:

- technische API-Begriffe verwenden
- interne Statusnamen nennen
- Schuld zuweisen
- Druck oder Drohkulissen aufbaün
- unbekannte Fakten oder Ursachen erfinden

Die Mail soll:

- den Datensatz kurz einordnen
- die relevanten Fehler knapp benennen
- kurz erklären, warum die Angaben wichtig sind
- eine konkrete Pflegeempfehlung geben

### 2.2 AI-Search

Ziel:

- Ein Nutzer soll per Freitext Datensätze zu einem Thema finden können.
- Die Rückgabe besteht später aus `global_id`-Treffern, nicht aus Text.
- Die Suche dient dazu, Datensätze zu Themen, Kampagnen oder inhaltlichen
  Gruppen zusammenzustellen.

Die Suche soll:

- thematisch passende touristische Datensätze erkennen
- den Arbeitskontext berücksichtigen, wenn Gebiet, Ort oder Datentyp
  übergeben wurden
- eher präzise als breit antworten

Die Suche darf nicht:

- IDs erfinden
- Freitext erklären statt IDs liefern
- fachlich unpassende Treffer aufblasen

## 3. Was ein Fehler in diesem System bedeutet

Ein Fehler bedeutet in diesem Kontext:

- eine erwartete Angabe fehlt
- eine wichtige offene Datenangabe fehlt
- eine für Nutzer relevante Kontextangabe fehlt
- ein Datensatz ist dadurch schwächer nutzbar, schlechter auffindbar oder
  nicht ausreichend open-data-fähig

Es gibt ausserdem:

- `vorbereitete` Prüfungen:
  fachlich bereits sinnvoll, aber noch nicht voll automatisch angebunden
- `manülle` Prüfungen:
  nur redaktionell beurteilbar
- `qüllseitig` abgefangene oder ausgeschlossene Fälle:
  fachlich relevant, aber keine normale Pflegeaufgabe

Für die Modelle ist wichtig:

- Nur die im Input enthaltenen Fehler als echte Probleme behandeln.
- Nicht jede mögliche Prüfung ist automatisch ein aktüller Fehler.

## 4. Fehlerbilder und Bedeutung

Die folgenden Fehlerbilder sind besonders relevant für Mails und spätere
KI-Unterstützung. Die Beschreibungen sind absichtlich nutzerorientiert.

### 4.1 Lizenz / Open Data

Fehlerbild:

- Es fehlt eine gültige Lizenzangabe für offene Daten.

Bedeutung:

- Ohne Lizenz ist die rechtssichere Nachnutzung erschwert oder nicht möglich.
- Der Datensatz ist dann meist nicht oder nur eingeschränkt open-data-fähig.

Empfohlene Sprache:

- Die Lizenzangabe fehlt noch.
- Bitte eine passende Lizenz ergänzen oder den Open-Data-Status prüfen.

### 4.2 Beschreibung / Beschreibungstext

Fehlerbild:

- Ein zentraler Beschreibungstext fehlt.

Bedeutung:

- Nutzer verstehen das Angebot schlechter.
- Auffindbarkeit, Einordnung und redaktionelle Nutzbarkeit leiden.

Empfohlene Sprache:

- Der Datensatz enthält noch keine ausreichende Beschreibung.
- Bitte einen klaren Beschreibungstext ergänzen.

### 4.3 Teaser / Kurztext

Fehlerbild:

- Ein kurzer Einstiegstext oder Teaser fehlt.

Bedeutung:

- Der Datensatz wirkt unvollständig.
- Kurze Übersichten, Listen und Vorschaudarstellungen werden schwächer.

Empfohlene Sprache:

- Ein kurzer Teaser oder Einleitungstext fehlt noch.
- Bitte einen kompakten Kurztext ergänzen.

### 4.4 Strasse / Anschrift

Fehlerbild:

- Die Strasse oder Anschrift fehlt.

Bedeutung:

- Die Verortung des Angebots wird unklar.
- Anreise und Orientierung werden erschwert.

Empfohlene Sprache:

- Die Anschrift ist noch nicht vollständig.
- Bitte Strasse oder vollständige Adressangaben ergänzen.

### 4.5 Telefon

Fehlerbild:

- Eine Telefonnummer fehlt.

Bedeutung:

- Rückfragen oder kurzfristige Kontaktaufnahme sind erschwert.

Empfohlene Sprache:

- Eine Telefonnummer ist noch nicht hinterlegt.
- Bitte eine erreichbare Telefonnummer ergänzen.

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

- Weiterführende Informationen, Buchung oder Verifikation sind erschwert.

Empfohlene Sprache:

- Eine weiterführende Webseite fehlt noch.
- Bitte eine passende Webadresse ergänzen.

### 4.8 Öffnungszeiten

Fehlerbild:

- Es sind keine Öffnungszeiten hinterlegt.

Bedeutung:

- Nutzer können den Besuch schlechter planen.
- Die Aussagekraft des Datensatzes sinkt deutlich.

Empfohlene Sprache:

- Es sind noch keine Öffnungszeiten hinterlegt.
- Bitte Öffnungszeiten ergänzen oder aktualisieren.

### 4.9 Preisinformation

Fehlerbild:

- Preis-, Eintritts- oder Kostenhinweise fehlen.

Bedeutung:

- Vergleichbarkeit und Erwartungsmanagement werden erschwert.

Empfohlene Sprache:

- Preisinformationen fehlen noch.
- Bitte Preis-, Eintritts- oder Kostenhinweise ergänzen.

### 4.10 Zahlungsmöglichkeiten

Fehlerbild:

- Es ist keine geprüfte Zahlungsart vorhanden.

Bedeutung:

- Nutzer wissen nicht, wie vor Ort oder online gezahlt werden kann.

Empfohlene Sprache:

- Zahlungsmöglichkeiten sind noch nicht ausreichend gepflegt.
- Bitte mindestens eine passende Zahlungsart ergänzen.

### 4.11 Buchungslink

Fehlerbild:

- Ein Buchungs-, Reservierungs- oder Ticketlink fehlt.

Bedeutung:

- Der direkte Abschluss oder die Weiterleitung ist erschwert.

Empfohlene Sprache:

- Ein direkter Buchungs- oder Reservierungslink fehlt noch.
- Bitte eine passende Buchungsmöglichkeit hinterlegen.

### 4.12 ÖPNV-Anreise / Anfahrt

Fehlerbild:

- Informationen zur Anreise mit ÖPNV oder allgemeine Anfahrtshinweise fehlen.

Bedeutung:

- Die Planung vor Ort wird schwieriger.

Empfohlene Sprache:

- Hinweise zur Anreise fehlen noch.
- Bitte Informationen zu ÖPNV oder Anfahrt ergänzen.

### 4.13 Parken / Parkhinweise

Fehlerbild:

- Parkmöglichkeiten oder geprüfte Parkhinweise fehlen.

Bedeutung:

- Die Erreichbarkeit mit dem Auto ist schlechter einschätzbar.

Empfohlene Sprache:

- Parkhinweise sind noch nicht ausreichend gepflegt.
- Bitte Parkmöglichkeiten oder passende Hinweise ergänzen.

### 4.14 Fremdsprachen

Fehlerbild:

- Es ist keine geprüfte Fremdsprache vorhanden.

Bedeutung:

- Internationale Nutzbarkeit und Auffindbarkeit sind eingeschränkt.

Empfohlene Sprache:

- Fremdsprachenangaben fehlen noch.
- Bitte mindestens eine passende Fremdsprache ergänzen.

### 4.15 Eignung

Fehlerbild:

- Es fehlt eine geprüfte Eignungsangabe.

Bedeutung:

- Nutzer können schwerer einschätzen, für wen das Angebot geeignet ist.

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
- Bitte die passende saisonale Einordnung ergänzen.

### 4.17 Bildmaterial

Fehlerbild:

- Es fehlt prüfbares Bildmaterial.

Bedeutung:

- Der Datensatz wirkt weniger anschaulich und redaktionell schwächer.

Empfohlene Sprache:

- Es ist noch kein geeignetes Bildmaterial hinterlegt.
- Bitte mindestens ein passendes Bild ergänzen.

### 4.18 Bildurheber

Fehlerbild:

- Ein Bild ist vorhanden, aber der Urheberhinweis fehlt.

Bedeutung:

- Die rechtssichere Nutzung des Bildes ist erschwert.

Empfohlene Sprache:

- Beim Bildmaterial fehlt noch ein Urheberhinweis.
- Bitte Fotograf oder Copyright-Angabe ergänzen.

### 4.19 Küchenart / Küche

Fehlerbild:

- Bei Gastro fehlen geprüfte Küchenarten oder weitere Kücheninformationen.

Bedeutung:

- Nutzer können das gastronomische Angebot schlechter einordnen.

Empfohlene Sprache:

- Angaben zur Küchenart sind noch nicht vollständig.
- Bitte passende Küchenarten oder Kücheninformationen ergänzen.

### 4.20 Autor / Organisation / Ansprechperson

Fehlerbild:

- Zuständige Kontakt- oder Organisationsangaben fehlen.

Bedeutung:

- Verantwortlichkeiten und redaktionelle Einordnung werden schwächer.

Empfohlene Sprache:

- Zuständige Kontakt- oder Organisationsangaben fehlen noch.
- Bitte die passenden Angaben ergänzen.

### 4.21 Start- und Zielbeschreibungen

Fehlerbild:

- Bei Touren fehlen Informationen zu Start oder Ziel.

Bedeutung:

- Die Orientierung und praktische Nutzbarkeit der Tour sinkt.

Empfohlene Sprache:

- Angaben zu Start oder Ziel sind noch nicht vollständig.
- Bitte Start- und Zielbeschreibung ergänzen.

## 5. Datentyp-Kontext für die Modelle

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
- Öffnungszeiten
- Kontakt
- Preis
- Lizenz
- Eignung / Kontextmerkmale

### Gastro

Typische Schwerpunkte:

- Beschreibung
- Öffnungszeiten
- Zahlungsmöglichkeiten
- Küchenart
- Lizenz

### Event

Typische Schwerpunkte:

- Beschreibung
- Termin- und Kontextverständnis
- Preis
- Kontakt
- ÖPNV-Anreise

### Package

Typische Schwerpunkte:

- Buchungslink
- Lizenz
- Bildurheber

## 6. Welche Eingaben ein KI-Modell idealerweise versteht

### Für Mail-Entwurf

Hilfreiche Eingaben:

- Datensatz-Titel
- Datentyp
- Ort / Gebiet
- globale oder interne ID
- Empfängeradresse
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

### Für AI-Search

Hilfreiche Eingaben:

- Freitext-Suchanfrage
- optionaler Arbeitskontext:
  - Gebiet
  - Ort
  - Datentyp

Das Modell soll daraus:

- thematisch passende touristische Datensätze ableiten
- später nur passende `global_id`-Treffer liefern

## 7. Sprachstil für beide Modelle

Gemeinsame Anforderungen:

- sachlich
- knapp
- freundlich
- nicht belehrend
- keine internen Systembegriffe
- keine Halluzinationen

Für Mail besonders wichtig:

- nicht vorwurfsvoll
- nicht juristisch drohend
- nicht zu lang
- klar strukturierte Bitte zur Nachpflege

Für Search besonders wichtig:

- kein Erklärtext
- keine freie Interpretation ohne Bezug zu realistischen touristischen
  Inhalten

## 8. Was das Modell nie tun soll

- Fehler erfinden
- IDs erfinden
- fehlende Felder als sicher vorhanden darstellen
- interne Codex-, API- oder Proxy-Logik erklären
- Datenschutz-, Lizenz- oder Rechtsbewertung frei erfinden
- eine fehlende Angabe mit einer vermuteten Angabe ersetzen

## 9. Einsatz als Referenz

Dieses Dokument ist sinnvoll als Referenz für:

- Systemprompts
- Assistentenbeschreibung in one.intelligence
- spätere Prompt-Bausteine im Backend
- Abstimmung der Fehlertexte zwischen UI, Mail und KI-Suche

Verwandte Dateien:

- `docs/Codex/Render_OI_Einrichtung.md`
- `docs/Codex/Datenqualitätsmonitor_Pflegeaufgaben_je_Datentyp.md`
- `Statistik/quality.js`
- `Statistik/scripts.js`
