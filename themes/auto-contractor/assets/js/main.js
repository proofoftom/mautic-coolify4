/**
 * Auto-Contractor Theme - Main JavaScript
 * Handles sticky header, smooth scrolling, and click-to-call tracking
 */

(function() {
    'use strict';

    // Sticky header behavior
    function initStickyHeader() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScroll = 0;

        window.addEventListener('scroll', function() {
            const currentScroll = window.scrollY;

            if (currentScroll > 100) {
                header.classList.add('header-scrolled');
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                header.style.padding = '10px 0';
            } else {
                header.classList.remove('header-scrolled');
                header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                header.style.padding = '';
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    // Smooth scroll for anchor links
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#' || href === '#!') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Click-to-call tracking (if Mautic tracking is present)
    function initClickToCallTracking() {
        document.querySelectorAll('a[href^="tel:"]').forEach(function(link) {
            link.addEventListener('click', function() {
                // Track with Mautic if available
                if (typeof mt !== 'undefined' && mt !== null) {
                    mt('send', 'pageview', { 'page_title': 'Phone Click' });
                }

                // Also try common tracking functions
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'click', { 'event_category': 'Contact', 'event_label': 'Phone Call' });
                }
                if (typeof fbq !== 'undefined') {
                    fbq('trackCustom', 'ContactPhone');
                }
            });
        });
    }

    // Form engagement tracking
    function initFormTracking() {
        const forms = document.querySelectorAll('.mauticform_wrapper');
        if (forms.length === 0) return;

        forms.forEach(function(form) {
            // Track when user focuses on first input
            const firstInput = form.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.addEventListener('focus', function() {
                    if (typeof mt !== 'undefined' && mt !== null) {
                        mt('send', 'pageview', { 'page_title': 'Form Engagement' });
                    }
                }, { once: true });
            }
        });
    }

    // Add animation on scroll for cards
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe service cards and testimonials
        var cards = document.querySelectorAll('.service-card, .testimonial-card, .about-content, .contact-info-item');
        cards.forEach(function(card) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }

    // Add hover effect to service icons
    function initServiceIconAnimations() {
        var icons = document.querySelectorAll('.service-icon');
        icons.forEach(function(icon) {
            icon.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.1) rotate(5deg)';
            });
            icon.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        });
    }

    // Trust badge counter animation
    function initCounterAnimation() {
        var counters = document.querySelectorAll('.trust-number');
        if (counters.length === 0) return;

        var observerOptions = {
            threshold: 0.5
        };

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    entry.target.classList.add('counted');
                    animateCounter(entry.target);
                }
            });
        }, observerOptions);

        counters.forEach(function(counter) {
            observer.observe(counter);
        });
    }

    function animateCounter(element) {
        var text = element.textContent;
        var hasPlus = text.includes('+');
        var hasPercent = text.includes('%');
        var targetValue = parseInt(text.replace(/[^0-9]/g, ''));

        if (isNaN(targetValue)) return;

        var duration = 1500;
        var startTime = null;

        function updateCounter(currentTime) {
            if (!startTime) startTime = currentTime;
            var elapsed = currentTime - startTime;
            var progress = Math.min(elapsed / duration, 1);

            // Easing function
            var easeOutQuart = 1 - Math.pow(1 - progress, 4);
            var current = Math.floor(easeOutQuart * targetValue);

            var display = current.toString();
            if (hasPlus) display += '+';
            if (hasPercent) display += '%';
            element.textContent = display;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = text;
            }
        }

        requestAnimationFrame(updateCounter);
    }

    // Initialize all features when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    function initAll() {
        initStickyHeader();
        initSmoothScroll();
        initClickToCallTracking();
        initFormTracking();
        initScrollAnimations();
        initServiceIconAnimations();
        initCounterAnimation();
    }

})();
