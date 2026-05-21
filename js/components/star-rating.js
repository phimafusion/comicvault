export function initStarRating(currentValue) {
    const starRatingContainer = document.querySelector('.star-rating');
    if (!starRatingContainer) return;

    const stars = starRatingContainer.querySelectorAll('.star');
    const input = document.querySelector('input[name="bewertung"]');
    
    const updateStarsUI = (val) => {
        stars.forEach(star => {
            const index = parseInt(star.dataset.index);
            star.classList.remove('full', 'half');
            star.querySelector('i').className = 'fa-regular fa-star';
            
            if (val >= index * 2) {
                star.classList.add('full');
                star.querySelector('i').className = 'fa-solid fa-star';
            } else if (val === index * 2 - 1) {
                star.classList.add('half');
                star.querySelector('i').className = 'fa-regular fa-star'; // CSS handles the half star
            } else {
                star.querySelector('i').style.opacity = '0.3';
            }
            
            if (val >= index * 2 - 1) {
                star.querySelector('i').style.opacity = '1';
            }
        });
    };

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const index = parseInt(star.dataset.index);
            let newVal;
            const currentVal = parseInt(input.value) || 0;
            
            if (currentVal === index * 2) {
                newVal = index * 2 - 1; // Halber Stern
            } else {
                newVal = index * 2; // Ganzer Stern
            }
            
            input.value = newVal;
            updateStarsUI(newVal);
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });
    
    document.getElementById('btn-clear-rating')?.addEventListener('click', (e) => {
        e.preventDefault();
        input.value = 0;
        updateStarsUI(0);
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    updateStarsUI(currentValue);
}
