const { assert } = chai;
import { setupDOM, clearDOM, mockFirebase } from './testHelper.js';
import { setMockMode, getCurrentUser, logout } from '../auth.js';
import { db } from '../db.js';

describe('Mockup Mode Tests', () => {
    beforeEach(() => {
        setupDOM();
        mockFirebase();
        // Reset localStorage
        localStorage.clear();
        // Clear caches
        db.comicsCache = null;
        setMockMode(false);
    });

    afterEach(() => {
        clearDOM();
        setMockMode(false);
        localStorage.clear();
    });

    it('should set mock user when mockup mode is enabled', () => {
        assert.isNull(getCurrentUser(), 'No user should be present initially');
        
        setMockMode(true);
        const user = getCurrentUser();
        
        assert.isNotNull(user, 'Mock user should be active');
        assert.equal(user.uid, 'mock-user-123', 'Mock user should have correct UID');
        assert.equal(localStorage.getItem('mock_mode'), 'true', 'mock_mode should be saved in localStorage');
    });

    it('should remove mock user when mockup mode is disabled', () => {
        setMockMode(true);
        assert.isNotNull(getCurrentUser(), 'Mock user should be active');
        
        setMockMode(false);
        assert.isNull(getCurrentUser(), 'Mock user should be removed');
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
        assert.isNotNull(getCurrentUser(), 'Mock user should be active');
        
        await logout();
        assert.isNull(getCurrentUser(), 'User should be logged out');
        assert.isNull(localStorage.getItem('mock_mode'), 'mock_mode should be cleared');
    });

    it('should fall back to standard Firebase user when mock mode is disabled', () => {
        // Enforce mock mode disabled
        setMockMode(false);
        
        // standard mockFirebase in testHelper sets currentUser to { uid: 'mock-user-id' }
        const user = getCurrentUser();
        assert.isNotNull(user, 'Standard firebase user should be returned');
        assert.equal(user.uid, 'mock-user-id', 'Should return mock-user-id from testHelper mock, not mockup mode user');
    });
});
