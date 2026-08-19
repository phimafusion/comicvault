/**
 * ComicVault - Formatting Utilities
 * Zentrale Formatierungsfunktionen (HTML-Escaping, Währungen, Zahlen, Sterne & Placeholder-Assets).
 */

/**
 * Maskiert HTML-Sonderzeichen zur Vermeidung von Cross-Site-Scripting (XSS).
 * 
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Formatiert eine Zahl nach deutscher Konvention (z. B. 1.234,56).
 * 
 * @param {number|string} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatNumber(val, decimals = 2) {
    if (val === undefined || val === null || val === '') return '0,00';
    const num = Number(val);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Formatiert einen Betrag als deutsche Währungsangabe (z. B. 1.234,56 €).
 * 
 * @param {number|string} amount
 * @param {string} [currencySymbol='€']
 * @returns {string}
 */
export function formatCurrency(amount, currencySymbol = '€') {
    if (amount === undefined || amount === null || amount === '') return '0,00 ' + currencySymbol;
    const num = Number(amount);
    if (isNaN(num)) return '0,00 ' + currencySymbol;
    return num.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' ' + currencySymbol;
}

/**
 * Parst einen Währungs- oder Preisstring in eine Gleitkommazahl (float).
 * 
 * @param {string|number} val
 * @returns {number|null}
 */
export function parseCurrency(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return val;
    let str = String(val);
    let clean = str.replace(/[^\d,.]/g, '');
    if (!clean) return null;
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) clean = clean.replace(/\./g, '').replace(',', '.');
    else if (lastDot > lastComma) clean = clean.replace(/,/g, '');
    else if (lastComma !== -1) clean = clean.replace(',', '.');
    return parseFloat(clean);
}

/**
 * Parst eine Sterne-Bewertung (1-10 Skala oder 1-5 Sterne).
 * 
 * @param {string|number} val
 * @returns {number} 0-10
 */
export function parseStars(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val <= 5 ? val * 2 : Math.min(val, 10);
    let str = String(val);
    const stars = (str.match(/[★⭐*]/g) || []).length;
    if (stars > 0) return stars * 2;
    
    const digitsOnly = str.replace(/[^\d.]/g, '');
    if (!digitsOnly) return 0;
    
    const num = parseFloat(digitsOnly);
    if (!isNaN(num)) return num <= 5 ? num * 2 : Math.min(num, 10);
    return 0;
}

/**
 * Rendert die HTML-Struktur für eine Sterne-Bewertung (FontAwesome Sterne).
 * 
 * @param {number} rating Bewertung von 1-10
 * @returns {string} HTML String
 */
export function renderStars(rating) {
    if (!rating) return '-';
    let starsHtml = '<div class="stars-display">';
    for (let i = 1; i <= 5; i++) {
        const val = i * 2;
        if (rating >= val) {
            starsHtml += '<i class="fa-solid fa-star"></i>';
        } else if (rating === val - 1) {
            starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            starsHtml += '<i class="fa-regular fa-star" style="opacity: 0.3;"></i>';
        }
    }
    starsHtml += '</div>';
    return starsHtml;
}

/**
 * Liefert ein SVG-Placeholder Bild im "POW!" Comic-Look als Base64 Data-URI.
 * 
 * @returns {string}
 */
export function getPlaceholderImage() {
    return `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNDAwIDYwMCI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJiZ0dyYWQiIGN4PSI1MCUiIGN5PSI1MCUiIHI9Ijc1JSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzFlMWI0YiIvPjxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjMGYwYjI5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDUwMjBhIi8+PC9yYWRpYWxHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9InJheUdyYWQiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjQzZjVlIiBzdG9wLW9wYWNpdHk9IjAuMyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzg4MTMzNyIgc3RvcC1vcGFjaXR5PSIwLjEiLz48L2xpbmVhckdyYWRpZW50PjxwYXR0ZXJuIGlkPSJoYWxmdG9uZSIgeD0iMCIgeT0iMCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMiIgZmlsbD0iI2ZhY2MxNSIgb3BhY2l0eT0iMC4xOCIvPjwvcGF0dGVybj48bGluZWFyR3JhZGllbnQgaWQ9InRleHRHcmFkIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPjxzdG9wIG9mZnNldD0iMjUlIiBzdG9wLWNvbG9yPSIjZmVmMDhhIi8+PHN0b3Agb2Zmc2V0PSI3MCUiIHN0b3AtY29sb3I9IiNmYWNjMTUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNjYThhMDQiLz48L2xpbmVhckdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iYnViYmxlR3JhZCIgY3g9IjQwJSIgY3k9IjQwJSIgcj0iNjAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSI4NSUiIHN0b3AtY29sb3I9IiNlMGYyZmUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNiYWU2ZmQiLz48L3JhZGlhbEdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2JnR3JhZCkiLz48cGF0aCBkPSJNIDIwMCAzMDAgTCA4NzYuMSA0ODEuMiBMIDgwNi4yIDY1MC4wIFogTSAyMDAgMzAwIEwgNjk1LjAgNzk1LjAgTCA1NTAuMCA5MDYuMiBaIE0gMjAwIDMwMCBMIDM4MS4yIDk3Ni4xIEwgMjAwLjAgMTAwMC4wIFogTSAyMDAgMzAwIEwgMTguOCA5NzYuMSBMIC0xNTAuMCA5MDYuMiBaIE0gMjAwIDMwMCBMIC0yOTUuMCA3OTUuMCBMIC00MDYuMiA2NTAuMCBaIE0gMjAwIDMwMCBMIC00NzYuMSA0ODEuMiBMIC01MDAuMCAzMDAuMCBaIE0gMjAwIDMwMCBMIC00NzYuMSAxMTguOCBMIC00MDYuMiAtNTAuMCBaIE0gMjAwIDMwMCBMIC0yOTUuMCAtMTk1LjAgTCAtMTUwLjAgLTMwNi4yIFogTSAyMDAgMzAwIEwgMTguOCAtMzc2LjEgTCAyMDAuMCAtNDAwLjAgWiBNIDIwMCAzMDAgTCAzODEuMiAtMzc2LjEgTCA1NTAuMCAtMzA2LjIgWiBNIDIwMCAzMDAgTCA2OTUuMCAtMTk1LjAgTCA4MDYuMiAtNTAuMCBaIE0gMjAwIDMwMCBMIDg3Ni4xIDExOC44IEwgOTAwLjAgMzAwLjAgWiIgZmlsbD0idXJsKCNyYXlHcmFkKSIvPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjaGFsZnRvbmUpIi8+PGNpcmNsZSBjeD0iNjAiIGN5PSIxMjAiIHI9IjI0IiBmaWxsPSIjMGVhNWU5IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNC41IiBmaWx0ZXI9InVybCgjc2hhZG93KSIvPjxjaXJjbGUgY3g9IjM0MCIgY3k9IjE2MCIgcj0iMTgiIGZpbGw9IiNkOTQ2ZWYiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI0IiBmaWx0ZXI9InVybCgjc2hhZG93KSIvPjxjaXJjbGUgY3g9IjMzMCIgY3k9IjQ4MCIgcj0iMjgiIGZpbGw9IiMxMGI5ODEiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI1IiBmaWx0ZXI9InVybCgjc2hhZG93KSIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iNDYwIiByPSIyMCIgZmlsbD0iI2Y5NzMxNiIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjQiIGZpbHRlcj0idXJsKCNzaGFkb3cpIi8+PHBhdGggZD0iTSA5MCwyMDAgTCA5NSwyMTUgTCAxMTAsMjE1IEwgOTgsMjI1IEwgMTAyLDI0MCBMIDkwLDIzMCBMIDc4LDI0MCBMIDgyLDIyNSBMIDcwLDIxNSBMIDg1LDIxNSBaIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMyIvPjxwYXRoIGQ9Ik0gMzAwLDM4MCBMIDMwNCwzOTIgTCAzMTYsMzkyIEwgMzA2LDQwMCBMIDMxMCw0MTIgTCAzMDAsNDA0IEwgMjkwLDQxMiBMIDI5NCw0MDAgTCAyODQsMzkyIEwgMjk2LDM5MiBaIiBmaWxsPSIjZmFjYzE1IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMyIvPjxwYXRoIGQ9Ik0gMjAwLjAsOTAuMCBMIDIyNy4zLDE2Mi43IEwgMjgwLjQsMTA2LjAgTCAyNzcuOCwxODMuNiBMIDM0OC41LDE1MS41IEwgMzE2LjQsMjIyLjIgTCAzOTQuMCwyMTkuNiBMIDMzNy4zLDI3Mi43IEwgNDEwLjAsMzAwLjAgTCAzMzcuMywzMjcuMyBMIDM5NC4wLDM4MC40IEwgMzE2LjQsMzc3LjggTCAzNDguNSw0NDguNSBMIDI3Ny44LDQxNi40IEwgMjgwLjQsNDk0LjAgTCAyMjcuMyw0MzcuMyBMIDIwMC4wLDUxMC4wIEwgMTcyLjcsNDM3LjMgTCAxMTkuNiw0OTQuMCBMIDEyMi4yLDQxNi40IEwgNTEuNSw0NDguNSBMIDgzLjYsMzc3LjggTCA2LjAsMzgwLjQgTCA2Mi43LDMyNy4zIEwgLTEwLjAsMzAwLjAgTCA2Mi43LDI3Mi43IEwgNi4wLDIxOS42IEwgODMuNiwyMjIuMiBMIDUxLjUsMTUxLjUgTCAxMjIuMiwxODMuNiBMIDExOS42LDEwNi4wIEwgMTcyLjcsMTYyLjcgWiIgZmlsbD0iIzAwMDAwMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNiwgOCkiLz48cGF0aCBkPSJNIDIwMC4wLDkwLjAgTCAyMjcuMywxNjIuNyBMIDI4MC40LDEwNi4wIEwgMjc3LjgsMTgzLjYgTCAzNDguNSwxNTEuNSBMIDMxNi40LDIyMi4yIEwgMzk0LjAsMjE5LjYgTCAzMzcuMywyNzIuNyBMIDQxMC4wLDMwMC4wIEwgMzM3LjMsMzI3LjMgTCAzOTQuMCwzODAuNCBMIDMxNi40LDM3Ny44IEwgMzQ4LjUsNDQ4LjUgTCAyNzcuOCw0MTYuNCBMIDI4MC40LDQ5NC4wIEwgMjI3LjMsNDM3LjMgTCAyMDAuMCw1MTAuMCBMIDE3Mi43LDQzNy4zIEwgMTE5LjYsNDk0LjAgTCAxMjIuMiw0MTYuNCBMIDUxLjUsNDQ4LjUgTCA4My42LDM3Ny44IEwgNi4wLDM4MC40IEwgNjIuNywzMjcuMyBMIC0xMC4wLDMwMC4wIEwgNjIuNywyNzIuNyBMIDYuMCwyMTkuNiBMIDgzLjYsMjIyLjIgTCA1MS41LDE1MS41IEwgMTIyLjIsMTgzLjYgTCAxMTkuNiwxMDYuMCBMIDE3Mi43LDE2Mi43IFoiIGZpbGw9IiNkYzI2MjYiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTSAyMDAuMCwxMzUuMCBMIDIyNC41LDE5Mi44IEwgMjcxLjYsMTUxLjMgTCAyNjguNiwyMTQuMCBMIDMyOS4wLDE5Ny4xIEwgMjk5LjEsMjUyLjMgTCAzNjAuOSwyNjMuMyBMIDMxMC4wLDMwMC4wIEwgMzYwLjksMzM2LjcgTCAyOTkuMSwzNDcuNyBMIDMyOS4wLDQwMi45IEwgMjY4LjYsMzg2LjAgTCAyNzEuNiw0NDguNyBMIDIyNC41LDQwNy4yIEwgMjAwLjAsNDY1LjAgTCAxNzUuNSw0MDcuMiBMIDEyOC40LDQ0OC43IEwgMTMxLjQsMzg2LjAgTCA3MS4wLDQwMi45IEwgMTAwLjksMzQ3LjcgTCAzOS4xLDMzNi43IEwgOTAuMCwzMDAuMCBMIDM5LjEsMjYzLjMgTCAxMDAuOSwyNTIuMyBMIDcxLjAsMTk3LjEgTCAxMzEuNCwyMTQuMCBMIDEyOC40LDE1MS4zIEwgMTc1LjUsMTkyLjggWiIgZmlsbD0iI2ZhY2MxNSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNIDIzMCwyNjAgQyAyNTUsMjQ1IDI4NSwyNjAgMjg1LDI4MCBDIDMwMCwyODAgMzEwLDMwMCAzMDAsMzE1IEMgMzEwLDMzNSAyOTAsMzU1IDI3MCwzNDUgQyAyNjAsMzYwIDIzMCwzNjAgMjIwLDM0NSBDIDIwMCwzNTUgMTgwLDM0MCAxODUsMzIwIEMgMTcwLDMyMCAxNjUsMjk1IDE4MCwyODAgQyAxODAsMjYwIDIxMCwyNDUgMjMwLDI2MCBaIiBmaWxsPSJ1cmwoI2J1YmJsZUdyYWQpIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsdGVyPSJ1cmwoI3NoYWRvdykiLz48cGF0aCBkPSJNIDIwMC4wLDE3NS4wIEwgMjIwLjcsMjIyLjcgTCAyNjIuNSwxOTEuNyBMIDI1Ni42LDI0My40IEwgMzA4LjMsMjM3LjUgTCAyNzcuMywyNzkuMyBMIDMyNS4wLDMwMC4wIEwgMjc3LjMsMzIwLjcgTCAzMDguMywzNjIuNSBMIDI1Ni42LDM1Ni42IEwgMjYyLjUsNDA4LjMgTCAyMjAuNywzNzcuMyBMIDIwMC4wLDQyNS4wIEwgMTc5LjMsMzc3LjMgTCAxMzcuNSw0MDguMyBMIDE0My40LDM1Ni42IEwgOTEuNywzNjIuNSBMIDEyMi43LDMyMC43IEwgNzUuMCwzMDAuMCBMIDEyMi43LDI3OS4zIEwgOTEuNywyMzcuNSBMIDE0My40LDI0My40IEwgMTM3LjUsMTkxLjcgTCAxNzkuMywyMjIuNyBaIiBmaWxsPSIjZWM0ODk5IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTk1LCAzMTApIHJvdGF0ZSgtOCkiPjx0ZXh0IHg9IjAiIHk9IjAiIGZvbnQtZmFtaWx5PSInSW1wYWN0JywgJ0FyaWFsIEJsYWNrJywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4MiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iIzAwMDAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOCwgMTApIj5QT1chPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjAiIGZvbnQtZmFtaWx5PSInSW1wYWN0JywgJ0FyaWFsIEJsYWNrJywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4MiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iIzAwMDAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNiwgOCkiPlBPVyE8L3RleHQ+PHRleHQgeD0iMCIgeT0iMCIgZm9udC1mYW1pbHk9IidJbXBhY3QnLCAnQXJpYWwgQmxhY2snLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjgyIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjMDAwMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0LCA2KSI+UE9XITwvdGV4dD48dGV4dCB4PSIwIiB5PSIwIiBmb250LWZhbWlseT0iJ0ltcGFjdCcsICdBcmlhbCBCbGFjaycsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iODIiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiMwMDAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIsIDMpIj5QT1chPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjAiIGZvbnQtZmFtaWx5PSInSW1wYWN0JywgJ0FyaWFsIEJsYWNrJywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4MiIgZm9udC13ZWlnaHQ9IjkwMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjE0IiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QT1chPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjAiIGZvbnQtZmFtaWx5PSInSW1wYWN0JywgJ0FyaWFsIEJsYWNrJywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4MiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0idXJsKCN0ZXh0R3JhZCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBPVyE8L3RleHQ+PHRleHQgeD0iMCIgeT0iMCIgZm9udC1mYW1pbHk9IidJbXBhY3QnLCAnQXJpYWwgQmxhY2snLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjgyIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBvcGFjaXR5PSIwLjg1Ii8+PC9nPjwvc3ZnPg==`;
}
