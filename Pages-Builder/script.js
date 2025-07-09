document.addEventListener('DOMContentLoaded', () => {
            const apiUrls = {
                POI: "http://api.et4.de/Schema/eTouristV4/Poi/Sachsen-Tourismus/POITree.xml",
                Tour: "http://api.et4.de/Schema/eTouristV4/Tour/Sachsen-Tourismus/TourTree.xml",
                Gastronomie: "http://api.et4.de/Schema/eTouristV4/Gastro/Sachsen-Tourismus/GastroTree.xml",
                Event: "http://api.et4.de/Schema/eTouristV4/Veranstaltung/Sachsen-Tourismus/VeranstaltungTree.xml",
                Hotel: "http://api.et4.de/Schema/eTouristV4/Vermieter/Sachsen-Tourismus/VermieterTree.xml"
            };

            const areaApiUrl = "https://meta.et4.de/rest.ashx/search/?experience=statistik_sachsen&type=Area&template=ET2014A.xml";
            const cityApiUrl = "https://meta.et4.de/rest.ashx/search/?experience=statistik_sachsen&type=City&template=ET2014A.xml";

            const typeSelect = document.getElementById('type');
            const areaSelect = document.getElementById('areas');
            const categorySelect = document.getElementById('categories');
            const logicOperatorSelect = document.getElementById('logicOperator');
            const heightInput = document.getElementById('height');
            const resultTextarea = document.getElementById('result');
            const resultNoParamsTextarea = document.getElementById('resultNoParams');
            const copyButton = document.getElementById('copyButton');

            // Info-Box und Info-Button
            const infoBtn = document.getElementById('infoBtn');
            const infoBox = document.getElementById('infoBox');
            const closeInfoBox = document.getElementById('closeInfoBox');

            // Info-Button klick
            infoBtn.addEventListener('click', () => {
                infoBox.style.display = 'block';
            });

            // Schließen der Info-Box
            closeInfoBox.addEventListener('click', () => {
                infoBox.style.display = 'none';
            });

            // Event zum Schließen der Info-Box, wenn der Benutzer außerhalb klickt
            window.addEventListener('click', (event) => {
                if (event.target === infoBox) {
                    infoBox.style.display = 'none';
                }
            });

            loadAreas();
            loadCity();
            loadCategories();

            typeSelect.addEventListener('change', loadCategories);

            async function loadAreas() {
                try {
                    const response = await fetch(areaApiUrl);
                    const text = await response.text();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "application/xml");
                    const areas = xmlDoc.querySelectorAll('item title');
                    
                    areaSelect.innerHTML = '<option value="">Kein Gebiet wählen</option>';

                    areas.forEach(area => {
                        const areaName = area.textContent;
                        const option = document.createElement('option');
                        option.value = areaName;
                        option.textContent = areaName;
                        areaSelect.appendChild(option);
                    });
                } catch (error) {
                    console.error("Fehler beim Laden der Gebiete:", error);
                }
            }

            async function loadCity() {
                try {
                    const response = await fetch(cityApiUrl);  
                    const text = await response.text();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "application/xml");

                    const items = xmlDoc.querySelectorAll('item');

                    const citySelect = document.getElementById('City');
                    citySelect.innerHTML = '<option value="">Keine Stadt wählen</option>';

                    items.forEach(item => {
                        const cityName = item.querySelector('title').textContent;
                        const option = document.createElement('option');
                        option.value = cityName;
                        option.textContent = cityName;
                        citySelect.appendChild(option);
                    });
                } catch (error) {
                    console.error("Fehler beim Laden der Städte:", error);
                }
            }

            async function loadCategories() {
                const selectedType = typeSelect.value;
                categorySelect.innerHTML = '<option value="">Keine Kategorie wählen</option>';

                if (apiUrls[selectedType]) {
                    try {
                        const response = await fetch(apiUrls[selectedType]);
                        const text = await response.text();
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(text, "application/xml");
                        const categories = xmlDoc.querySelectorAll('Category');

                        categories.forEach(category => {
                            const categoryName = category.getAttribute('Name');
                            const option = document.createElement('option');
                            option.value = categoryName;
                            option.textContent = categoryName;
                            categorySelect.appendChild(option);
                        });
                    } catch (error) {
                        console.error("Fehler beim Laden der Kategorien:", error);
                    }
                }
            }

            document.getElementById('urlForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const type = typeSelect.value;
    const height = heightInput.value;
    const logicOperator = logicOperatorSelect.value;

    const selectedArea = areaSelect.value;
    const selectedCity = document.getElementById('City').value;
    const selectedCategories = Array.from(categorySelect.selectedOptions)
        .map(option => option.value)
        .filter(value => value !== "") 
        .map(value => `category:"${value}"`)
        .join(` ${logicOperator} `);

    const baseUrl = "https://pages.destination.one/de";
    let areaPart = selectedArea ? `/area:"${encodeURIComponent(selectedArea)}"` : '';
    let categoryPart = selectedCategories ? `/${encodeURIComponent(selectedCategories)}` : '';
    let cityPart = selectedCity ? `/city:"${encodeURIComponent(selectedCity)}"` : '';

    // Neue Checkbox-Logik hinzufügen
    const showMap = document.getElementById('showMap').checked;
    let mapPart = showMap ? '/view:map,half' : '';  // Hinzufügen, wenn die Checkbox aktiv ist

    let finalUrl = `${baseUrl}/open-data-sachsen-tourismus/default_withmap/search/${type}`;
    finalUrl += areaPart + categoryPart + cityPart + mapPart; // Karte wird nur hinzugefügt, wenn aktiv
    finalUrl += `?i_target=et4pages&i_height=${height}`;

    // URL mit Parametern anzeigen
    resultTextarea.value = finalUrl;

    // URL ohne Parameter anzeigen
    let finalUrlWithoutParams = finalUrl.split('?')[0];
    resultNoParamsTextarea.value = finalUrlWithoutParams;

    copyButton.classList.remove('hidden');
});


            copyButton.addEventListener('click', () => {
                resultTextarea.select();
                document.execCommand('copy');
                alert('URL wurde in die Zwischenablage kopiert!');
            });
        });