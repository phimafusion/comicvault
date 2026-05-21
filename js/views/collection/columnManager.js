let draggedColumnKey = null;
let isResizing = false;
let currentResizerKey = null;
let startX, startWidth, headerEl;
let resizeTick = false;

let getVisibleFields = null;
let setVisibleFields = null;
let updateGrid = null;

export function initColumnManager(config) {
    getVisibleFields = config.getVisibleFields;
    setVisibleFields = config.setVisibleFields;
    updateGrid = config.updateGrid;
}

export const handleDragStart = (e) => {
    const header = e.target.closest('.sortable-header');
    if (header) {
        draggedColumnKey = header.dataset.sort;
        setTimeout(() => {
            header.style.opacity = '0.4';
            header.style.background = 'rgba(255,255,255,0.05)';
        }, 0);
    }
};

export const handleDragEnd = (e) => {
    if (draggedColumnKey) {
        const header = document.querySelector(`.sortable-header[data-sort="${draggedColumnKey}"]`);
        if (header) {
            header.style.opacity = '1';
            header.style.background = 'transparent';
        }
        document.querySelectorAll('.sortable-header').forEach(h => h.style.borderLeft = '');
        draggedColumnKey = null;
    }
};

export const handleDragOver = (e) => {
    const header = e.target.closest('.sortable-header');
    if (header && draggedColumnKey && header.dataset.sort !== draggedColumnKey) {
        e.preventDefault(); // Erlaubt das Drop-Event
        document.querySelectorAll('.sortable-header').forEach(h => h.style.borderLeft = '');
        header.style.borderLeft = '2px solid var(--primary-color)';
    }
};

export const handleDragLeave = (e) => {
    const header = e.target.closest('.sortable-header');
    if (header) {
        header.style.borderLeft = '';
    }
};

export const handleDrop = (e) => {
    const header = e.target.closest('.sortable-header');
    if (header && draggedColumnKey && header.dataset.sort !== draggedColumnKey) {
        e.preventDefault();
        const targetKey = header.dataset.sort;
        
        const visibleFields = getVisibleFields();
        const list = visibleFields.list;
        const fromIndex = list.indexOf(draggedColumnKey);
        const toIndex = list.indexOf(targetKey);
        
        if (fromIndex > -1 && toIndex > -1) {
            list.splice(fromIndex, 1);
            list.splice(toIndex, 0, draggedColumnKey);
            
            setVisibleFields(visibleFields);
            updateGrid();
        }
    }
};

export const handleMouseMove = (e) => {
    if (!isResizing || resizeTick) return;
    
    resizeTick = true;
    requestAnimationFrame(() => {
        const diff = e.pageX - startX;
        const newWidth = Math.max(40, startWidth + diff);
        
        const visibleFields = getVisibleFields();
        visibleFields.columnWidths[currentResizerKey] = `${newWidth}px`;
        
        const grid = document.getElementById('collection-grid');
        if (grid) {
            grid.style.setProperty(`--col-width-${currentResizerKey}`, `${newWidth}px`);
        }
        resizeTick = false;
    });
};

export const handleMouseUp = () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.cursor = '';
    if (headerEl) headerEl.style.borderRight = '';
    
    // Save state when resizing ends
    const visibleFields = getVisibleFields();
    setVisibleFields(visibleFields);

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
};

export const handleMouseDown = (e) => {
    const resizer = e.target.closest('.col-resizer');
    if (resizer) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        currentResizerKey = resizer.dataset.key;
        startX = e.pageX;
        headerEl = resizer.parentElement;
        startWidth = headerEl.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        headerEl.style.borderRight = '2px solid var(--primary-color)';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
};
