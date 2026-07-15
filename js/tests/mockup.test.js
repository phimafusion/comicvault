const { assert } = chai;
import { setMockMode, getCurrentUser, logout } from '../auth.js';
import { db } from '../db.js';

describe('Mockup Mode Tests', () => {
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

    it('should set mock user when mockup mode is enabled', () => {
        setMockMode(true);
        const user = getCurrentUser();
        
        assert.isNotNull(user, 'Mock user should be active');
        assert.equal(user.uid, 'mock-user-123', 'Mock user should have correct UID');
        assert.equal(localStorage.getItem('mock_mode'), 'true', 'mock_mode should be saved in localStorage');
    });

    it('should remove mock user when mockup mode is disabled', () => {
        const originalUser = getCurrentUser();
        
        setMockMode(true);
        assert.equal(getCurrentUser().uid, 'mock-user-123');
        
        setMockMode(false);
        const currentUser = getCurrentUser();
        if (originalUser) {
            assert.equal(currentUser.uid, originalUser.uid, 'Should restore original user');
        } else {
            assert.isNull(currentUser, 'Should be null if originally logged out');
        }
        assert.isNull(localStorage.getItem('mock_mode'), 'mock_mode should be removed from localStorage');
    });

    it('should return mock comics data in db when mock user is active', async () => {
        setMockMode(true);
        const comics = await db.getAllComics();
        
        assert.isArray(comics, 'getAllComics should return an array');
        assert.isAtLeast(comics.length, 3, 'Should return multiple mock comics');
        assert.equal(comics[0].serie, 'Spider-Man', 'First mock comic should be Spider-Man');
    });

    it('logout should disable mock mode if active', async () => {
        setMockMode(true);
        assert.equal(getCurrentUser().uid, 'mock-user-123');
        
        await logout();
        assert.isNull(localStorage.getItem('mock_mode'), 'mock_mode should be cleared');
        const user = getCurrentUser();
        if (user) {
            assert.notEqual(user.uid, 'mock-user-123', 'Should revert from mockup user');
        }
    });

    it('should fall back to standard Firebase user when mock mode is disabled', () => {
        setMockMode(false);
        const user = getCurrentUser();
        
        if (user) {
            assert.notEqual(user.uid, 'mock-user-123', 'Should not return mockup user');
        }
    });
});
