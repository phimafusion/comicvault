import { storageService, STORAGE_KEYS } from '../services/storageService.js';

class StateStore {
    constructor() {
        this.state = {
            currentUser: null,
            activeView: 'collection',
            searchQuery: '',
            theme: storageService.getString(STORAGE_KEYS.THEME, 'dark')
        };
        this.listeners = new Set();
    }

    getState() {
        return { ...this.state };
    }

    setState(partialState) {
        this.state = { ...this.state, ...partialState };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }
}

export const stateStore = new StateStore();
