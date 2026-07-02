const { expect } = chai;
import { db } from '../db.js';
import { renderSubscriptions, cleanupSubscriptions } from '../views/subscriptions.js';
import { setupTestEnv, cleanup } from './testHelper.js';

describe('Subscriptions (Abos) Feature', function() {
    let container;
    let testEnv;

    beforeEach(async function() {
        testEnv = setupTestEnv();
        container = document.createElement('div');
        container.id = 'view-container';
        document.body.appendChild(container);
    });

    afterEach(async function() {
        cleanupSubscriptions();
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        cleanup();
    });

    it('should save and retrieve a subscription from DB', async function() {
        const subData = {
            titel: 'Test Abo 1',
            verlag: 'Test Verlag',
            haendler: 'Test Händler'
        };

        await db.saveSubscription(subData);
        
        const subs = await db.getSubscriptions();
        expect(subs).to.have.lengthOf(1);
        expect(subs[0].titel).to.equal('Test Abo 1');
        expect(subs[0].verlag).to.equal('Test Verlag');
        expect(subs[0].haendler).to.equal('Test Händler');
    });

    it('should delete a subscription from DB', async function() {
        const subData = {
            titel: 'To Delete Abo',
            verlag: 'V',
            haendler: 'H'
        };

        await db.saveSubscription(subData);
        let subs = await db.getSubscriptions();
        expect(subs).to.have.lengthOf(1);
        
        const subId = subs[0].id;
        await db.deleteSubscription(subId);
        
        subs = await db.getSubscriptions();
        expect(subs).to.have.lengthOf(0);
    });

    it('should render the subscriptions view correctly with empty state', async function() {
        await renderSubscriptions(container);
        
        const title = container.querySelector('.view-title');
        expect(title).to.exist;
        expect(title.textContent).to.equal('Abonnements');

        const tbody = container.querySelector('#subscriptions-body');
        expect(tbody).to.exist;
        
        // Wait for rendering to complete since it fetches data
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(tbody.textContent).to.include('Keine Abonnements gefunden');
    });

    it('should render existing subscriptions in the table', async function() {
        await db.saveSubscription({
            titel: 'Batman',
            verlag: 'Panini',
            haendler: 'Comic Shop'
        });

        await renderSubscriptions(container);
        
        // Wait for rendering to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        const tbody = container.querySelector('#subscriptions-body');
        expect(tbody.textContent).to.include('Batman');
        expect(tbody.textContent).to.include('Panini');
        expect(tbody.textContent).to.include('Comic Shop');
    });

    it('should filter subscriptions correctly', async function() {
        await db.saveSubscription({ titel: 'Batman', verlag: 'Panini' });
        await db.saveSubscription({ titel: 'Spider-Man', verlag: 'Marvel' });

        await renderSubscriptions(container);
        await new Promise(resolve => setTimeout(resolve, 100));

        const searchInput = container.querySelector('#subscriptions-search');
        searchInput.value = 'Bat';
        searchInput.dispatchEvent(new Event('input'));

        await new Promise(resolve => setTimeout(resolve, 100));

        const tbody = container.querySelector('#subscriptions-body');
        expect(tbody.textContent).to.include('Batman');
        expect(tbody.textContent).to.not.include('Spider-Man');
    });

    it('should initialize autocomplete for publisher and vendor fields in the modal', async function() {
        // Prepare some data
        testEnv.setMockComics([{ verlag: 'DC Comics' }]);
        await db.saveSubscription({ titel: 'Sub 1', verlag: 'Marvel', haendler: 'Comicladen XY' });

        await renderSubscriptions(container);
        
        // Click Add Subscription
        const addBtn = container.querySelector('#btn-add-subscription');
        addBtn.click();
        
        // Wait for modal to render and async fetch to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const modal = document.querySelector('#subscription-modal');
        expect(modal).to.exist;
        
        const verlagInput = document.querySelector('#sub-verlag');
        const haendlerInput = document.querySelector('#sub-haendler');
        
        expect(verlagInput).to.exist;
        expect(haendlerInput).to.exist;
        
        // check if autocomplete is initialized (autocomplete="off" is set by initAutocomplete)
        expect(verlagInput.getAttribute('autocomplete')).to.equal('off');
        expect(haendlerInput.getAttribute('autocomplete')).to.equal('off');
        
        // Close modal manually to clean up DOM for next tests
        const closeBtn = document.querySelector('#btn-close-sub-modal');
        if (closeBtn) closeBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 50));
    });
});
