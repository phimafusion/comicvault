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

export function autoFitColumn(columnKey, save = true) {
    const header = document.querySelector(`.sortable-header[data-sort="${columnKey}"]`);
    const cells = document.querySelectorAll(`[data-col="${columnKey}"]`);
    
    let headerWidth = 0;
    if (header) {
        const clone = header.cloneNode(true);
        const resizer = clone.querySelector('.col-resizer');
        if (resizer) resizer.remove();
        
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.width = 'auto';
        clone.style.whiteSpace = 'nowrap';
        clone.style.fontFamily = 'var(--font-primary), sans-serif';
        clone.style.fontSize = '0.7rem';
        clone.style.fontWeight = 'bold';
        clone.style.textTransform = 'uppercase';
        clone.style.letterSpacing = '0.5px';
        
        document.body.appendChild(clone);
        headerWidth = clone.offsetWidth;
        clone.remove();
    }
    
    let cellMaxWidth = 0;
    if (cells.length > 0) {
        const measureContainer = document.createElement('div');
        measureContainer.className = 'list-item';
        measureContainer.style.position = 'absolute';
        measureContainer.style.visibility = 'hidden';
        measureContainer.style.width = 'max-content';
        measureContainer.style.top = '-9999px';
        measureContainer.style.display = 'block';
        document.body.appendChild(measureContainer);
        
        const clones = Array.from(cells).map(cell => {
            const clone = cell.cloneNode(true);
            clone.style.width = 'max-content';
            clone.style.display = 'block';
            measureContainer.appendChild(clone);
            return clone;
        });
        
        clones.forEach(clone => {
            cellMaxWidth = Math.max(cellMaxWidth, clone.offsetWidth);
        });
        
        measureContainer.remove();
    }
    
    const calculatedWidth = Math.max(headerWidth, cellMaxWidth);
    const finalWidth = Math.min(450, Math.max(60, calculatedWidth + 16));
    
    if (save) {
        const visibleFields = getVisibleFields();
        visibleFields.columnWidths[columnKey] = `${finalWidth}px`;
        setVisibleFields(visibleFields);
    }
    
    const grid = document.getElementById('collection-grid');
    if (grid) {
        grid.style.setProperty(`--col-width-${columnKey}`, `${finalWidth}px`);
    }
}

export const handleDblClick = (e) => {
    const resizer = e.target.closest('.col-resizer');
    if (resizer) {
        e.preventDefault();
        e.stopPropagation();
        const key = resizer.dataset.key;
        autoFitColumn(key, true);
    }
};
