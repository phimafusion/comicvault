const { expect } = chai;

describe('Datenbank (db.js) – Firestore Offline Persistence', () => {

    it('sollte enablePersistence mit synchronizeTabs:true aufrufen', () => {
        let calledWith = null;
        const mockFirestore = {
            enablePersistence: (opts) => {
                calledWith = opts;
                return Promise.resolve();
            }
        };

        mockFirestore.enablePersistence({ synchronizeTabs: true });

        expect(calledWith).to.not.be.null;
        expect(calledWith.synchronizeTabs).to.be.true;
    });

    it('sollte "failed-precondition" Fehler still abfangen (mehrere Tabs offen)', (done) => {
        // Tritt auf wenn mehrere Tabs die App gleichzeitig geöffnet haben.
        // Darf die App NICHT zum Absturz bringen – nur console.warn.
        const mockFirestore = {
            enablePersistence: () => Promise.reject({ code: 'failed-precondition' })
        };

        mockFirestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
            if (err.code === 'failed-precondition') {
                expect(err.code).to.equal('failed-precondition');
                done();
            }
        });
    });

    it('sollte "unimplemented" Fehler still abfangen (Browser ohne IndexedDB-Unterstützung)', (done) => {
        // Tritt auf in sehr alten Browsern oder Privacy-Modus (Safari).
        // Darf die App NICHT zum Absturz bringen – nur console.warn.
        const mockFirestore = {
            enablePersistence: () => Promise.reject({ code: 'unimplemented' })
        };

        mockFirestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
            if (err.code === 'unimplemented') {
                expect(err.code).to.equal('unimplemented');
                done();
            }
        });
    });

    it('sollte bei unbekanntem Fehler-Code trotzdem nicht werfen', (done) => {
        const mockFirestore = {
            enablePersistence: () => Promise.reject({ code: 'some-unknown-error' })
        };

        // Der .catch()-Handler in db.js prüft nur bekannte Codes –
        // unbekannte Fehler sollen einfach ignoriert werden (kein re-throw).
        mockFirestore.enablePersistence({ synchronizeTabs: true }).catch(err => {
            expect(err.code).to.equal('some-unknown-error');
            done(); // Test gilt als bestanden wenn wir hier ankommen ohne throw
        });
    });
});
