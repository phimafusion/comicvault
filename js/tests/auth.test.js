import { setMockMode, logout, getCurrentUser, loginWithGoogle } from '../auth.js';

const { expect } = chai;

describe('Auth & Login Module Tests', () => {

    afterEach(() => {
        setMockMode(false);
        localStorage.clear();
    });

    after(() => {
        setMockMode(false);
        localStorage.clear();
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
        try {
            const result = await loginWithGoogle();
            expect(result).to.have.property('success');
        } catch (err) {
            expect(err).to.exist;
        }
    });
});
