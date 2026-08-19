// ComicVault - Central Modal Manager (modalService.js)
// Zentraler Service für barrierefreies Öffnen, Schließen, Focus-Trapping, ESC- und Backdrop-Handling aller Dialoge

class ModalManager {
    constructor() {
        this.modalStack = [];
        this.activeModals = new Map(); // modalElement -> { options, previousActiveElement, keydownHandler, backdropHandler }
        this._initGlobalListeners();
    }

    _initGlobalListeners() {
        if (typeof window === 'undefined') return;

        // Global Escape Key Listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (this.modalStack.length > 0) {
                    const topModal = this.modalStack[this.modalStack.length - 1];
                    const config = this.activeModals.get(topModal);
                    if (config && config.options.closeOnEscape !== false) {
                        e.preventDefault();
                        this.close(topModal);
                    }
                }
            }
        });
    }

    /**
     * Ermittelt ein DOM-Element anhand von ID oder Übergabe
     * @param {string|HTMLElement} elementOrId 
     * @returns {HTMLElement|null}
     */
    _getElement(elementOrId) {
        if (!elementOrId) return null;
        if (typeof elementOrId === 'string') {
            const cleanId = elementOrId.startsWith('#') ? elementOrId.slice(1) : elementOrId;
            return document.getElementById(cleanId);
        }
        return elementOrId instanceof HTMLElement ? elementOrId : null;
    }

    /**
     * Öffnet ein Modal-Element mit Barrierefreiheit und Scroll-Lock
     * @param {string|HTMLElement} elementOrId 
     * @param {Object} options 
     * @param {boolean} [options.closeOnBackdrop=true]
     * @param {boolean} [options.closeOnEscape=true]
     * @param {boolean} [options.trapFocus=true]
     * @param {Function} [options.onOpen]
     * @param {Function} [options.onClose]
     * @returns {HTMLElement|null}
     */
    open(elementOrId, options = {}) {
        const modal = this._getElement(elementOrId);
        if (!modal) {
            console.warn('modalService.open: Element nicht gefunden:', elementOrId);
            return null;
        }

        const config = {
            closeOnBackdrop: options.closeOnBackdrop !== false,
            closeOnEscape: options.closeOnEscape !== false,
            trapFocus: options.trapFocus !== false,
            onOpen: options.onOpen || null,
            onClose: options.onClose || null
        };

        const previousActiveElement = document.activeElement;

        // Modal sichtbar schalten
        modal.style.display = 'flex';
        modal.classList.add('active');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('role', 'dialog');

        // Scroll des Hintergrunds sperren
        document.body.classList.add('modal-open');

        // Backdrop Click Handler
        const backdropHandler = (e) => {
            if (e.target === modal && config.closeOnBackdrop) {
                this.close(modal);
            }
        };
        modal.addEventListener('click', backdropHandler);

        // Focus Trap Handler
        let keydownHandler = null;
        if (config.trapFocus) {
            keydownHandler = (e) => {
                if (e.key === 'Tab') {
                    const focusables = modal.querySelectorAll(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    );
                    if (focusables.length === 0) return;

                    const firstEl = focusables[0];
                    const lastEl = focusables[focusables.length - 1];

                    if (e.shiftKey) {
                        if (document.activeElement === firstEl) {
                            e.preventDefault();
                            lastEl.focus();
                        }
                    } else {
                        if (document.activeElement === lastEl) {
                            e.preventDefault();
                            firstEl.focus();
                        }
                    }
                }
            };
            modal.addEventListener('keydown', keydownHandler);
        }

        // Im Stack registrieren
        if (!this.modalStack.includes(modal)) {
            this.modalStack.push(modal);
        }
        this.activeModals.set(modal, {
            options: config,
            previousActiveElement,
            keydownHandler,
            backdropHandler
        });

        // Automatischen Fokus setzen
        const autoFocusEl = modal.querySelector('[autofocus]') || modal.querySelector('input, select, textarea, button');
        if (autoFocusEl && typeof autoFocusEl.focus === 'function') {
            setTimeout(() => autoFocusEl.focus(), 50);
        }

        if (typeof config.onOpen === 'function') {
            config.onOpen(modal);
        }

        return modal;
    }

    /**
     * Schließt ein geöffnetes Modal
     * @param {string|HTMLElement} elementOrId 
     * @param {*} [resultData] Optionaler Rückgabewert für Callbacks
     * @returns {boolean}
     */
    close(elementOrId, resultData = null) {
        const modal = this._getElement(elementOrId);
        if (!modal) return false;

        const config = this.activeModals.get(modal);

        // Event-Listener entfernen
        if (config) {
            if (config.backdropHandler) {
                modal.removeEventListener('click', config.backdropHandler);
            }
            if (config.keydownHandler) {
                modal.removeEventListener('keydown', config.keydownHandler);
            }
        }

        // Modal ausblenden
        modal.style.display = 'none';
        modal.classList.remove('active');
        modal.removeAttribute('aria-modal');

        // Aus Stack entfernen
        this.modalStack = this.modalStack.filter(m => m !== modal);
        this.activeModals.delete(modal);

        // Body-Scroll wieder freigeben, wenn keine Modals mehr offen sind
        if (this.modalStack.length === 0) {
            document.body.classList.remove('modal-open');
        }

        // Fokus an vorheriges Element zurückgeben
        if (config && config.previousActiveElement && typeof config.previousActiveElement.focus === 'function') {
            try {
                config.previousActiveElement.focus();
            } catch (err) {}
        }

        // Callback ausführen
        if (config && typeof config.options.onClose === 'function') {
            config.options.onClose(resultData);
        }

        return true;
    }

    /**
     * Schließt das oberste geöffnete Modal
     * @returns {boolean}
     */
    closeTop() {
        if (this.modalStack.length === 0) return false;
        const topModal = this.modalStack[this.modalStack.length - 1];
        return this.close(topModal);
    }

    /**
     * Schließt alle geöffneten Modals
     */
    closeAll() {
        const modals = [...this.modalStack];
        modals.reverse().forEach(m => this.close(m));
    }

    /**
     * Gibt zurück, ob aktuell mindestens ein Modal geöffnet ist
     * @returns {boolean}
     */
    isOpen(elementOrId = null) {
        if (!elementOrId) return this.modalStack.length > 0;
        const modal = this._getElement(elementOrId);
        return modal ? this.modalStack.includes(modal) : false;
    }

    /**
     * Universeller, barrierefreier Bestätigungsdialog (Promise-basiert)
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.message
     * @param {string} [options.confirmText='Bestätigen']
     * @param {string} [options.cancelText='Abbrechen']
     * @param {boolean} [options.isDanger=false]
     * @returns {Promise<boolean>}
     */
    confirm({
        title = 'Bestätigung',
        message = 'Bist du sicher?',
        confirmText = 'Bestätigen',
        cancelText = 'Abbrechen',
        isDanger = false
    } = {}) {
        return new Promise((resolve) => {
            const modalId = 'dynamic-confirm-modal';
            let existing = document.getElementById(modalId);
            if (existing) existing.remove();

            const confirmBtnClass = isDanger ? 'btn btn-danger' : 'btn btn-primary';
            const confirmBtnStyle = isDanger ? 'background-color: var(--danger); border-color: var(--danger); color: white;' : '';

            const modalHtml = `
                <div id="${modalId}" class="modal-overlay" style="z-index: 12000; display: flex;">
                    <div class="modal-content" style="max-width: 440px; border-radius: 12px;">
                        <div class="modal-header">
                            <h2 style="font-size: 1.15rem; margin: 0;">${title}</h2>
                            <button class="close-btn" id="${modalId}-close"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="modal-body" style="padding: 20px; font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary);">
                            ${message}
                        </div>
                        <div class="modal-footer" style="padding: 16px 20px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button class="btn btn-secondary" id="${modalId}-cancel">${cancelText}</button>
                            <button class="${confirmBtnClass}" id="${modalId}-ok" style="${confirmBtnStyle}">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById(modalId);

            let resolved = false;
            const finish = (result) => {
                if (resolved) return;
                resolved = true;
                this.close(modal, result);
                if (document.body.contains(modal)) modal.remove();
                resolve(result === true);
            };

            modal.querySelector(`#${modalId}-close`).addEventListener('click', () => finish(false));
            modal.querySelector(`#${modalId}-cancel`).addEventListener('click', () => finish(false));
            modal.querySelector(`#${modalId}-ok`).addEventListener('click', () => finish(true));

            this.open(modal, {
                closeOnBackdrop: true,
                closeOnEscape: true,
                onClose: (res) => {
                    finish(res === true);
                }
            });
        });
    }

    /**
     * Universeller Info-Dialog (Promise-basiert)
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.message
     * @param {string} [options.okText='OK']
     * @returns {Promise<void>}
     */
    alert({
        title = 'Hinweis',
        message = '',
        okText = 'OK'
    } = {}) {
        return new Promise((resolve) => {
            const modalId = 'dynamic-alert-modal';
            let existing = document.getElementById(modalId);
            if (existing) existing.remove();

            const modalHtml = `
                <div id="${modalId}" class="modal-overlay" style="z-index: 12000; display: flex;">
                    <div class="modal-content" style="max-width: 420px; border-radius: 12px;">
                        <div class="modal-header">
                            <h2 style="font-size: 1.15rem; margin: 0;">${title}</h2>
                            <button class="close-btn" id="${modalId}-close"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="modal-body" style="padding: 20px; font-size: 0.95rem; line-height: 1.5; color: var(--text-secondary);">
                            ${message}
                        </div>
                        <div class="modal-footer" style="padding: 16px 20px; display: flex; justify-content: flex-end;">
                            <button class="btn btn-primary" id="${modalId}-ok">${okText}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.getElementById(modalId);

            let resolved = false;
            const finish = () => {
                if (resolved) return;
                resolved = true;
                this.close(modal);
                if (document.body.contains(modal)) modal.remove();
                resolve();
            };

            modal.querySelector(`#${modalId}-close`).addEventListener('click', finish);
            modal.querySelector(`#${modalId}-ok`).addEventListener('click', finish);

            this.open(modal, {
                closeOnBackdrop: true,
                closeOnEscape: true,
                onClose: () => finish()
            });
        });
    }
}

export const modalService = new ModalManager();
