document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------
  //  XML-Kategorien-URLs (inkl. Package & Article)
  // ------------------------------
  const xmlUrls = {
    Hotel:  'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml',
    Event:  'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Gastro: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Tour:   'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    POI:    'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    // neu:
    Package:'http://api.et4.de/Schema/eTouristV4/GlobalePauschale/Sachsen-Tourismus/GlobalePauschaleTree.xml',
    Article:'http://api.et4.de/Schema/eTouristV4/managed/18638/Artikel_CategoryTree.xml'
  };

  /**
   * Baut die Proxy-URL für die Suche.
   * @param {string} type       - Datentyp (z.B. 'POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package', 'Article', 'Area', 'City')
   * @param {string} rawQuery   - Unkodierter Query-String (z.B. 'area:"Dresden" AND category:"Museum"')
   * @param {boolean} isOpenData - Wenn true, wird Lizenzfilter angehängt
   * @returns {string} - Fertige Proxy-URL
   */
  const buildUrl = (type, rawQuery = '', isOpenData = false) => {
    const base = 'https://satourn.onrender.com/api/search';
    const params = new URLSearchParams();

    params.append('type', type);

    let q = rawQuery || '';

    if (isOpenData) {
      const LICENSE = 'attribute_license:(CC0 OR CC-BY OR CC-BY-SA)';
      q = q ? `${q} AND ${LICENSE}` : LICENSE;
    }

    params.append('query', q);

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

  // inkl. Package & Article
  const typesList = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package', 'Article'];

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
  //  Fehlerbehandlung
  // ------------------------------
  const handleError = (message) => {
    console.error(message);
    elements.resultDiv.textContent = 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
  };

  // ------------------------------
  //  Tabellenausgabe
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
      const statZahl       = parseInt(statistikCount, 10);
      const openZahl       = parseInt(openDataCount, 10);
      const openPercentage = statZahl > 0 ? ((openZahl / statZahl) * 100).toFixed(2) : '0.00';

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

    const avgPercentage = count > 0 ? (totalPercentage / count).toFixed(2) : '0.00';

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
  /**
   * Baut Deskriptoren für alle kombinierten Filteroptionen.
   * @param {Object} filters - Auswahlfilter (type, area, place, categories, allAreas)
   * @param {Array<string>} areasList - Liste aller Gebiete (nur bei "Alle Gebiete" nötig)
   * @returns {Array<Object>} Deskriptoren mit Typ, Query, OpenData-Flag usw.
   */
  const buildQueryDescriptors = (filters, areasList = []) => {
    const { allAreas, area, place, type, categories } = filters;
    const descriptors = [];

    const buildQuery = ({ area, place, category }) => {
      const segments = [];
      if (area) segments.push(`area:"${area}"`);
      if (place) segments.push(`city:"${place}"`);
      if (category) segments.push(`category:"${category}"`);
      return segments.join(' AND ');
    };

    const addDescriptor = ({ type, query, area, place, category }) => {
      descriptors.push({
        type,
        query,
        isOpenData: false,
        area,
        place,
        category
      });
      descriptors.push({
        type,
        query,
        isOpenData: true,
        area,
        place,
        category
      });
    };

    // 1) Alle Gebiete → alle Typen je Gebiet
    if (allAreas && areasList.length) {
      areasList.forEach(areaItem => {
        typesList.forEach(typeItem => {
          const query = buildQuery({ area: areaItem });
          addDescriptor({ type: typeItem, query, area: areaItem, place: '-', category: '-' });
        });
      });
      return descriptors;
    }

    // 2) Typ gewählt, aber kein Gebiet oder Ort → alle Gebiete
    if (!area && !place && type) {
      areasList.forEach(areaItem => {
        const query = buildQuery({ area: areaItem });
        addDescriptor({ type, query, area: areaItem, place: '-', category: '-' });
      });
      return descriptors;
    }

    // 3) Nichts gewählt → alle Typen für Sachsen
    if (!area && !place && !type) {
      typesList.forEach(typeItem => {
        addDescriptor({ type: typeItem, query: '', area: 'Sachsen', place: '-', category: '-' });
      });
      return descriptors;
    }

    // 4) Gebiet gewählt, kein Ort, kein Typ → alle Typen
    if (area && !place && !type) {
      typesList.forEach(typeItem => {
        const query = buildQuery({ area });
        addDescriptor({ type: typeItem, query, area, place: '-', category: '-' });
      });
      return descriptors;
    }

    // 5) Gebiet + Typ, ggf. mit Kategorien
    if (area && type && !place) {
      if (!categories.length) {
        const query = buildQuery({ area });
        addDescriptor({ type, query, area, place: '-', category: '-' });
      } else {
        categories.forEach(cat => {
          const query = buildQuery({ area, category: cat });
          addDescriptor({ type, query, area, place: '-', category: cat });
        });
      }
      return descriptors;
    }

    // 6) Ort + Typ, ohne Gebiet
    if (!area && place && type) {
      if (!categories.length) {
        const query = buildQuery({ place });
        addDescriptor({ type, query, area: '-', place, category: '-' });
      } else {
        categories.forEach(cat => {
          const query = buildQuery({ place, category: cat });
          addDescriptor({ type, query, area: '-', place, category: cat });
        });
      }
      return descriptors;
    }

    // 7) Gebiet + Ort, kein Typ → alle Typen
    if (area && place && !type) {
      typesList.forEach(typeItem => {
        const query = buildQuery({ area, place });
        addDescriptor({ type: typeItem, query, area, place, category: '-' });
      });
      return descriptors;
    }

    // 8) Gebiet + Ort + Typ → ggf. mit Kategorien
    if (area && place && type) {
      if (!categories.length) {
        const query = buildQuery({ area, place });
        addDescriptor({ type, query, area, place, category: '-' });
      } else {
        categories.forEach(cat => {
          const query = buildQuery({ area, place, category: cat });
          addDescriptor({ type, query, area, place, category: cat });
        });
      }
      return descriptors;
    }

    return descriptors;
  };

  // ------------------------------
  //  Antworten parsen gemäß Deskriptoren
  // ------------------------------
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
  //  Abfragen ausführen
  // ------------------------------
  const runQueries = (descriptors) => {
    const promises = descriptors.map(d => {
      const url = buildUrl(d.type, d.query, d.isOpenData);
      console.log('[runQueries] fetching:', url);
      return fetch(url).then(res => {
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
  };

  // ------------------------------
  //  Gesamtablauf (Daten holen)
  // ------------------------------
  const fetchData = () => {
    const filters = {
      allAreas:  elements.allAreasCheckbox.checked,
      area:      selectedArea,
      place:     selectedPlace,
      type:      selectedType,
      categories
    };

    // 1) Alle Gebiete → erst Areas laden
    if (filters.allAreas) {
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

          const descriptors = buildQueryDescriptors({ ...filters, allAreas: true }, areasList);
          runQueries(descriptors);
        })
        .catch(err => {
          handleError(err);
          toggleLoading(false);
        });
      return;
    }

    // 2) Typ gewählt, aber kein Gebiet und kein Ort → trotzdem alle Gebiete brauchen
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
    const raw = area ? `area:"${area}"` : '';
    fetch(buildUrl('City', raw))
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
  //  Nutzt die oben gesetzten Tree-URLs – inkl. Package & Article.
  // ------------------------------
  const loadCategories = (type) => {
    const treeUrl = xmlUrls[type];
    if (!treeUrl) {
      categories = [];
      selectedCategory = null;
      return;
    }
    fetch(treeUrl)
      .then(res => res.ok ? res.text() : Promise.reject(res.status))
      .then(xmlText => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const rootCats = xmlDoc.getElementsByTagName('Category');
        categories = Array.from(rootCats).map(cat => cat.getAttribute('Name')).filter(Boolean);
      })
      .catch(err => {
        console.error('Fehler beim Laden der Kategorien:', err);
        categories = [];
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
  //  Typen laden (inkl. Package, Article)
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
    elements.resultDiv.innerHTML          = '';
    elements.generatedUrlDiv.innerHTML    = '';
    elements.chartContainer.style.display = 'none';
    fetchData();
  });
});
