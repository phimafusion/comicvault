export function initAutocomplete(input, suggestionsList) {
    if (!input || !suggestionsList || suggestionsList.length === 0) return;

    // Browser-eigenes Autocomplete deaktivieren, um doppelte Overlays zu verhindern
    input.setAttribute('autocomplete', 'off');

    let activeIndex = -1;
    let dropdown = null;
    let isSelecting = false;

    const removeDropdown = () => {
        if (dropdown) {
            dropdown.remove();
            dropdown = null;
        }
        activeIndex = -1;
    };

    const renderDropdown = (items) => {
        removeDropdown();
        if (items.length === 0) return;

        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';

        items.forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'autocomplete-item';
            itemDiv.textContent = item;
            
            itemDiv.addEventListener('mousedown', (e) => {
                // Prevent input blur before click finishes
                e.preventDefault();
                isSelecting = true;
                input.value = item;
                removeDropdown();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                isSelecting = false;
            });

            dropdown.appendChild(itemDiv);
        });

        // Append to parent form-group
        input.parentNode.appendChild(dropdown);
    };

    const updateSelection = () => {
        if (!dropdown) return;
        const items = dropdown.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            if (index === activeIndex) {
                item.classList.add('active');
                // Scroll into view if needed
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    };

    const handleInput = () => {
        if (isSelecting) return;
        const val = input.value.trim().toLowerCase();
        if (!val) {
            renderDropdown(suggestionsList);
            return;
        }

        const filtered = suggestionsList.filter(item => 
            item.toLowerCase().includes(val)
        );

        renderDropdown(filtered);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleInput);

    input.addEventListener('blur', () => {
        // We use setTimeout so mousedown events on items can fire first
        setTimeout(removeDropdown, 200);
    });

    input.addEventListener('keydown', (e) => {
        if (!dropdown) return;
        const items = dropdown.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateSelection();
        } else if (e.key === 'Enter') {
            if (activeIndex > -1 && items[activeIndex]) {
                e.preventDefault();
                isSelecting = true;
                input.value = items[activeIndex].textContent;
                removeDropdown();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                isSelecting = false;
            }
        } else if (e.key === 'Escape') {
            removeDropdown();
        }
    });
}
