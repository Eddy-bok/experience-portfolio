document.addEventListener("DOMContentLoaded", () => {
    const countElements = document.querySelectorAll(".ariel-count-up");

    if (!countElements.length) {
        return;
    }

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    function formatCount(value, decimals, suffix) {
        return `${value.toFixed(decimals)}${suffix}`;
    }

    function animateCount(element) {
        const start = Number(element.dataset.countStart || 1);
        const target = Number(element.dataset.countTarget || 0);
        const decimals = Number(element.dataset.countDecimals || 0);
        const suffix = element.dataset.countSuffix || "";
        const duration = 6200;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = start + (target - start) * easedProgress;

            element.textContent = formatCount(currentValue, decimals, suffix);

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = formatCount(target, decimals, suffix);
            }
        }

        requestAnimationFrame(update);
    }

    function setFinalValue(element) {
        const target = Number(element.dataset.countTarget || 0);
        const decimals = Number(element.dataset.countDecimals || 0);
        const suffix = element.dataset.countSuffix || "";

        element.textContent = formatCount(target, decimals, suffix);
    }

    if (prefersReducedMotion) {
        countElements.forEach(setFinalValue);
        return;
    }

    const observer = new IntersectionObserver(
        (entries, activeObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                animateCount(entry.target);
                activeObserver.unobserve(entry.target);
            });
        },
        {
            threshold: 0.45
        }
    );

    countElements.forEach((element) => {
        observer.observe(element);
    });
});