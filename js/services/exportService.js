// ComicVault - Central Export Service
// Zentraler Service für strukturierte Backups (JSON) sowie XLSX- und CSV-Exporte mit Formelschutz

import { db } from '../db.js';

/**
 * Entwertet gefährliche Formel-Steuerzeichen beim Export für Excel/CSV (Formula Injection Protection)
 * @param {*} val 
 * @returns {*}
 */
export function sanitizeFormulaValue(val) {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'string') return val;
    if (/^[=+\-@\t\r]/.test(val)) {
        return "'" + val;
    }
    return val;
}

/**
 * Erstellt ein vollständiges strukturiertes JSON-Backup aller Daten
 * @param {Object} options
 * @param {Array} [options.comics]
 * @param {Array} [options.wishlist]
 * @param {Array} [options.subscriptions]
 * @param {Object} [options.settings]
 * @param {Object} [options.budgets]
 * @returns {Object}
 */
export function buildJSONBackup({
    comics = [],
    wishlist = [],
    subscriptions = [],
    settings = null,
    budgets = null
} = {}) {
    return {
        version: "2.4",
        app: "ComicVault",
        exportDate: new Date().toISOString(),
        summary: {
            comicsCount: comics.length,
            wishlistCount: wishlist.length,
            subscriptionsCount: subscriptions.length
        },
        comics,
        wishlist,
        subscriptions,
        settings: settings || {},
        budgets: budgets || {}
    };
}

/**
 * Erzeugt eine CSV-Zeichenkette mit optionaler Unterscheidung zwischen Sammlung und Wunschliste
 * @param {Array} items 
 * @param {boolean} isWishlist 
 * @returns {string}
 */
export function generateCSV(items, isWishlist = false) {
    const fields = isWishlist 
        ? ['id', 'titel', 'typ', 'format', 'preis', 'jahr', 'vorbestellt', 'isbn', 'besonderheit', 'bemerkung']
        : ['id', 'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 'limitiert_auf', 'variant', 'variantname', 'kaufdatum', 'bestand', 'gelesen_am', 'bewertung', 'bemerkung'];
    
    const header = fields.join(';');
    const rows = (items || []).map(item => fields.map(f => {
        let v = item[f] ?? '';
        if (f === 'vorbestellt' && isWishlist) {
            v = v ? 'Ja' : 'Nein';
        } else if ((f === 'variant' || f === 'limitierung') && !isWishlist) {
            v = v ? 'Ja' : 'Nein';
        }
        v = sanitizeFormulaValue(v);
        v = String(v).replace(/"/g, '""');
        return (v.includes(';') || v.includes('\n') || v.includes('"')) ? `"${v}"` : v;
    }).join(';'));
    
    return [header, ...rows].join('\n');
}

/**
 * Erzeugt einen XLSX-Workbook-ArrayBuffer mit separaten Sheets für Sammlung und Wunschliste
 * @param {Array} comics 
 * @param {Array} wishes 
 * @returns {ArrayBuffer|Uint8Array}
 */
export function generateXLSX(comics, wishes = null) {
    if (typeof XLSX === 'undefined') {
        throw new Error('SheetJS (XLSX) Bibliothek nicht geladen.');
    }

    const workbook = XLSX.utils.book_new();

    const fieldsComics = [
        'id', 'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 
        'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 
        'limitiert_auf', 'variant', 'variantname', 'kaufdatum', 'bestand', 
        'gelesen_am', 'bewertung', 'bemerkung'
    ];

    const fieldsWishes = [
        'id', 'titel', 'typ', 'format', 'preis', 'jahr', 'vorbestellt', 
        'isbn', 'besonderheit', 'bemerkung'
    ];

    if (comics && comics.length > 0) {
        const dataComics = comics.map(c => {
            const row = {};
            fieldsComics.forEach(f => {
                let v = c[f] ?? '';
                if (f === 'variant' || f === 'limitierung') {
                    v = v ? 'Ja' : 'Nein';
                }
                row[f] = sanitizeFormulaValue(v);
            });
            return row;
        });
        const worksheetComics = XLSX.utils.json_to_sheet(dataComics, { header: fieldsComics });
        XLSX.utils.book_append_sheet(workbook, worksheetComics, "Sammlung");
    }

    if (wishes && wishes.length > 0) {
        const dataWishes = wishes.map(w => {
            const row = {};
            fieldsWishes.forEach(f => {
                let v = w[f] ?? '';
                if (f === 'vorbestellt') {
                    v = v ? 'Ja' : 'Nein';
                }
                row[f] = sanitizeFormulaValue(v);
            });
            return row;
        });
        const worksheetWishes = XLSX.utils.json_to_sheet(dataWishes, { header: fieldsWishes });
        XLSX.utils.book_append_sheet(workbook, worksheetWishes, "Wunschliste");
    }

    if ((!comics || comics.length === 0) && (!wishes || wishes.length === 0)) {
        const emptyWorksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, emptyWorksheet, "Leer");
    }

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

/**
 * Löst einen Dateidownload im Browser aus
 * @param {string} urlOrDataUrl 
 * @param {string} filename 
 */
export function triggerDownload(urlOrDataUrl, filename) {
    const a = document.createElement('a');
    a.href = urlOrDataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/**
 * Führt einen vollständigen Export der Anwendungsdaten im gewählten Format aus
 * @param {'json'|'xlsx'|'csv'} format 
 * @returns {Promise<{ success: boolean, filename: string }>}
 */
export async function executeExport(format = 'json') {
    const comics = await db.getAllComics();
    const wishlist = await db.getWishlist();
    const subscriptions = await db.getSubscriptions ? await db.getSubscriptions() : [];
    const settings = db.getSettings ? db.getSettings() : {};
    const budgets = db.getBudgets ? await db.getBudgets() : {};

    if (comics.length === 0 && wishlist.length === 0) {
        throw new Error('Sammlung und Wunschliste sind leer.');
    }

    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
        const backupData = buildJSONBackup({
            comics,
            wishlist,
            subscriptions,
            settings,
            budgets
        });
        const jsonStr = JSON.stringify(backupData, null, 2);
        const dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
        const filename = `ComicVault_Backup_${dateStr}.json`;
        triggerDownload(dataUrl, filename);
        return { success: true, filename };
    } 
    else if (format === 'csv') {
        const csvStr = generateCSV(comics, false);
        const dataUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(csvStr);
        const filename = `ComicVault_Sammlung_${dateStr}.csv`;
        triggerDownload(dataUrl, filename);
        return { success: true, filename };
    } 
    else if (format === 'xlsx') {
        const xlsxBuffer = generateXLSX(comics, wishlist);
        const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const filename = `ComicVault_Sammlung_${dateStr}.xlsx`;
        triggerDownload(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return { success: true, filename };
    }

    throw new Error(`Unbekanntes Exportformat: ${format}`);
}

export const exportService = {
    sanitizeFormulaValue,
    buildJSONBackup,
    generateCSV,
    generateXLSX,
    triggerDownload,
    executeExport
};
