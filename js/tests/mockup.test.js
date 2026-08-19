const { assert } = chai;
import { setMockMode, getCurrentUser, logout } from '../auth.js';
import { db } from '../db.js';

describe('Mockup-Modus Tests', () => {
    let originalComicsCache;

    beforeEach(() => {
        originalComicsCache = db.comicsCache;
        db.comicsCache = null;
        setMockMode(false);
    });

    afterEach(() => {
        setMockMode(false);
        db.comicsCache = originalComicsCache;
        localStorage.clear();
    });

    it('sollte den Mock-Benutzer setzen, wenn der Mockup-Modus aktiviert wird', () => {
        setMockMode(true);
        const user = getCurrentUser();
        
        assert.isNotNull(user, 'Mock-Benutzer sollte aktiv sein');
        assert.equal(user.uid, 'mock-user-123', 'Mock-Benutzer sollte korrekte UID haben');
        assert.equal(localStorage.getItem('mock_mode'), 'true', 'mock_mode sollte im localStorage gespeichert sein');
    });

    it('sollte den Mock-Benutzer entfernen, wenn der Mockup-Modus deaktiviert wird', () => {
        const originalUser = getCurrentUser();
        
        setMockMode(true);
        assert.equal(getCurrentUser().uid, 'mock-user-123');
        
        setMockMode(false);
        const currentUser = getCurrentUser();
        if (originalUser) {
            assert.equal(currentUser.uid, originalUser.uid, 'Sollte den ursprünglichen Benutzer wiederherstellen');
        } else {
            assert.isNull(currentUser, 'Sollte null sein, wenn vorher abgemeldet');
        }
        assert.isNull(localStorage.getItem('mock_mode'), 'mock_mode sollte aus dem localStorage entfernt sein');
    });

    it('sollte Mock-Comics in der Datenbank liefern, wenn der Mock-Benutzer aktiv ist', async () => {
        setMockMode(true);
        const comics = await db.getAllComics();
        
        assert.isArray(comics, 'getAllComics sollte ein Array zurückgeben');
        assert.isAtLeast(comics.length, 3, 'Sollte mehrere Mock-Comics liefern');
        assert.equal(comics[0].serie, 'Spider-Man', 'Erster Mock-Comic sollte Spider-Man sein');
    });

    it('sollte den Mock-Modus beim Logout automatisch deaktivieren', async () => {
        setMockMode(true);
        assert.equal(getCurrentUser().uid, 'mock-user-123');
        
        await logout();
        assert.isNull(localStorage.getItem('mock_mode'), 'mock_mode sollte geleert sein');
        const user = getCurrentUser();
        if (user) {
            assert.notEqual(user.uid, 'mock-user-123', 'Sollte nicht mehr der Mockup-Benutzer sein');
        }
    });

    it('sollte auf den normalen Firebase-Benutzer zurückfallen, wenn der Mock-Modus deaktiviert ist', () => {
        setMockMode(false);
        const user = getCurrentUser();
        
        if (user) {
            assert.notEqual(user.uid, 'mock-user-123', 'Sollte nicht den Mockup-Benutzer liefern');
        }
    });
});
