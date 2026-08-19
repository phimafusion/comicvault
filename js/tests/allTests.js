import './utils.test.js';
import './ui.test.js';
import './autocomplete.test.js';
import './bulkdelete.test.js';
import './bulkedit.test.js';
import './import.test.js';
import './changelog.test.js';
import './responsive.test.js';
import './theme.test.js';
import './wishlist.test.js';
import './stats.test.js';
import './pwa.test.js';
import './budget.test.js';
import './dateFilters.test.js';
import './db.test.js';
import './aiInsights.test.js';
import './subscriptions.test.js';
import './duplicates.test.js';
import './mockup.test.js';
import './randomPick.test.js';
import './storage.test.js';
import './export.test.js';
import './modal.test.js';
import './validation.test.js';

if (typeof window !== 'undefined' && window.mocha) {
    const runner = window.mocha.run();
    if (typeof window.initRunner === 'function') {
        window.initRunner(runner);
    }
}
