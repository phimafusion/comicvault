import { db } from '../db.js';

export function getCoreSignature(comic) {
    const serie = (comic.serie || '').toLowerCase().trim();
    const nummer = (comic.nummer !== null && comic.nummer !== undefined) ? String(comic.nummer).trim() : '';
    return `${serie}___${nummer}`;
}

export async function findDuplicatePairs() {
    const comics = await db.getAllComics();
    const map = new Map();
    const duplicates = [];

    comics.forEach(comic => {
        const sig = getCoreSignature(comic);
        if (!sig || sig === '___') return;
        if (!map.has(sig)) {
            map.set(sig, []);
        }
        map.get(sig).push(comic);
    });

    map.forEach((list, sig) => {
        if (list.length > 1) {
            for (let i = 0; i < list.length - 1; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const itemA = list[i];
                    const itemB = list[j];
                    const reason = 'Identische Serie & Nummer';
                    const confidence = (itemA.titel === itemB.titel || itemA.format === itemB.format) ? 'high' : 'medium';
                    duplicates.push({
                        primary: itemA,
                        duplicate: itemB,
                        reason,
                        confidence
                    });
                }
            }
        }
    });

    return duplicates;
}
