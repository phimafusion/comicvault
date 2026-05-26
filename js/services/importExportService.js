import { db } from '../db.js';
import { parseCurrency, parseStars, parseDate } from '../utils.js';

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

// Fingerprint Helper
export const getExactSignature = (c) => {
    return [
        c.serie, c.nummer, c.titel, c.verlag, c.format, c.sprache, 
        c.zustand, c.limitierung, c.variantname, c.preis, c.kaufdatum, c.bemerkung, c.bestand
    ].map(v => String(v || '').toLowerCase().trim()).join('|');
};

export const getCoreSignature = (c) => {
    return [
        c.serie, c.nummer, c.titel, c.verlag, c.format, c.sprache
    ].map(v => String(v || '').toLowerCase().trim()).join('|');
};

export const getWishlistExactSignature = (w) => {
    return [
        w.titel, w.typ, w.format, w.preis, w.jahr, w.isbn, w.besonderheit, w.bemerkung
    ].map(v => String(v || '').toLowerCase().trim()).join('|');
};

export const getWishlistCoreSignature = (w) => {
    return [
        w.titel, w.isbn
    ].map(v => String(v || '').toLowerCase().trim()).join('|');
};

// CSV parsing
export function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

    return lines.slice(1).map(line => {
        let values = [];
        let insideQuote = false;
        let current = '';
        for (let char of line) {
            if (char === '"') insideQuote = !insideQuote;
            else if (char === delimiter && !insideQuote) {
                values.push(current);
                current = '';
            } else current += char;
        }
        values.push(current);
        const row = {};
        headers.forEach((h, i) => row[h] = (values[i] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        return row;
    });
}

// Mapping row to comic structure
export function mapRowToComic(row) {
    const rowKeys = Object.keys(row);

    const getVal = (targetKeys) => {
        for (const tk of targetKeys) {
            if (row[tk] !== undefined && row[tk] !== null && row[tk] !== "") return row[tk];
        }

        const normalize = (s) => String(s).toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
        const normalizedTargets = targetKeys.map(normalize);

        for (const rk of rowKeys) {
            const normRk = normalize(rk);
            if (normalizedTargets.includes(normRk)) {
                if (row[rk] !== undefined && row[rk] !== null && row[rk] !== "") return row[rk];
            }
        }
        return null;
    };

    let limitierung = false;
    let limitiert_auf = null;
    const limRaw = String(getVal(['Limitierung', 'Limitiert', 'limitierung']) || '').toLowerCase();
    if (limRaw && !['nein', 'keine', 'false', '0'].includes(limRaw)) {
        limitierung = true;
        const numMatch = limRaw.match(/\d+/);
        if (numMatch) limitiert_auf = parseInt(numMatch[0]);
    }
    if (limitiert_auf === null) {
        const limAufRaw = getVal(['limitiert_auf', 'limitiert auf', 'Limitiert auf']);
        if (limAufRaw !== null && limAufRaw !== undefined && limAufRaw !== "") {
            limitiert_auf = parseInt(String(limAufRaw).replace(/[^\d]/g, ''));
        }
    }

    let variant = false;
    const varRaw = String(getVal(['Variant', 'Variante', 'Variant-Cover', 'variant']) || '').toLowerCase();
    if (['ja', 'true', 'yes', 'j', '1'].includes(varRaw)) variant = true;

    const bemerkungRaw = String(getVal(['Bemerkung', 'Notiz', 'Info']) || '');
    let bemerkung = bemerkungRaw;

    let gelesenAm = parseDate(getVal(['Gelesen', 'Gelesen am', 'gelesen_am']));
    const gelesenRaw = String(getVal(['Gelesen', 'Gelesen am', 'gelesen_am']) || '').toLowerCase().trim();

    if (gelesenRaw === 'x') {
        gelesenAm = '2023-01-01';
        bemerkung = (bemerkung ? bemerkung + ' ' : '') + '*** Gelesen am Platzhalter, da nicht genau terminierbar [autogenerated] ***';
    }

    let variantname = String(getVal(['Variantename', 'Variantname', 'variantname']) || '');
    if (variant && !variantname && bemerkungRaw.toLowerCase().includes('variant')) {
        variantname = bemerkungRaw;
    }

    let preis = parseCurrency(getVal(['Preis (inkl. Vsk)', 'Preis', 'Kaufpreis', 'preis']));

    let titel = String(getVal(['Titel', 'Comic Titel', 'Name']) || 'Unbekannt');
    const nummer = getVal(['Numm', 'Nummer', 'Nr', 'No']) !== null ? parseInt(String(getVal(['Numm', 'Nummer', 'Nr', 'No'])).replace(/[^\d]/g, '')) : null;

    if (nummer !== null && titel) {
        const regex = new RegExp(`\\s+0*${nummer}$`);
        if (regex.test(titel)) {
            titel = titel.replace(regex, '').trim();
        }
    }

    return {
        id: getVal(['id', 'ID']) ? String(getVal(['id', 'ID'])) : null,
        titel: titel,
        typ: String(getVal(['Typ', 'Genre']) || ''),
        serie: String(getVal(['Serie', 'Reihe']) || ''),
        nummer: nummer,
        verlag: String(getVal(['Verlag', 'Publisher']) || ''),
        format: String(getVal(['Format', 'Einband']) || ''),
        jahr: getVal(['Jahr (Serie/Release)', 'Jahr (Serie/I)', 'Jahr', 'Erscheinungsjahr']) !== null ? parseInt(String(getVal(['Jahr (Serie/Release)', 'Jahr (Serie/I)', 'Jahr', 'Erscheinungsjahr'])).replace(/[^\d]/g, '')) : null,
        zustand: String(getVal(['Zustand bei Kauf', 'Zustand']) || ''),
        bezugsquelle: String(getVal(['Bezugsquelle', 'Quelle']) || ''),
        preis: preis,
        sprache: String(getVal(['Sprache', 'Language']) || 'Deutsch'),
        limitierung: limitierung,
        limitiert_auf: limitiert_auf,
        variant: variant,
        variantname: variantname,
        bemerkung: bemerkung,
        kaufdatum: parseDate(getVal(['Kaufdatum', 'Gekauft am', 'kaufdatum'])),
        bestand: String(getVal(['Bestand', 'Lager']) || 'vorhanden'),
        gelesen_am: gelesenAm,
        bewertung: parseStars(getVal(['Bewertung', 'Rating', 'bewertung'])),
        bild: ''
    };
}

// Export formatting helpers
export function generateXLSX(comics) {
    const fields = [
        'id', 'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 
        'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 
        'limitiert_auf', 'variant', 'variantname', 'kaufdatum', 'bestand', 
        'gelesen_am', 'bewertung', 'bemerkung'
    ];
    
    const data = comics.map(c => {
        const row = {};
        fields.forEach(f => {
            row[f] = c[f] ?? '';
        });
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: fields });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sammlung");
    
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

export function generateCSV(comics) {
    const fields = ['id', 'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 'limitiert_auf', 'variant', 'variantname', 'kaufdatum', 'bestand', 'gelesen_am', 'bewertung', 'bemerkung'];
    const header = fields.join(';');
    const rows = comics.map(c => fields.map(f => {
        let v = c[f] ?? '';
        v = String(v).replace(/"/g, '""');
        return (v.includes(';') || v.includes('\n') || v.includes('"')) ? `"${v}"` : v;
    }).join(';'));
    return [header, ...rows].join('\n');
}

// Import Processing Engine for CSV/Excel
export async function importCSVData({
    rows,
    onProgress,
    onLogNew,
    onLogUpdated,
    onLogSkipped,
    isAborted
}) {
    const existingComics = await db.getAllComics();
    const idMap = new Map();
    const contentMap = new Map();
    const coreMap = new Map();

    existingComics.forEach(ex => {
        if (ex.id) idMap.set(ex.id, ex);
        contentMap.set(getExactSignature(ex), ex);
        
        const coreKey = getCoreSignature(ex);
        if (!coreMap.has(coreKey)) coreMap.set(coreKey, []);
        coreMap.get(coreKey).push(ex);
    });

    const total = rows.length;
    let current = 0;
    let updatedCount = 0;
    let newCount = 0;
    let skipCount = 0;

    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {
        if (isAborted()) {
            break;
        }

        const chunk = rows.slice(i, i + batchSize);

        for (const row of chunk) {
            if (isAborted()) break;

            const hasTitleOrSerie = row['Titel'] || row['titel'] || row['Serie'] || row['serie'] || row['Comic Titel'] || row['Name'] || row['Reihe'];
            if (hasTitleOrSerie) {
                const comicData = mapRowToComic(row);

                let duplicate = null;
                let contentKey = getExactSignature(comicData);

                if (comicData.id) {
                    duplicate = idMap.get(comicData.id);
                } else {
                    duplicate = contentMap.get(contentKey);
                    
                    if (!duplicate) {
                        const coreKey = getCoreSignature(comicData);
                        const coreMatches = coreMap.get(coreKey);
                        
                        if (coreMatches && coreMatches.length > 0) {
                            duplicate = coreMatches.find(c => !c._importUsed);
                        }
                    }
                }

                if (duplicate) {
                    duplicate._importUsed = true;
                    const changedFields = getChangedFields(duplicate, comicData);
                    
                    if (changedFields.length === 0) {
                        skipCount++;
                        if (onLogSkipped) onLogSkipped(comicData);
                    } else {
                        comicData.id = duplicate.id;
                        updatedCount++;
                        await db.saveComic(comicData);
                        if (comicData.id) idMap.set(comicData.id, comicData);
                        contentMap.set(contentKey, comicData);
                        if (onLogUpdated) onLogUpdated(comicData, changedFields);
                    }
                } else {
                    newCount++;
                    const newId = await db.saveComic(comicData);
                    comicData.id = newId;
                    idMap.set(newId, comicData);
                    contentMap.set(contentKey, comicData);
                    if (onLogNew) onLogNew(comicData);
                }

                current++;
                if (onProgress) {
                    onProgress(current, total, newCount, updatedCount, skipCount);
                }
            } else {
                current++;
            }
        }
    }
    
    return { aborted: isAborted(), newCount, updatedCount, skipCount, totalProcessed: current };
}

// Import Processing Engine for JSON
export async function importJSONData({
    comicsToImport,
    wishlistToImport,
    onProgress,
    onLogNew,
    onLogUpdated,
    onLogSkipped,
    isAborted
}) {
    const [existingComics, existingWishlist] = await Promise.all([
        db.getAllComics(),
        db.getWishlist()
    ]);

    const idMap = new Map();
    const contentMap = new Map();
    const coreMap = new Map();

    existingComics.forEach(ex => {
        if (ex.id) idMap.set(ex.id, ex);
        contentMap.set(getExactSignature(ex), ex);
        
        const coreKey = getCoreSignature(ex);
        if (!coreMap.has(coreKey)) coreMap.set(coreKey, []);
        coreMap.get(coreKey).push(ex);
    });

    const wishIdMap = new Map();
    const wishContentMap = new Map();
    const wishCoreMap = new Map();

    existingWishlist.forEach(ex => {
        if (ex.id) wishIdMap.set(ex.id, ex);
        wishContentMap.set(getWishlistExactSignature(ex), ex);
        
        const coreKey = getWishlistCoreSignature(ex);
        if (!wishCoreMap.has(coreKey)) wishCoreMap.set(coreKey, []);
        wishCoreMap.get(coreKey).push(ex);
    });

    const total = comicsToImport.length + wishlistToImport.length;
    let current = 0;
    let updatedCount = 0;
    let newCount = 0;
    let skipCount = 0;

    const batchSize = 50;

    for (let i = 0; i < comicsToImport.length; i += batchSize) {
        if (isAborted()) {
            break;
        }

        const chunk = comicsToImport.slice(i, i + batchSize);

        for (const comic of chunk) {
            if (isAborted()) break;

            let duplicate = null;
            let contentKey = getExactSignature(comic);

            if (comic.id) {
                duplicate = idMap.get(comic.id);
            } else {
                duplicate = contentMap.get(contentKey);
                
                if (!duplicate) {
                    const coreKey = getCoreSignature(comic);
                    const coreMatches = coreMap.get(coreKey);
                    
                    if (coreMatches && coreMatches.length > 0) {
                        duplicate = coreMatches.find(c => !c._importUsed);
                    }
                }
            }

            if (duplicate) {
                duplicate._importUsed = true;
                const changedFields = getChangedFields(duplicate, comic);
                
                if (changedFields.length === 0) {
                    skipCount++;
                    if (onLogSkipped) onLogSkipped(comic, false);
                } else {
                    const comicData = { ...duplicate, ...comic };
                    comicData.id = duplicate.id;
                    if (duplicate.bild && !comic.bild) comicData.bild = duplicate.bild;
                    if (duplicate.created_at && !comic.created_at) comicData.created_at = duplicate.created_at;
                    
                    await db.saveComic(comicData);
                    if (comicData.id) idMap.set(comicData.id, comicData);
                    contentMap.set(contentKey, comicData);
                    updatedCount++;
                    if (onLogUpdated) onLogUpdated(comic, changedFields, false);
                }
            } else {
                const newId = await db.saveComic(comic);
                const comicWithId = { ...comic, id: newId };
                idMap.set(newId, comicWithId);
                contentMap.set(contentKey, comicWithId);
                newCount++;
                if (onLogNew) onLogNew(comic, false);
            }

            current++;
            if (onProgress) {
                onProgress(current, total, newCount, updatedCount, skipCount);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 10));
    }

    for (let i = 0; i < wishlistToImport.length; i += batchSize) {
        if (isAborted()) {
            break;
        }

        const chunk = wishlistToImport.slice(i, i + batchSize);

        for (const wish of chunk) {
            if (isAborted()) break;

            let duplicate = null;
            let contentKey = getWishlistExactSignature(wish);

            if (wish.id) {
                duplicate = wishIdMap.get(wish.id);
            } else {
                duplicate = wishContentMap.get(contentKey);
                
                if (!duplicate) {
                    const coreKey = getWishlistCoreSignature(wish);
                    const coreMatches = wishCoreMap.get(coreKey);
                    
                    if (coreMatches && coreMatches.length > 0) {
                        duplicate = coreMatches.find(w => !w._importUsed);
                    }
                }
            }

            if (duplicate) {
                duplicate._importUsed = true;
                const changedFields = getWishlistChangedFields(duplicate, wish);
                
                if (changedFields.length === 0) {
                    skipCount++;
                    if (onLogSkipped) onLogSkipped(wish, true);
                } else {
                    const wishData = { ...duplicate, ...wish };
                    wishData.id = duplicate.id;
                    if (duplicate.created_at && !wish.created_at) wishData.created_at = duplicate.created_at;
                    
                    await db.saveWish(wishData);
                    if (wishData.id) wishIdMap.set(wishData.id, wishData);
                    wishContentMap.set(contentKey, wishData);
                    updatedCount++;
                    if (onLogUpdated) onLogUpdated(wish, changedFields, true);
                }
            } else {
                await db.saveWish(wish);
                newCount++;
                if (onLogNew) onLogNew(wish, true);
            }

            current++;
            if (onProgress) {
                onProgress(current, total, newCount, updatedCount, skipCount);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return { aborted: isAborted(), newCount, updatedCount, skipCount, totalProcessed: current };
}
