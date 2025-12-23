document.addEventListener('DOMContentLoaded', function () {
    // 1. Create Lightbox Elements
    const lightboxOverlay = document.createElement('div');
    lightboxOverlay.className = 'lightbox-overlay';

    const lightboxImage = document.createElement('img');
    lightboxImage.className = 'lightbox-image';

    // Add accessibility
    lightboxImage.alt = 'Enlarged view';

    const lightboxClose = document.createElement('div');
    lightboxClose.className = 'lightbox-close';
    lightboxClose.innerHTML = '&times;'; // HTML entity for multiplication sign (X)

    // Assemble
    lightboxOverlay.appendChild(lightboxImage);
    lightboxOverlay.appendChild(lightboxClose);
    document.body.appendChild(lightboxOverlay);

    // 2. Select all images in article content AND the hero image
    const articleImages = document.querySelectorAll('.article-content img, .detail-hero-image');

    // 3. Add click event to each image
    articleImages.forEach(img => {
        img.addEventListener('click', function () {
            const src = this.getAttribute('src');
            if (src) {
                lightboxImage.src = src;
                lightboxOverlay.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            }
        });
    });

    // 4. Close functions
    function closeLightbox() {
        lightboxOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        setTimeout(() => {
            lightboxImage.src = ''; // Clear source after transition
        }, 300);
    }

    // Close on click overlay background (but not image)
    lightboxOverlay.addEventListener('click', function (e) {
        if (e.target === lightboxOverlay) {
            closeLightbox();
        }
    });

    // Close on close button
    lightboxClose.addEventListener('click', closeLightbox);

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) {
            closeLightbox();
        }
    });
});
