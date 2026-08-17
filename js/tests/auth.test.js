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
    });

    it('sollte den Mock-Modus beim Logout deaktivieren', async () => {
        setMockMode(true);
        expect(getCurrentUser()).to.not.be.null;

        await logout();
        expect(getCurrentUser()).to.be.null;
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
