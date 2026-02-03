document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------
  //  XML-Kategorien-URLs (Article entfernt)
  // ------------------------------
  const xmlUrls = {
    Hotel:  'https://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml',
    Event:  'https://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml',
    Gastro: 'https://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml',
    Tour:   'https://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml',
    POI:    'https://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml',
    Package:'https://api.et4.de/Schema/eTouristV4/GlobalePauschale/Sachsen-Tourismus/GlobalePauschaleTree.xml'
  };

  /**
   * Baut die Proxy-URL für die Suche.
   * @param {string} type        Datentyp (z.B. 'POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package', 'Area', 'City')
   * @param {string} rawQuery    Unkodierter Query-String (z.B. 'area:"Dresden" AND category:"Museum"')
   * @param {boolean} isOpenData Wenn true, wird Lizenzfilter angehängt
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
    coffeeFill:         document.getElementById('coffee-fill'),

    // Neu (Pill + Progress aus der neuen index.html)
    statusPill:         document.getElementById('status-pill'),
    statusText:         document.getElementById('status-text'),
    progWrap:           document.querySelector('.progWrap'),
    progBar:            document.getElementById('prog-bar'),
    progMeta:           document.getElementById('prog-meta'),
    prog:               document.querySelector('.prog')
  };

  // ------------------------------
  //  Globale Variablen für Auswahl
  // ------------------------------
  let selectedType  = null;
  let selectedArea  = null;
  let selectedPlace = null;

  // Kategorien-Cache pro Typ
  const categoriesCache = {}; // { [type]: string[] }
  let availableCategories = [];

  const typesList = ['POI', 'Tour', 'Hotel', 'Event', 'Gastro', 'Package'];

  // ------------------------------
  //  UI Helpers: Pill + Progress
  // ------------------------------
  const setPill = (state, text) => {
    // state: 'run' | 'ok' | 'err'
    if (!elements.statusPill || !elements.statusText) return;
    elements.statusPill.classList.remove('run', 'ok', 'err');
    if (state) elements.statusPill.classList.add(state);
    if (typeof text === 'string') elements.statusText.textContent = text;
  };

  const showProgress = (show) => {
    if (!elements.progWrap) return;
    elements.progWrap.style.display = show ? 'flex' : 'none';
  };

  const setProgress = (pct) => {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (elements.progBar) elements.progBar.style.width = `${p}%`;
    if (elements.progMeta) elements.progMeta.textContent = `${p}%`;
    if (elements.prog) elements.prog.setAttribute('aria-valuenow', String(p));
  };

  // Startzustand
  setPill('ok', 'bereit');
  showProgress(false);
  setProgress(0);

  // ------------------------------
  //  Ladezustand anzeigen/verbergen (Coffee)
  // ------------------------------
  const toggleLoading = (isLoading) => {
    if (!elements.loadingContainer || !elements.coffeeFill) return;
    elements.loadingContainer.style.display = isLoading ? 'flex' : 'none';
    elements.coffeeFill.style.transform = isLoading ? 'scaleY(1)' : 'scaleY(0)';
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
    if (elements.resultDiv) {
      elements.resultDiv.textContent =
        'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.';
    }
    setPill('err', 'fehler');
  };

  // ------------------------------
  //  Tabellenausgabe (mit gewichteter Gesamtzahl)
  // ------------------------------
  const displayTable = (data) => {
    if (!elements.resultDiv) return;

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

    let totalStatistik = 0;
    let totalOpenData  = 0;

    data.forEach(({ area, place, type, category, statistikCount, openDataCount }) => {
      const statZahl = parseInt(statistikCount, 10) || 0;
      const openZahl = parseInt(openDataCount, 10) || 0;

      const denom = Math.max(statZahl, 0);
      const cappedOpen = Math.min(openZahl, statZahl);
      const rowPct = denom > 0 ? ((cappedOpen / denom) * 100).toFixed(2) : '0.00';

      totalStatistik += statZahl;
      totalOpenData  += openZahl;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${area}</td>
        <td>${place}</td>
        <td>${type}</td>
        <td>${category || '-'}</td>
        <td>${statZahl}</td>
        <td>${openZahl}</td>
        <td>${rowPct}%</td>
      `;
      tbody.appendChild(row);
    });

    const totalPct = totalStatistik > 0
      ? ((Math.min(totalOpenData, totalStatistik) / totalStatistik) * 100).toFixed(2)
      : '0.00';

    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.innerHTML = `
      <td colspan="4">Gesamt</td>
      <td>${totalStatistik}</td>
      <td>${totalOpenData}</td>
      <td>${totalPct}%</td>
    `;
    tbody.appendChild(totalRow);

    elements.resultDiv.appendChild(table);
  };

  // ------------------------------
  //  Query-Deskriptoren erzeugen (generisch)
  // ------------------------------
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
      descriptors.push({ type, query, isOpenData: false, area, place, category });
      descriptors.push({ type, query, isOpenData: true,  area, place, category });
    };

    if (allAreas && areasList.length) {
      areasList.forEach(areaItem => {
        typesList.forEach(typeItem => {
          const query = buildQuery({ area: areaItem });
          addDescriptor({ type: typeItem, query, area: areaItem, place: '-', category: '-' });
        });
      });
      return descriptors;
    }

    if (!area && !place && type) {
      areasList.forEach(areaItem => {
        const query = buildQuery({ area: areaItem });
        addDescriptor({ type, query, area: areaItem, place: '-', category: '-' });
      });
      return descriptors;
    }

    if (!area && !place && !type) {
      typesList.forEach(typeItem => {
        addDescriptor({ type: typeItem, query: '', area: 'Sachsen', place: '-', category: '-' });
      });
      return descriptors;
    }

    if (area && !place && !type) {
      typesList.forEach(typeItem => {
        const query = buildQuery({ area });
        addDescriptor({ type: typeItem, query, area, place: '-', category: '-' });
      });
      return descriptors;
    }

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

    if (area && place && !type) {
      typesList.forEach(typeItem => {
        const query = buildQuery({ area, place });
        addDescriptor({ type: typeItem, query, area, place, category: '-' });
      });
      return descriptors;
    }

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
  //  Abfragen ausführen (mit Progress)
  // ------------------------------
  const runQueries = (descriptors) => {
    const total = descriptors.length;
    let done = 0;

    const bump = () => {
      done += 1;
      // bis 95% während fetch, 100% nach parse/display
      const pct = total > 0 ? (done / total) * 95 : 95;
      setProgress(pct);
      if (elements.statusText) elements.statusText.textContent = `lädt… ${done}/${total}`;
    };

    const promises = descriptors.map(d => {
      const url = buildUrl(d.type, d.query, d.isOpenData);
      console.log('[runQueries] fetching:', url);

      return fetch(url)
        .then(res => {
          if (!res.ok) throw res.status;
          return res.text();
        })
        .then(txt => {
          bump();
          return txt;
        });
    });

    Promise.all(promises)
      .then(responses => {
        const data = parseResponses(descriptors, responses);
        displayTable(data);
        setProgress(100);
        setPill('ok', 'fertig');
      })
      .catch(err => {
        handleError(err);
      })
      .finally(() => {
        toggleLoading(false);
        // Progress nach kurzer Zeit wieder ausblenden (UI ruhig halten)
        setTimeout(() => showProgress(false), 700);
      });
  };

  // ------------------------------
  //  Helfer: Kategorien für Typ sicherstellen (mit Cache)
  // ------------------------------
  const ensureCategoriesForType = async (type) => {
    if (!type) return [];
    if (categoriesCache[type]) {
      availableCategories = categoriesCache[type];
      return availableCategories;
    }
    const treeUrl = xmlUrls[type];
    if (!treeUrl) {
      categoriesCache[type] = [];
      availableCategories = [];
      return [];
    }
    const res = await fetch(treeUrl);
    if (!res.ok) {
      console.warn('Kategorie-Tree nicht ladbar für Typ:', type, res.status);
      categoriesCache[type] = [];
      availableCategories = [];
      return [];
    }
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
    const rootCats = Array.from(xmlDoc.getElementsByTagName('Category'));
    const cats = rootCats.map(cat => cat.getAttribute('Name')).filter(Boolean);
    categoriesCache[type] = cats;
    availableCategories = cats;
    return cats;
  };

  // ------------------------------
  //  Gesamtablauf (Daten holen)
  // ------------------------------
  const fetchData = () => {
    const filters = {
      allAreas:   elements.allAreasCheckbox?.checked,
      area:       selectedArea,
      place:      selectedPlace,
      type:       selectedType,
      categories: [] // UI-gestützte Kategorie-Filter momentan nicht aktiv
    };

    // Status/Progress vorbereiten
    setPill('run', 'start…');
    showProgress(true);
    setProgress(2);

    // Vorherige Ausgaben zurücksetzen
    if (elements.resultDiv) elements.resultDiv.innerHTML = '';
    if (elements.generatedUrlDiv) {
      elements.generatedUrlDiv.innerHTML = '';
      elements.generatedUrlDiv.style.display = 'none';
    }
    if (elements.chartContainer) elements.chartContainer.style.display = 'none';

    // 1) "Alle Gebiete" → zuerst Areas holen
    if (filters.allAreas) {
      toggleLoading(true);
      setProgress(6);

      fetch(buildUrl('Area'))
        .then(res => res.ok ? res.text() : Promise.reject(res.status))
        .then(xmlText => {
          setProgress(14);

          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
          const areaItems = Array.from(xmlDoc.getElementsByTagName('item'));
          const areasList = areaItems
            .map(item => item.getElementsByTagName('title')[0]?.textContent)
            .filter(Boolean);

          const descriptors = buildQueryDescriptors({ ...filters, allAreas: true }, areasList);
          // Basisprogress je nach Datenmenge
          setProgress(18);
          runQueries(descriptors);
        })
        .catch(err => {
          handleError(err);
          toggleLoading(false);
          showProgress(false);
        });

      return;
    }

    // 2) Spezialfall: kein Gebiet & kein Ort, aber Typ → Kategorien × Gebiete
    if (!filters.area && !filters.place && filters.type) {
      toggleLoading(true);
      setProgress(6);

      Promise.all([
        fetch(buildUrl('Area')).then(r => r.ok ? r.text() : Promise.reject(r.status)),
        ensureCategoriesForType(filters.type)
      ])
        .then(([xmlText, cats]) => {
          setProgress(14);

          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
          const areaItems = Array.from(xmlDoc.getElementsByTagName('item'));
          const areasList = areaItems
            .map(item => item.getElementsByTagName('title')[0]?.textContent)
            .filter(Boolean);

          const descriptors = [];
          const categoriesToUse = Array.isArray(cats) && cats.length ? cats : [];

          const buildQuery = ({ area, category }) => {
            const segments = [];
            if (area) segments.push(`area:"${area}"`);
            if (category) segments.push(`category:"${category}"`);
            return segments.join(' AND ');
          };

          if (categoriesToUse.length) {
            areasList.forEach(areaItem => {
              categoriesToUse.forEach(cat => {
                const query = buildQuery({ area: areaItem, category: cat });
                descriptors.push({ type: filters.type, query, isOpenData: false, area: areaItem, place: '-', category: cat });
                descriptors.push({ type: filters.type, query, isOpenData: true,  area: areaItem, place: '-', category: cat });
              });
            });
          } else {
            areasList.forEach(areaItem => {
              const query = buildQuery({ area: areaItem });
              descriptors.push({ type: filters.type, query, isOpenData: false, area: areaItem, place: '-', category: '-' });
              descriptors.push({ type: filters.type, query, isOpenData: true,  area: areaItem, place: '-', category: '-' });
            });
          }

          setProgress(18);
          runQueries(descriptors);
        })
        .catch(err => {
          handleError(err);
          toggleLoading(false);
          showProgress(false);
        });

      return;
    }

    // 3) Alle anderen Fälle
    const descriptors = buildQueryDescriptors({ ...filters });
    toggleLoading(true);
    setProgress(10);
    runQueries(descriptors);
  };

  // ------------------------------
  //  Orte laden, wenn ein Gebiet ausgewählt wird
  //  -> Status-Pill gelb während API lädt, grün wenn fertig
  // ------------------------------
  const loadPlaces = (area) => {
    setPill('run', 'Gebiete und Orte werden geladen');

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
            option.value = title;
            dropdown.appendChild(option);
          }
        });

        elements.placeContainer.innerHTML = '';
        elements.placeContainer.appendChild(dropdown);

        dropdown.addEventListener('change', () => {
          selectedPlace = dropdown.value || null;
        });

        setPill('ok', 'bereit');
      })
      .catch(err => {
        console.error('Fehler beim Laden der Orte:', err);
        elements.placeContainer.textContent = 'Fehler beim Laden der Orte.';
        setPill('err', 'fehler');
      });
  };

  // ------------------------------
  //  Kategorien (Cache) laden beim Typwechsel
  // ------------------------------
  const loadCategories = async (type) => {
    await ensureCategoriesForType(type);
  };

  // ------------------------------
  //  Gebiete laden (Dropdown)
  //  -> Status-Pill gelb während API lädt, grün wenn fertig
  // ------------------------------
  const loadAreas = () => {
    setPill('run', 'Gebiete und Orte werden geladen');

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
            option.value = title;
            dropdown.appendChild(option);
          }
        });

        elements.areaContainer.innerHTML = '';
        elements.areaContainer.appendChild(dropdown);

        dropdown.addEventListener('change', () => {
          selectedArea = dropdown.value || null;
          loadPlaces(selectedArea);
        });

        setPill('ok', 'bereit');
      })
      .catch(err => {
        console.error('Fehler beim Laden der Gebiete:', err);
        elements.areaContainer.textContent = 'Fehler beim Laden der Gebiete.';
        setPill('err', 'fehler');
      });
  };

  // ------------------------------
  //  Typen laden (Article entfernt)
  // ------------------------------
  const loadTypes = () => {
    const typeDropdown = document.createElement('select');
    typeDropdown.id = 'type-dropdown';
    typeDropdown.innerHTML = '<option value="" selected>Keine Auswahl</option>';

    typesList.forEach(typeItem => {
      const option = document.createElement('option');
      option.textContent = typeItem;
      option.value = typeItem;
      typeDropdown.appendChild(option);
    });

    elements.typeContainer.innerHTML = '';
    elements.typeContainer.appendChild(typeDropdown);

    typeDropdown.addEventListener('change', async () => {
      selectedType = typeDropdown.value || null;
      if (selectedType) await loadCategories(selectedType);
    });
  };

  // ------------------------------
  //  Checkbox "Alle Gebiete" → Dropdowns deaktivieren/einschalten
  // ------------------------------
  const disableInputs = (disable) => {
    [elements.typeContainer, elements.areaContainer, elements.cityContainer, elements.placeContainer]
      .forEach(container => {
        const dropdown = container?.querySelector?.('select');
        if (dropdown) dropdown.disabled = disable;
      });
  };

  if (elements.allAreasCheckbox) {
    elements.allAreasCheckbox.addEventListener('change', () => {
      disableInputs(elements.allAreasCheckbox.checked);
    });
  }

  // ------------------------------
  //  Initiales Laden
  // ------------------------------
  loadAreas();
  loadTypes();

  // ------------------------------
  //  Klick auf "Ergebnisse suchen"
  // ------------------------------
  if (elements.button) {
    elements.button.addEventListener('click', () => {
      fetchData();
    });
  }
});
