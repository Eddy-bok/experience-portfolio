(function () {
    const counters = document.querySelectorAll(".resource-metric-count[data-resource-target]");

    if (!counters.length) {
        return;
    }

    const easeOutCubic = function (progress) {
        return 1 - Math.pow(1 - progress, 3);
    };

    const animateCounter = function (counter) {
        const target = Number(counter.dataset.resourceTarget);

        if (!Number.isFinite(target)) {
            return;
        }

        const duration = 4400;
        const startTime = performance.now();

        counter.classList.add("is-counting");

        const update = function (currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const currentValue = Math.round(target * easedProgress);

            counter.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counter.textContent = target.toLocaleString();
                counter.classList.remove("is-counting");
                counter.classList.add("has-counted");
            }
        };

        requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
        function (entries, activeObserver) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }

                const counter = entry.target;

                if (counter.dataset.resourceAnimated === "true") {
                    return;
                }

                counter.dataset.resourceAnimated = "true";
                animateCounter(counter);
                activeObserver.unobserve(counter);
            });
        },
        {
            threshold: 0.45
        }
    );

    counters.forEach(function (counter) {
        observer.observe(counter);
    });
})();