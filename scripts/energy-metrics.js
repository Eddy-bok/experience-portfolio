(function () {
    const counters = document.querySelectorAll(".energy-money-count[data-energy-target]");

    if (!counters.length) {
        return;
    }

    const formatMoney = function (value) {
        if (value >= 1000000) {
            const millions = value / 1000000;
            return "$" + millions.toFixed(1).replace(".0", "") + "M";
        }

        return "$" + Math.round(value / 1000) + "K";
    };

    const animateCounter = function (counter) {
        const start = Number(counter.dataset.energyStart);
        const target = Number(counter.dataset.energyTarget);
        const step = Number(counter.dataset.energyStep);

        if (!Number.isFinite(start) || !Number.isFinite(target) || !Number.isFinite(step) || step <= 0) {
            counter.textContent = "$1.7M";
            return;
        }

        let current = start;

        counter.classList.add("is-counting");
        counter.textContent = formatMoney(current);

        const interval = window.setInterval(function () {
            current += step;

            if (current >= target) {
                current = target;
                counter.textContent = formatMoney(current);
                counter.classList.remove("is-counting");
                counter.classList.add("has-counted");
                window.clearInterval(interval);
                return;
            }

            counter.textContent = formatMoney(current);
        }, 180);
    };

    const observer = new IntersectionObserver(
        function (entries, activeObserver) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }

                const counter = entry.target;

                if (counter.dataset.energyAnimated === "true") {
                    return;
                }

                counter.dataset.energyAnimated = "true";
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