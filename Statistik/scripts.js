document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------
    //  XML-Kategorien-URLs (unverändert)
    // ------------------------------
    const xmlUrls = {
        Hotel: 'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml',
        Event: 'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
        Gastro: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
        Tour:  'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
        POI:   'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml'
    };

    // ------------------------------
    //  Hilfsfunktion: URL bauen (mit licensekey)
    // ------------------------------
const buildUrl = (type, query = '', isOpenData = false) => {
    const base = 'https://satourn.onrender.com/api/search';
    const params = new URLSearchParams();
    params.append('type', type);

    let raw = query.startsWith('&q=') ? query.slice(3) : query;

    // OpenData: Lizenzblock anhängen
    if (isOpenData) {
        const LICENSE_BLOCK = 'attribute_license:(CC0 OR CC-BY OR CC-BY-SA)';
        if (raw && !raw.includes('attribute_license')) {
            raw += ` AND ${LICENSE_BLOCK}`;
        }
        if (!raw) {
            raw = LICENSE_BLOCK;
        }
    }

    // Wichtig: KEIN isOpenData an den Proxy senden!
    if (raw) params.append('query', encodeURIComponent(raw));

    const url = `${base}?${params.toString()}`;
    console.log('[buildUrl]', url);
    return url;
};

    // ------------------------------
    //  DOM-Elemente referenzieren
    // ------------------------------
    const elements = {
        container:          document.getElementById('dropdown-container'),
        typeContainer:      document.getElementById('type-dropdown-container'),
        areaContainer:      document.getElementById('area-dropdown-container'),
        cityContainer:      document.getElementById('city-dropdown-container'),
        placeContainer:     document.getElementById('place-dropdown-container'),
        button:             document.getElementById('search-button'),
        resultDiv:          document.getElementById('result'),
        generatedUrlDiv:    document.getElementById('generated-url'),
        chartContainer:     document.getElementById('chart-container'),
        allAreasCheckbox:   document.getElementById('all-areas-checkbox'),
        loadingContainer:   document.getElementById('loading-container'),
        coffeeFill:         document.getElementById('coffee-fill')
    };

    // ------------------------------
    //  Globale Variablen für Auswahl
    // ------------------------------
    let selectedCategory = null;
    let selectedType     = null;
    let selectedArea     = null;
    let selectedCity     = null;
    let selectedPlace    = null;
    let categories       = [];

    const typesList = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro'];

    // ------------------------------
    //  Ladezustand anzeigen/verbergen
    // ------------------------------
    const toggleLoading = (isLoading) => {
        elements.loadingContainer.style.display = isLoading ? 'flex' : 'none';
        elements.coffeeFill.style.transform     = isLoading ? 'scaleY(1)' : 'scaleY(0)';
    };

    // ------------------------------
    //  XML-Antwort parsen: overallcount auslesen
    // ------------------------------
    const parseXMLForCount = (data) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'application/xml');
        return xmlDoc.getElementsByTagName('overallcount')[0]?.textContent || '0';
    };

    // ------------------------------
    //  Fehlerbehandlung auslagern
    // ------------------------------
    const handleError = (message) => {
        console.error(message);
        elements.resultDiv.textContent = 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
    };

    // ------------------------------
    //  Tabellenausgabe (erhält bereits formatiertes data-Array)
    // ------------------------------
    const displayTable = (data) => {
        elements.resultDiv.innerHTML = '';
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Gebiet</th>
                    <th>Ort</th>
                    <th>Typ</th>
                    <th>Kategorie</th>
                    <th>SaTourN</th>
                    <th>Open-Data</th>
                    <th>Open-Data-Prozentsatz</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        let totalStatistik   = 0;
        let totalOpenData    = 0;
        let totalPercentage  = 0;
        let count            = 0;

        data.forEach(({ area, place, type, category, statistikCount, openDataCount }) => {
            const statZahl             = parseInt(statistikCount, 10);
            const openZahl             = parseInt(openDataCount, 10);
            const openPercentage       = statZahl > 0 
                ? ((openZahl / statZahl) * 100).toFixed(2)
                : '0.00';

            totalStatistik  += statZahl;
            totalOpenData   += openZahl;
            totalPercentage += parseFloat(openPercentage);
            count++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${area}</td>
                <td>${place}</td>
                <td>${type}</td>
                <td>${category || '-'}</td>
                <td>${statistikCount}</td>
                <td>${openDataCount}</td>
                <td>${openPercentage}%</td>
            `;
            tbody.appendChild(row);
        });

        // Durchschnittlicher Zeilen-Prozentsatz
        const avgPercentage = count > 0 
            ? (totalPercentage / count).toFixed(2) 
            : '0.00';

        // Gesamtzeile
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.innerHTML = `
            <td colspan="4">Gesamt</td>
            <td>${totalStatistik}</td>
            <td>${totalOpenData}</td>
            <td>${avgPercentage}%</td>
        `;
        tbody.appendChild(totalRow);

        elements.resultDiv.appendChild(table);
    };

    // ------------------------------
    //  Query-Deskriptoren erzeugen (filterbasiert)
    // ------------------------------
    // Gibt ein Array von Objekten zurück:
    // { type, query, isOpenData, area, place, category }
    const buildQueryDescriptors = (filters, areasList = []) => {
        const { allAreas, area, place, type, categories } = filters;
        const descriptors = [];

        // 1) Alle Gebiete (für jeden Typ und jedes Gebiet in areasList)
        if (allAreas && areasList.length) {
            areasList.forEach(areaItem => {
                typesList.forEach(typeItem => {
                    const qSegment = `&q=area%3A%22${encodeURIComponent(areaItem)}%22`;
                    descriptors.push({
                        type:       typeItem,
                        query:      qSegment,
                        isOpenData: false,
                        area:       areaItem,
                        place:      '-',
                        category:   '-'
                    });
                    descriptors.push({
                        type:       typeItem,
                        query:      qSegment,
                        isOpenData: true,
                        area:       areaItem,
                        place:      '-',
                        category:   '-'
                    });
                });
            });
            return descriptors;
        }

        // 2) Nur Typ ausgewählt, kein Gebiet, kein Ort → für alle Gebiete
        if (!area && !place && type) {
            areasList.forEach(areaItem => {
                const qSegment = `&q=area%3A%22${encodeURIComponent(areaItem)}%22`;
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: false,
                    area:       areaItem,
                    place:      '-',
                    category:   '-'
                });
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: true,
                    area:       areaItem,
                    place:      '-',
                    category:   '-'
                });
            });
            return descriptors;
        }

        // 3) Kein Gebiet, kein Ort, kein Typ → alle Typen ohne Filter (Area="Sachsen")
        if (!area && !place && !type) {
            typesList.forEach(typeItem => {
                descriptors.push({
                    type:       typeItem,
                    query:      '',                 // keine &q=…
                    isOpenData: false,
                    area:       'Sachsen',
                    place:      '-',
                    category:   '-'
                });
                descriptors.push({
                    type:       typeItem,
                    query:      '', 
                    isOpenData: true,
                    area:       'Sachsen',
                    place:      '-',
                    category:   '-'
                });
            });
            return descriptors;
        }

        // 4) Gebiet gewählt, kein Typ, kein Ort → für jeden Typ im gewählten Gebiet
        if (area && !type && !place) {
            typesList.forEach(typeItem => {
                const qSegment = `&q=area%3A%22${encodeURIComponent(area)}%22`;
                descriptors.push({
                    type:       typeItem,
                    query:      qSegment,
                    isOpenData: false,
                    area,
                    place:      '-',
                    category:   '-'
                });
                descriptors.push({
                    type:       typeItem,
                    query:      qSegment,
                    isOpenData: true,
                    area,
                    place:      '-',
                    category:   '-'
                });
            });
            return descriptors;
        }

        // 5) Gebiet + Typ, kein Ort → falls Kategorien leer, nur Gebiet+Typ, sonst jede Kategorie
        if (area && type && !place) {
            if (!categories.length) {
                const qSegment = `&q=area%3A%22${encodeURIComponent(area)}%22`;
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: false,
                    area,
                    place:      '-',
                    category:   '-'
                });
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: true,
                    area,
                    place:      '-',
                    category:   '-'
                });
            } else {
                categories.forEach(cat => {
                    const qSegment = `&q=area%3A%22${encodeURIComponent(area)}%22+AND+category%3A%22${encodeURIComponent(cat)}%22`;
                    descriptors.push({
                        type,
                        query:      qSegment,
                        isOpenData: false,
                        area,
                        place:      '-',
                        category:   cat
                    });
                    descriptors.push({
                        type,
                        query:      qSegment,
                        isOpenData: true,
                        area,
                        place:      '-',
                        category:   cat
                    });
                });
            }
            return descriptors;
        }

        // 6) Ort + Typ, kein Gebiet → falls Kategorien leer, nur Ort+Typ, sonst jede Kategorie
        if (!area && place && type) {
            if (!categories.length) {
                const qSegment = `&q=city%3A%22${encodeURIComponent(place)}%22`;
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: false,
                    area:       '-',
                    place,
                    category:   '-'
                });
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: true,
                    area:       '-',
                    place,
                    category:   '-'
                });
            } else {
                categories.forEach(cat => {
                    const qSegment = `&q=city%3A%22${encodeURIComponent(place)}%22+AND+category%3A%22${encodeURIComponent(cat)}%22`;
                    descriptors.push({
                        type,
                        query:      qSegment,
                        isOpenData: false,
                        area:       '-',
                        place,
                        category:   cat
                    });
                    descriptors.push({
                        type,
                        query:      qSegment,
                        isOpenData: true,
                        area:       '-',
                        place,
                        category:   cat
                    });
                });
            }
            return descriptors;
        }

        // 7) Gebiet + Ort, kein Typ → alle Typen mit Gebiet+Ort
        if (area && place && !type) {
            typesList.forEach(typeItem => {
                const qSegment = `&q=area%3A%22${encodeURIComponent(area)}%22+AND+city%3A%22${encodeURIComponent(place)}%22`;
                descriptors.push({
                    type:       typeItem,
                    query:      qSegment,
                    isOpenData: false,
                    area,
                    place,
                    category:   '-'
                });
                descriptors.push({
                    type:       typeItem,
                    query:      qSegment,
                    isOpenData: true,
                    area,
                    place,
                    category:   '-'
                });
            });
            return descriptors;
        }

        // 8) Gebiet + Ort + Typ → falls Kategorien leer: nur Gebiet+Ort+Typ, sonst jede Kategorie
        if (area && place && type) {
            if (!categories.length) {
                const qSegment = `&q=area%3A%22${encodeURIComponent(area)}%22+AND+city%3A%22${encodeURIComponent(place)}%22`;
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: false,
                    area,
                    place,
                    category:   '-'
                });
                descriptors.push({
                    type,
                    query:      qSegment,
                    isOpenData: true,
                    area,
                    place,
                    category:   '-'
                });
            } else {
                categories.forEach(cat => {
                    const qSegment = `&q=area%3A%22${encodeURIComponent(area)}%22+AND+city%3A%22${encodeURIComponent(place)}%22+AND+category%3A%22${encodeURIComponent(cat)}%22`;
                    descriptors.push({
                        type,
                        query:      qSegment,
                        isOpenData: false,
                        area,
                        place,
                        category:   cat
                    });
                    descriptors.push({
                        type,
                        query:      qSegment,
                        isOpenData: true,
                        area,
                        place,
                        category:   cat
                    });
                });
            }
            return descriptors;
        }

        // Falls keine Bedingung passt (sollte nie vorkommen), Rückgabe leer
        return descriptors;
    };

    // ------------------------------
    //  Antworten parsen gemäß Deskriptoren
    // ------------------------------
    // descriptors: wie in buildQueryDescriptors, responses: Array von XML-Strings, gleiche Reihenfolge
    const parseResponses = (descriptors, responses) => {
        const data = [];
        for (let i = 0; i < responses.length; i += 2) {
            const desc = descriptors[i];
            const statistikCount = parseXMLForCount(responses[i]);
            const openDataCount  = parseXMLForCount(responses[i + 1]);
            data.push({
                area:          desc.area,
                place:         desc.place || '-',
                type:          desc.type,
                category:      desc.category || '-',
                statistikCount,
                openDataCount
            });
        }
        return data;
    };

    // ------------------------------
const runQueries = (descriptors) => {
  const promises = descriptors.map(d => {
    const url = buildUrl(d.type, d.query, d.isOpenData);
    console.log('[runQueries] fetching:', url);
    return fetch(url)
      .then(res => {
        if (!res.ok) throw res.status;
        return res.text();
      });
  });
    
Promise.all(promises)
    .then(responses => {
      const data = parseResponses(descriptors, responses);
      displayTable(data);
    })
    .catch(err => handleError(err))
    .finally(() => toggleLoading(false));
}; // <--- **Hier muss eine Klammer hin!**
   // ------------------------------
    const fetchData = () => {
        const filters = {
            allAreas:  elements.allAreasCheckbox.checked,
            area:      selectedArea,
            place:     selectedPlace,
            type:      selectedType,
            categories
        };

        // Generische Ablaufsteuerung:
        // 1) Falls allAreas oder (type && !area && !place): erst Liste der Gebiete holen
        // 2) Danach Query-Deskriptoren bauen
        // 3) Promise.all ausführen
        // 4) parseResponses + displayTable

        // Hilfsfunktion, um aus Deskriptoren & Antworten die Tabelle zu füllen
        // 1) Fall: "Alle Gebiete abfragen"
        if (filters.allAreas) {
            toggleLoading(true);
            // Zuerst alle Gebiete laden
            fetch(buildUrl('Area'))
                .then(res => res.ok ? res.text() : Promise.reject(res.status))
                .then(xmlText => {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                    const areaItems = Array.from(xmlDoc.getElementsByTagName('item'));
                    const areasList = areaItems
                        .map(item => item.getElementsByTagName('title')[0]?.textContent)
                        .filter(Boolean);

                    const descriptors = buildQueryDescriptors({ ...filters, allAreas: true }, areasList);
                    runQueries(descriptors);
                })
                .catch(err => {
                    handleError(err);
                    toggleLoading(false);
                });
            return;
        }

        // 2) Fall: Typ ausgewählt, aber kein Gebiet und kein Ort → trotzdem brauchen wir alle Gebiete
        if (!filters.area && !filters.place && filters.type) {
            toggleLoading(true);
            fetch(buildUrl('Area'))
                .then(res => res.ok ? res.text() : Promise.reject(res.status))
                .then(xmlText => {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                    const areaItems = Array.from(xmlDoc.getElementsByTagName('item'));
                    const areasList = areaItems
                        .map(item => item.getElementsByTagName('title')[0]?.textContent)
                        .filter(Boolean);

                    const descriptors = buildQueryDescriptors({ ...filters }, areasList);
                    runQueries(descriptors);
                })
                .catch(err => {
                    handleError(err);
                    toggleLoading(false);
                });
            return;
        }

        // 3) Alle anderen Fälle: direkte Deskriptoren-Erzeugung (ohne Gebiets-Fetch)
        const descriptors = buildQueryDescriptors({ ...filters });
        toggleLoading(true);
        runQueries(descriptors);
    };

    // ------------------------------
    //  Orte laden, wenn ein Gebiet ausgewählt wird
    // ------------------------------
    const loadPlaces = (area) => {
        let q = '';
        if (area) q = `&q=area%3A%22${encodeURIComponent(area)}%22`;

        fetch(buildUrl('City', q))
            .then(res => res.ok ? res.text() : Promise.reject(res.status))
            .then(xmlText => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                const items  = xmlDoc.getElementsByTagName('item');

                const dropdown = document.createElement('select');
                dropdown.id = 'places-dropdown';
                dropdown.innerHTML = '<option value="" selected>Keine Auswahl</option>';

                Array.from(items).forEach(item => {
                    const title = item.getElementsByTagName('title')[0]?.textContent;
                    if (title) {
                        const option = document.createElement('option');
                        option.textContent = title;
                        option.value       = title;
                        dropdown.appendChild(option);
                    }
                });

                elements.placeContainer.innerHTML = '';
                elements.placeContainer.appendChild(dropdown);

                dropdown.addEventListener('change', () => {
                    selectedPlace = dropdown.value || null;
                });
            })
            .catch(err => {
                console.error('Fehler beim Laden der Orte:', err);
                elements.placeContainer.textContent = 'Fehler beim Laden der Orte.';
            });
    };

    // ------------------------------
    //  Kategorien laden, wenn ein Typ ausgewählt wird
    // ------------------------------
    const loadCategories = (type) => {
        fetch(xmlUrls[type])
            .then(res => res.ok ? res.text() : Promise.reject(res.status))
            .then(xmlText => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                const rootCats = xmlDoc.getElementsByTagName('Category');
                categories = Array.from(rootCats).map(cat => cat.getAttribute('Name'));
            })
            .catch(err => {
                console.error('Fehler beim Laden der Kategorien:', err);
            });
    };

    // ------------------------------
    //  Gebiete laden (Dropdown)
    // ------------------------------
    const loadAreas = () => {
        fetch(buildUrl('Area'))
            .then(res => res.ok ? res.text() : Promise.reject(res.status))
            .then(xmlText => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
                const areas  = xmlDoc.getElementsByTagName('item');

                const dropdown = document.createElement('select');
                dropdown.id = 'areas-dropdown';
                dropdown.innerHTML = '<option value="" selected>Keine Auswahl</option>';

                Array.from(areas).forEach(item => {
                    const title = item.getElementsByTagName('title')[0]?.textContent;
                    if (title) {
                        const option = document.createElement('option');
                        option.textContent = title;
                        option.value       = title;
                        dropdown.appendChild(option);
                    }
                });

                elements.areaContainer.innerHTML = '';
                elements.areaContainer.appendChild(dropdown);

                dropdown.addEventListener('change', () => {
                    selectedArea = dropdown.value || null;
                    loadPlaces(selectedArea);
                });
            })
            .catch(err => {
                console.error('Fehler beim Laden der Gebiete:', err);
                elements.areaContainer.textContent = 'Fehler beim Laden der Gebiete.';
            });
    };

    // ------------------------------
    //  Typen laden (POI, Tour, Hotel, Event, Gastro)
    // ------------------------------
    const loadTypes = () => {
        const typeDropdown = document.createElement('select');
        typeDropdown.id = 'type-dropdown';
        typeDropdown.innerHTML = '<option value="" selected>Keine Auswahl</option>';
        typesList.forEach(typeItem => {
            const option = document.createElement('option');
            option.textContent = typeItem;
            option.value       = typeItem;
            typeDropdown.appendChild(option);
        });
        elements.typeContainer.innerHTML = '';
        elements.typeContainer.appendChild(typeDropdown);

        typeDropdown.addEventListener('change', () => {
            selectedType = typeDropdown.value || null;
            if (selectedType) loadCategories(selectedType);
        });
    };

    // ------------------------------
    //  Checkbox "Alle Gebiete" → Dropdowns deaktivieren/einschalten
    // ------------------------------
    const disableInputs = (disable) => {
        [elements.typeContainer, elements.areaContainer, elements.cityContainer, elements.placeContainer]
            .forEach(container => {
                const dropdown = container.querySelector('select');
                if (dropdown) dropdown.disabled = disable;
            });
    };
    elements.allAreasCheckbox.addEventListener('change', () => {
        disableInputs(elements.allAreasCheckbox.checked);
    });

    // ------------------------------
    //  Initiales Laden von Gebieten und Typen
    // ------------------------------
    loadAreas();
    loadTypes();

    // ------------------------------
    //  Klick auf "Ergebnisse suchen"
    // ------------------------------
    elements.button.addEventListener('click', () => {
        elements.resultDiv.innerHTML        = '';
        elements.generatedUrlDiv.innerHTML  = '';
        elements.chartContainer.style.display = 'none';
        fetchData();
    });
});
