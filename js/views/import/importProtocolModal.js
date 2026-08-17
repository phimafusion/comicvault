import { escapeHTML } from '../../utils.js';

export function createImportProtocolModal(container) {
    const html = `
        <div id="import-log-overlay" class="modal-overlay" style="display: none;">
            <div class="modal-content" style="height: 80vh;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-magnifying-glass"></i> Import Vorschau & Analyse</h2>
                </div>
                <div style="padding: 10px 20px;">
                    <div id="import-progress-text" style="margin-bottom: 8px;">Initialisiere Vorschau & Analyse...</div>
                    <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                        <div id="import-progress-bar" style="width: 0%; height: 100%; background: var(--primary-color); transition: width 0.3s ease;"></div>
                    </div>
                </div>
                <div class="modal-body" style="display: flex; gap: 0; overflow: hidden; padding: 0; border-top: 1px solid var(--border-color);">
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--border-color);">
                        <div style="padding: 10px 15px; background: rgba(16, 185, 129, 0.05); color: var(--success); font-weight: bold; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">
                            <i class="fa-solid fa-plus-circle"></i> Neu
                        </div>
                        <div id="log-new" style="flex: 1; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 0.8rem; line-height: 1.4;"></div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--border-color);">
                        <div style="padding: 10px 15px; background: rgba(6, 182, 212, 0.05); color: var(--secondary-color); font-weight: bold; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">
                            <i class="fa-solid fa-pen-to-square"></i> Updates
                        </div>
                        <div id="log-updated" style="flex: 1; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 0.8rem; line-height: 1.4;"></div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div style="padding: 10px 15px; background: rgba(148, 163, 184, 0.05); color: var(--text-secondary); font-weight: bold; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">
                            <i class="fa-solid fa-forward-step"></i> Übersprungen
                        </div>
                        <div id="log-skipped" style="flex: 1; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 0.8rem; line-height: 1.4;"></div>
                    </div>
                </div>
                <div id="import-live-summary" style="padding: 12px 24px; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.1); font-size: 0.85rem; display: flex; gap: 20px;">
                    <span id="sum-new" style="color: var(--success); font-weight: bold;">0 neu</span>
                    <span id="sum-updated" style="color: var(--secondary-color); font-weight: bold;">0 updates</span>
                    <span id="sum-skipped" style="color: var(--text-secondary); font-weight: bold;">0 übersprungen</span>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <button class="btn btn-danger" id="btn-cancel-import"><i class="fa-solid fa-xmark"></i> Abbrechen</button>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" id="btn-proceed-import" style="display: none;"><i class="fa-solid fa-check"></i> Import jetzt in Datenbank speichern</button>
                        <button class="btn btn-primary" id="btn-confirm-log-overlay" style="display: none;">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}
