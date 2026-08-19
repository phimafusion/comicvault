/**
 * ComicVault - DOM & UI Utilities
 * Hilfsfunktionen für Toasts, Diff-Berechnungen und DOM-Interaktionen.
 */

/**
 * Zeigt ein Feedback-Toast am Bildschirmrand an.
 * 
 * @param {string} message Nachrichtentext
 * @param {'success'|'error'|'info'} [type='success']
 */
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.innerHTML = '';
    
    const icon = document.createElement('i');
    icon.style.marginRight = '8px';
    if (type === 'success') {
        icon.className = 'fa-solid fa-circle-check';
        toast.style.background = 'rgba(16, 185, 129, 0.95)';
    } else if (type === 'error') {
        icon.className = 'fa-solid fa-circle-exclamation';
        toast.style.background = 'rgba(239, 68, 68, 0.95)';
    } else if (type === 'info') {
        icon.className = 'fa-solid fa-circle-info';
        toast.style.background = 'rgba(99, 102, 241, 0.95)';
    } else {
        icon.className = 'fa-solid fa-circle-check';
    }
    
    toast.appendChild(icon);
    toast.appendChild(document.createTextNode(message));
    
    toast.classList.add('show');
    
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Ermittelt alle geänderten Comic-Felder zwischen zwei Objekten für das Changelog.
 * 
 * @param {Object} oldData
 * @param {Object} newData
 * @returns {string[]} Liste der Feldnamen
 */
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

/**
 * Ermittelt alle geänderten Wunschlisten-Felder zwischen zwei Objekten für das Changelog.
 * 
 * @param {Object} oldData
 * @param {Object} newData
 * @returns {string[]} Liste der Feldnamen
 */
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
