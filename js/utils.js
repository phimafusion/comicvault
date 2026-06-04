// ComicVault Utilities

export function displayDate(dateStr, shorten = false) {
    if (!dateStr) return '-';
    
    // YYYY-MM-DD (Fallback für alte Einträge)
    const matchIso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchIso) {
        const y = shorten ? matchIso[1].slice(-2) : matchIso[1];
        return `${matchIso[3]}.${matchIso[2]}.${y}`;
    }
    
    // DD.MM.YYYY (Aktuelles Standard-Format)
    const matchGer = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (matchGer) {
        const y = shorten ? matchGer[3].slice(-2) : matchGer[3];
        return `${matchGer[1]}.${matchGer[2]}.${y}`;
    }
    
    // Langes Format (z.B. Zeitstempel)
    if (String(dateStr).length > 15) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear());
            const y = shorten ? year.slice(-2) : year;
            return `${day}.${month}.${y}`;
        }
    }
    
    return dateStr;
}

export function toInputDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        let [d, m, y] = parts;
        if (d.length === 1) d = '0' + d;
        if (m.length === 1) m = '0' + m;
        if (y.length === 2) {
            const yr = parseInt(y, 10);
            y = (yr > 50 ? '19' : '20') + y;
        }
        return `${y}-${m}-${d}`;
    }
    return dateStr;
}

export function toGermanDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = dateStr.split('-');
        return `${d}.${m}.${y}`;
    }
    return dateStr;
}

export function parseDate(val) {
    if (val === undefined || val === null || val === "") return '';

    let dateObj = null;

    // 1. Falls es bereits ein Date-Objekt ist
    if (val instanceof Date) {
        dateObj = val;
    }
    // 2. Falls es ein langer String ist (z.B. Zeitstempel)
    else if (typeof val === 'string' && val.length > 15) {
        const d = new Date(val);
        if (!isNaN(d)) dateObj = d;
    }

    if (dateObj) {
        // Zeitverschiebung ausgleichen für lokales Datum
        const d = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
        const iso = d.toISOString().split('T')[0];
        const [y, m, day] = iso.split('-');
        return `${day}.${m}.${y}`;
    }

    let str = String(val).toLowerCase().trim();
    if (str === 'x' || str === 'nein') return '';

    // Flexibles Format: DD.MM.YYYY, DD.MM.YY, DD/MM/YY, DD-MM-YYYY, YYYY-MM-DD etc.
    const dateMatch = str.match(/(\d{1,4})[\.\-\/\s]+(\d{1,2})[\.\-\/\s]+(\d{1,4})/);
    if (dateMatch) {
        let [_, p1, p2, p3] = dateMatch;
        
        let y, m, d;
        // Wenn der erste Teil 4 Ziffern hat, gehen wir von YYYY-MM-DD aus
        if (p1.length === 4) {
            y = p1; m = p2; d = p3;
        } else {
            // Ansonsten DD-MM-YYYY oder DD-MM-YY
            d = p1; m = p2; y = p3;
            if (y.length === 2) {
                const yearNum = parseInt(y, 10);
                y = (yearNum >= 50 ? '19' : '20') + y;
            } else if (y.length === 1) {
                y = '200' + y;
            }
        }
        
        return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    }

    return str;
}

export function parseCurrency(val) {
    if (val === undefined || val === null || val === "") return null;
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

export function parseStars(val) {
    if (val === undefined || val === null || val === "") return 0;
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

export function getPlaceholderImage() {
    // Ein cooles, lokales SVG als Base64 Data-URI: Dunkelgrauer Hintergrund mit einem coolen "POW!"-Design.
    // Base64 wird verwendet, da Firefox rohe SVG Data-URIs mit "<" und ">" sonst als ungültig einstuft und blockiert.
    return `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNDAwIDYwMCI+PGRlZnM+PCEtLSBCYWNrZ3JvdW5kIEdyYWRpZW50IChEZWVwIEluZGlnbyB0byBCbGFjaykgLS0+PHJhZGlhbEdyYWRpZW50IGlkPSJiZ0dyYWQiIGN4PSI1MCUiIGN5PSI1MCUiIHI9Ijc1JSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzFlMWI0YiIvPjxzdG9wIG9mZnNldD0iNjAlIiBzdG9wLWNvbG9yPSIjMGYwYjI5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDUwMjBhIi8+PC9yYWRpYWxHcmFkaWVudD48IS0tIFN1bmJ1cnN0IFJheSBHcmFkaWVudCAtLT48bGluZWFyR3JhZGllbnQgaWQ9InJheUdyYWQiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZjQzZjVlIiBzdG9wLW9wYWNpdHk9IjAuMyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzg4MTMzNyIgc3RvcC1vcGFjaXR5PSIwLjEiLz48L2xpbmVhckdyYWRpZW50PjwhLS0gSGFsZnRvbmUgRG90IFBhdHRlcm4gKFZpYnJhbnQgWWVsbG93IERvdHMpIC0tPjxwYXR0ZXJuIGlkPSJoYWxmdG9uZSIgeD0iMCIgeT0iMCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSI2IiBjeT0iNiIgcj0iMiIgZmlsbD0iI2ZhY2MxNSIgb3BhY2l0eT0iMC4xOCIvPjwvcGF0dGVybj48IS0tIDNEIFNoYWRvdyBGaWx0ZXIgLS0+PGZpbHRlciBpZD0ic2hhZG93IiB4PSItMTAlIiB5PSItMTAlIiB3aWR0aD0iMTIwJSIgaGVpZ2h0PSIxMjAlIj48ZmVEcm9wU2hhZG93IGR4PSI2IiBkeT0iOCIgc3RkRGV2aWF0aW9uPSIwIiBmbG9vZC1jb2xvcj0iIzAwMDAwMCIgZmxvb2Qtb3BhY2l0eT0iMSIvPjwvZmlsdGVyPjwhLS0gQ29taWMgVGV4dCBHcmFkaWVudCAtLT48bGluZWFyR3JhZGllbnQgaWQ9InRleHRHcmFkIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmZmZmZiIvPjxzdG9wIG9mZnNldD0iMjUlIiBzdG9wLWNvbG9yPSIjZmVmMDhhIi8+PHN0b3Agb2Zmc2V0PSI3MCUiIHN0b3AtY29sb3I9IiNmYWNjMTUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNjYThhMDQiLz48L2xpbmVhckdyYWRpZW50PjwhLS0gQ2xvdWQgQnViYmxlIEdyYWRpZW50IC0tPjxyYWRpYWxHcmFkaWVudCBpZD0iYnViYmxlR3JhZCIgY3g9IjQwJSIgY3k9IjQwJSIgcj0iNjAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSI4NSUiIHN0b3AtY29sb3I9IiNlMGYyZmUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNiYWU2ZmQiLz48L3JhZGlhbEdyYWRpZW50PjwvZGVmcz48IS0tIEJhY2tncm91bmQgLS0+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNiZ0dyYWQpIi8+PCEtLSBTdW5idXJzdCBSYXlzIC0tPjxwYXRoIGQ9Ik0gMjAwIDMwMCBMIDg3Ni4xIDQ4MS4yIEwgODA2LjIgNjUwLjAgWiBNIDIwMCAzMDAgTCA2OTUuMCA3OTUuMCBMIDU1MC4wIDkwNi4yIFogTSAyMDAgMzAwIEwgMzgxLjIgOTc2LjEgTCAyMDAuMCAxMDAwLjAgWiBNIDIwMCAzMDAgTCAxOC44IDk3Ni4xIEwgLTE1MC4wIDkwNi4yIFogTSAyMDAgMzAwIEwgLTI5NS4wIDc5NS4wIEwgLTQwNi4yIDY1MC4wIFogTSAyMDAgMzAwIEwgLTQ3Ni4xIDQ4MS4yIEwgLTUwMC4wIDMwMC4wIFogTSAyMDAgMzAwIEwgLTQ3Ni4xIDExOC44IEwgLTQwNi4yIC01MC4wIFogTSAyMDAgMzAwIEwgLTI5NS4wIC0xOTUuMCBMIC0xNTAuMCAtMzA2LjIgWiBNIDIwMCAzMDAgTCAxOC44IC0zNzYuMSBMIDIwMC4wIC00MDAuMCBaIE0gMjAwIDMwMCBMIDM4MS4yIC0zNzYuMSBMIDU1MC4wIC0zMDYuMiBaIE0gMjAwIDMwMCBMIDY5NS4wIC0xOTUuMCBMIDgwNi4yIC01MC4wIFogTSAyMDAgMzAwIEwgODc2LjEgMTE4LjggTCA5MDAuMCAzMDAuMCBaIiBmaWxsPSJ1cmwoI3JheUdyYWQpIi8+PCEtLSBIYWxmdG9uZSBPdmVybGF5IC0tPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjaGFsZnRvbmUpIi8+PCEtLSBQb3AgQXJ0IEJhY2tncm91bmQgQ2lyY2xlcyAtLT48Y2lyY2xlIGN4PSI2MCIgY3k9IjEyMCIgcj0iMjQiIGZpbGw9IiMwZWE1ZTkiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI0LjUiIGZpbHRlcj0idXJsKCNzaGFkb3cpIi8+PGNpcmNsZSBjeD0iMzQwIiBjeT0iMTYwIiByPSIxOCIgZmlsbD0iI2Q5NDZlZiIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjQiIGZpbHRlcj0idXJsKCNzaGFkb3cpIi8+PGNpcmNsZSBjeD0iMzMwIiBjeT0iNDgwIiByPSIyOCIgZmlsbD0iIzEwYjk4MSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjUiIGZpbHRlcj0idXJsKCNzaGFkb3cpIi8+PGNpcmNsZSBjeD0iODAiIGN5PSI0NjAiIHI9IjIwIiBmaWxsPSIjZjk3MzE2IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNCIgZmlsdGVyPSJ1cmwoI3NoYWRvdykiLz48IS0tIEFjdGlvbiBTcGFya2xlcyAvIFN0YXJzIC0tPjwhLS0gVG9wIExlZnQgU3RhciAtLT48cGF0aCBkPSJNIDkwLDIwMCBMIDk1LDIxNSBMIDExMCwyMTUgTCA5OCwyMjUgTCAxMDIsMjQwIEwgOTAsMjMwIEwgNzgsMjQwIEwgODIsMjI1IEwgNzAsMjE1IEwgODUsMjE1IFoiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIzIi8+PCEtLSBCb3R0b20gUmlnaHQgU3RhciAtLT48cGF0aCBkPSJNIDMwMCwzODAgTCAzMDQsMzkyIEwgMzE2LDM5MiBMIDMwNiw0MDAgTCAzMTAsNDEyIEwgMzAwLDQwNCBMIDI5MCw0MTIgTCAyOTQsNDAwIEwgMjg0LDM5MiBMIDI5NiwzOTIgWiIgZmlsbD0iI2ZhY2MxNSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjMiLz48IS0tIDEuIE91dGVyIFN0YXJidXJzdCAoU2hhZG93KSAtLT48cGF0aCBkPSJNIDIwMC4wLDkwLjAgTCAyMjcuMywxNjIuNyBMIDI4MC40LDEwNi4wIEwgMjc3LjgsMTgzLjYgTCAzNDguNSwxNTEuNSBMIDMxNi40LDIyMi4yIEwgMzk0LjAsMjE5LjYgTCAzMzcuMywyNzIuNyBMIDQxMC4wLDMwMC4wIEwgMzM3LjMsMzI3LjMgTCAzOTQuMCwzODAuNCBMIDMxNi40LDM3Ny44IEwgMzQ4LjUsNDQ4LjUgTCAyNzcuOCw0MTYuNCBMIDI4MC40LDQ5NC4wIEwgMjI3LjMsNDM3LjMgTCAyMDAuMCw1MTAuMCBMIDE3Mi43LDQzNy4zIEwgMTE5LjYsNDk0LjAgTCAxMjIuMiw0MTYuNCBMIDUxLjUsNDQ4LjUgTCA4My42LDM3Ny44IEwgNi4wLDM4MC40IEwgNjIuNywzMjcuMyBMIC0xMC4wLDMwMC4wIEwgNjIuNywyNzIuNyBMIDYuMCwyMTkuNiBMIDgzLjYsMjIyLjIgTCA1MS41LDE1MS41IEwgMTIyLjIsMTgzLjYgTCAxMTkuNiwxMDYuMCBMIDE3Mi43LDE2Mi43IFoiIGZpbGw9IiMwMDAwMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDYsIDgpIi8+PCEtLSBPdXRlciBTdGFyYnVyc3QgKFNvbGlkIERhcmsgT3JhbmdlLVJlZCkgLS0+PHBhdGggZD0iTSAyMDAuMCw5MC4wIEwgMjI3LjMsMTYyLjcgTCAyODAuNCwxMDYuMCBMIDI3Ny44LDE4My42IEwgMzQ4LjUsMTUxLjUgTCAzMTYuNCwyMjIuMiBMIDM5NC4wLDIxOS42IEwgMzM3LjMsMjcyLjcgTCA0MTAuMCwzMDAuMCBMIDMzNy4zLDMyNy4zIEwgMzk0LjAsMzgwLjQgTCAzMTYuNCwzNzcuOCBMIDM0OC41LDQ0OC41IEwgMjc3LjgsNDE2LjQgTCAyODAuNCw0OTQuMCBMIDIyNy4zLDQzNy4zIEwgMjAwLjAsNTEwLjAgTCAxNzIuNyw0MzcuMyBMIDExOS42LDQ5NC4wIEwgMTIyLjIsNDE2LjQgTCA1MS41LDQ0OC41IEwgODMuNiwzNzcuOCBMIDYuMCwzODAuNCBMIDYyLjcsMzI3LjMgTCAtMTAuMCwzMDAuMCBMIDYyLjcsMjcyLjcgTCA2LjAsMjE5LjYgTCA4My42LDIyMi4yIEwgNTEuNSwxNTEuNSBMIDEyMi4yLDE4My42IEwgMTE5LjYsMTA2LjAgTCAxNzIuNywxNjIuNyBaIiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwhLS0gMi4gTWlkZGxlIFN0YXJidXJzdCAoVmlicmFudCBZZWxsb3cpIC0tPjxwYXRoIGQ9Ik0gMjAwLjAsMTM1LjAgTCAyMjQuNSwxOTIuOCBMIDI3MS42LDE1MS4zIEwgMjY4LjYsMjE0LjAgTCAzMjkuMCwxOTcuMSBMIDI5OS4xLDI1Mi4zIEwgMzYwLjksMjYzLjMgTCAzMTAuMCwzMDAuMCBMIDM2MC45LDMzNi43IEwgMjk5LjEsMzQ3LjcgTCAzMjkuMCw0MDIuOSBMIDI2OC42LDM4Ni4wIEwgMjcxLjYsNDQ4LjcgTCAyMjQuNSw0MDcuMiBMIDIwMC4wLDQ2NS4wIEwgMTc1LjUsNDA3LjIgTCAxMjguNCw0NDguNyBMIDEzMS40LDM4Ni4wIEwgNzEuMCw0MDIuOSBMIDEwMC45LDM0Ny43IEwgMzkuMSwzMzYuNyBMIDkwLjAsMzAwLjAgTCAzOS4xLDI2My4zIEwgMTAwLjksMjUyLjMgTCA3MS4wLDE5Ny4xIEwgMTMxLjQsMjE0LjAgTCAxMjguNCwxNTEuMyBMIDE3NS41LDE5Mi44IFoiIGZpbGw9IiNmYWNjMTUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PCEtLSAzLiBDbG91ZC9TcGVlY2ggQnViYmxlIGluc2lkZSBleHBsb3Npb24gdG8gYWRkIGNvbWljIGF0bW9zcGhlcmUgLS0+PHBhdGggZD0iTSAyMzAsMjYwQyAyNTUsMjQ1IDI4NSwyNjAgMjg1LDI4MEMgMzAwLDI4MCAzMTAsMzAwIDMwMCwzMTVDIDMxMCwzMzUgMjkwLDM1NSAyNzAsMzQ1QyAyNjAsMzYwIDIzMCwzNjAgMjIwLDM0NUMgMjAwLDM1NSAxODAsMzQwIDE4NSwzMjBDIDE3MCwzMjAgMTY1LDI5NSAxODAsMjgwQyAxODAsMjYwIDIxMCwyNDUgMjMwLDI2MCBaImZpbGw9InVybCgjYnViYmxlR3JhZCkiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWpvaW49InJvdW5kImZpbHRlcj0idXJsKCNzaGFkb3cpIi8+PCEtLSA0LiBJbm5lciBTdGFyYnVyc3QgKEFjY2VudCBIb3QgUGluayAvIFJlZCBCdXJzdCkgLS0+PHBhdGggZD0iTSAyMDAuMCwxNzUuMCBMIDIyMC43LDIyMi43IEwgMjYyLjUsMTkxLjcgTCAyNTYuNiwyNDMuNCBMIDMwOC4zLDIzNy41IEwgMjc3LjMsMjc5LjMgTCAzMjUuMCwzMDAuMCBMIDI3Ny4zLDMyMC43IEwgMzA4LjMsMzYyLjUgTCAyNTYuNiwzNTYuNiBMIDI2Mi41LDQwOC4zIEwgMjIwLjcsMzc3LjMgTCAyMDAuMCw0MjUuMCBMIDE3OS4zLDM3Ny4zIEwgMTM3LjUsNDA4LjMgTCAxNDMuNCwzNTYuNiBMIDkxLjcsMzYyLjUgTCAxMjIuNywzMjAuNyBMIDc1LjAsMzAwLjAgTCAxMjIuNywyNzkuMyBMIDkxLjcsMjM3LjUgTCAxNDMuNCwyNDMuNCBMIDEzNy41LDE5MS43IEwgMTc5LjMsMjIyLjcgWiIgZmlsbD0iI2VjNDg5OSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjQuNSIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwhLS0gQ29taWMgVGV4dCBHcm91cCB3aXRoIHRpbHQgYW5kIHNjYWxlIC0tPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE5NSwgMzEwKSByb3RhdGUoLTgpIj48IS0tIDNEIFNoYWRvdyBMYXllcnMgKHN0YWNrZWQgZm9yIHNtb290aCBvZmZzZXQgc2hhZG93KSAtLT48dGV4dCB4PSIwIiB5PSIwIiBmb250LWZhbWlseT0iJ0ltcGFjdCcsICdBcmlhbCBCbGFjaycsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iODIiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiMwMDAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDgsIDEwKSI+UE9XITwvdGV4dD48dGV4dCB4PSIwIiB5PSIwIiBmb250LWZhbWlseT0iJ0ltcGFjdCcsICdBcmlhbCBCbGFjaycsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iODIiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiMwMDAwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDYsIDgpIj5QT1chPC90ZXh0Pjx0ZXh0IHg9IjAiIHk9IjAiIGZvbnQtZmFtaWx5PSInSW1wYWN0JywgJ0FyaWFsIEJsYWNrJywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4MiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iIzAwMDAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCwgNikiPlBPVyE8L3RleHQ+PHRleHQgeD0iMCIgeT0iMCIgZm9udC1mYW1pbHk9IidJbXBhY3QnLCAnQXJpYWwgQmxhY2snLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjgyIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjMDAwMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyLCAzKSI+UE9XITwvdGV4dD48IS0tIFRoaWNrIE91dGVyIEJsYWNrIFN0cm9rZSAtLT48dGV4dCB4PSIwIiB5PSIwIiBmb250LWZhbWlseT0iJ0ltcGFjdCcsICdBcmlhbCBCbGFjaycsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iODIiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9IiMwMDAwMDAiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxNCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UE9XITwvdGV4dD48IS0tIE1haW4gR3JhZGllbnQgVGV4dCAtLT48dGV4dCB4PSIwIiB5PSIwIiBmb250LWZhbWlseT0iJ0ltcGFjdCcsICdBcmlhbCBCbGFjaycsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iODIiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9InVybCgjdGV4dEdyYWQpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QT1chPC90ZXh0PjwhLS0gQWNjZW50IEhpZ2hsaWdodCBTdHJva2UgLS0+PHRleHQgeD0iMCIgeT0iMCIgZm9udC1mYW1pbHk9IidJbXBhY3QnLCAnQXJpYWwgQmxhY2snLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjgyIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBvcGFjaXR5PSIwLjg1Ii8+PC9nPjwvc3ZnPg==`;
}

// Comparison Helpers
export function getChangedFields(oldData, newData) {
    const fields = [
        'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 
        'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 
        'limitiert_auf', 'variant', 'variantname', 'bemerkung', 
        'kaufdatum', 'bestand', 'gelesen_am', 'bewertung'
    ];
    const diffs = [];
    fields.forEach(f => {
        let v1 = oldData[f];
        let v2 = newData[f];

        // Normalize
        if (v1 === null || v1 === undefined) v1 = '';
        if (v2 === null || v2 === undefined) v2 = '';
        
        // Special case for numbers
        if (typeof v1 === 'number' || typeof v2 === 'number') {
            if (Number(v1) !== Number(v2)) diffs.push(f);
            return;
        }

        if (String(v1).trim() !== String(v2).trim()) {
            diffs.push(f);
        }
    });
    return diffs;
}

export function getWishlistChangedFields(oldData, newData) {
    const fields = [
        'titel', 'typ', 'format', 'preis', 'jahr', 'bemerkung',
        'isbn', 'vorbestellt', 'besonderheit'
    ];
    const diffs = [];
    fields.forEach(f => {
        let v1 = oldData[f];
        let v2 = newData[f];

        // Normalize
        if (v1 === null || v1 === undefined) v1 = '';
        if (v2 === null || v2 === undefined) v2 = '';
        
        // Special case for numbers
        if (typeof v1 === 'number' || typeof v2 === 'number') {
            if (Number(v1) !== Number(v2)) diffs.push(f);
            return;
        }

        // Special case for booleans
        if (typeof v1 === 'boolean' || typeof v2 === 'boolean') {
            if (Boolean(v1) !== Boolean(v2)) diffs.push(f);
            return;
        }

        if (String(v1).trim() !== String(v2).trim()) {
            diffs.push(f);
        }
    });
    return diffs;
}
