import { setMockMode, logout, getCurrentUser, loginWithGoogle } from '../auth.js';

const { expect } = chai;

describe('Auth & Login Module Tests', () => {

    afterEach(() => {
        setMockMode(false);
        if ('localStorage' in window) {
            localStorage.removeItem('mock_mode');
        }
    });

    after(() => {
        setMockMode(false);
        if ('localStorage' in window) {
            localStorage.removeItem('mock_mode');
        }
    });

    it('sollte den Mock-Modus aktivieren und den Mock-Benutzer zurückgeben', () => {
        setMockMode(true);
        const user = getCurrentUser();
        expect(user).to.not.be.null;
        expect(user.uid).to.equal('mock-user-123');
        expect(user.displayName).to.equal('Mock User');
        expect(user.email).to.equal('mock@example.com');
    });

    it('sollte den Mock-Modus beim Logout deaktivieren', async () => {
        setMockMode(true);
        expect(getCurrentUser()?.uid).to.equal('mock-user-123');

        await logout();
        const userAfter = getCurrentUser();
        const uidAfter = userAfter ? userAfter.uid : null;
        expect(uidAfter).to.not.equal('mock-user-123');
    });

    it('sollte loginWithGoogle ausführen ohne Fehler zu werfen', async () => {
        const origSignIn = firebase.auth().signInWithPopup;
        firebase.auth().signInWithPopup = async () => ({ user: { uid: 'google-user' } });

        try {
            const result = await loginWithGoogle();
            expect(result.success).to.be.true;
        } finally {
            firebase.auth().signInWithPopup = origSignIn;
        }
    });
});
