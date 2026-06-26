/* =========================================================
   K-MEANS SKILLS CLUSTER ANIMATION
   Adds subtle JavaScript motion to the Skills section.

   What CSS still controls:
   - skill ball colors
   - skill ball sizes
   - starting left/top positions
   - centroid positions
   - background image and grid

   What this JS controls:
   - gentle drift around each skill's CSS position
   - subtle mouse interaction
   - pausing for reduced-motion users
   - disabling animation on mobile layout
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       MAIN MOTION CONTROLS
       Tune these numbers when you want more/less movement.
       ===================================================== */

    const CLUSTER_SETTINGS = {
        /* Only animate on desktop/tablet-wide screens.
           Your CSS changes the Skills section into a wrapped layout below 1000px. */
        desktopQuery: "(min-width: 1001px)",

        /* Base drift distance in pixels.
           Increase for more visible movement.
           Recommended range: 6 to 16. */
        driftRadius: 10,

        /* Adds natural variation so every ball does not move the same way.
           Recommended range: 2 to 8. */
        driftVariation: 5,

        /* Movement speed.
           Lower = calmer. Higher = more active.
           Recommended range: 0.35 to 0.95. */
        speedBase: 0.58,

        /* Speed variation between skill balls.
           Recommended range: 0.15 to 0.45. */
        speedVariation: 0.28,

        /* How far the mouse influence reaches, in pixels.
           Recommended range: 140 to 260. */
        mouseInfluenceRadius: 210,

        /* How strongly skill balls move away from the mouse.
           Recommended range: 8 to 24. */
        mousePushStrength: 16,

        /* Slight scale when hovering directly over a skill.
           Recommended range: 1.02 to 1.08. */
        hoverScale: 1.045,

        /* Number of decimals used when updating movement values. */
        precision: 2
    };

    const skillsMap = document.querySelector(".skills-cluster-map");

    if (!skillsMap) {
        return;
    }

    const skillBalls = Array.from(skillsMap.querySelectorAll(".cluster-skill"));

    if (!skillBalls.length) {
        return;
    }

    const desktopMedia = window.matchMedia(CLUSTER_SETTINGS.desktopQuery);
    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    let animationFrameId = null;

    const pointer = {
        active: false,
        x: 0,
        y: 0
    };

    /* Creates stable variation per skill using its text and index.
       This keeps the motion consistent on every page load. */
    function createSeed(text, index) {
        let seed = index * 97;

        for (let i = 0; i < text.length; i += 1) {
            seed += text.charCodeAt(i) * (i + 1);
        }

        return seed;
    }

    function getSkillSizeMultiplier(skill) {
        if (skill.classList.contains("skill-lg")) {
            return 1.15;
        }

        if (skill.classList.contains("skill-sm")) {
            return 0.78;
        }

        return 1;
    }

    function createSkillState(skill, index) {
        const text = skill.textContent.trim();
        const seed = createSeed(text, index);
        const sizeMultiplier = getSkillSizeMultiplier(skill);

        const radius =
            (CLUSTER_SETTINGS.driftRadius +
                (seed % CLUSTER_SETTINGS.driftVariation)) *
            sizeMultiplier;

        const speed =
            CLUSTER_SETTINGS.speedBase +
            ((seed % 11) / 10) * CLUSTER_SETTINGS.speedVariation;

        return {
            element: skill,
            phase: seed * 0.017,
            radiusX: radius,
            radiusY: radius * (0.62 + ((seed % 5) * 0.08)),
            speed
        };
    }

    const skillStates = skillBalls.map(createSkillState);

    function shouldAnimate() {
        return desktopMedia.matches && !reducedMotionMedia.matches;
    }

    function resetSkillMotion() {
        skillBalls.forEach((skill) => {
            skill.style.removeProperty("--skill-js-x");
            skill.style.removeProperty("--skill-js-y");
            skill.style.removeProperty("--skill-js-scale");
        });
    }

    function stopAnimation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        skillsMap.classList.remove("skills-js-enabled");
        resetSkillMotion();
    }

    function updatePointerPosition(event) {
        const mapRect = skillsMap.getBoundingClientRect();

        pointer.active = true;
        pointer.x = event.clientX - mapRect.left;
        pointer.y = event.clientY - mapRect.top;
    }

    function clearPointerPosition() {
        pointer.active = false;
    }

    function animateSkills(timestamp) {
        if (!shouldAnimate()) {
            stopAnimation();
            return;
        }

        const time = timestamp / 1000;

        skillStates.forEach((state) => {
            const skill = state.element;

            const baseCenterX = skill.offsetLeft + skill.offsetWidth / 2;
            const baseCenterY = skill.offsetTop + skill.offsetHeight / 2;

            const driftX = Math.cos(time * state.speed + state.phase) * state.radiusX;
            const driftY =
                Math.sin(time * state.speed * 0.82 + state.phase * 0.7) *
                state.radiusY;

            let mouseX = 0;
            let mouseY = 0;

            if (pointer.active) {
                const distanceX = baseCenterX - pointer.x;
                const distanceY = baseCenterY - pointer.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY) || 1;

                if (distance < CLUSTER_SETTINGS.mouseInfluenceRadius) {
                    const influence =
                        1 - distance / CLUSTER_SETTINGS.mouseInfluenceRadius;

                    const push =
                        influence *
                        influence *
                        CLUSTER_SETTINGS.mousePushStrength;

                    mouseX = (distanceX / distance) * push;
                    mouseY = (distanceY / distance) * push;
                }
            }

            const scale = skill.matches(":hover")
                ? CLUSTER_SETTINGS.hoverScale
                : 1;

            skill.style.setProperty(
                "--skill-js-x",
                `${(driftX + mouseX).toFixed(CLUSTER_SETTINGS.precision)}px`
            );

            skill.style.setProperty(
                "--skill-js-y",
                `${(driftY + mouseY).toFixed(CLUSTER_SETTINGS.precision)}px`
            );

            skill.style.setProperty(
                "--skill-js-scale",
                scale.toFixed(3)
            );
        });

        animationFrameId = requestAnimationFrame(animateSkills);
    }

    function startAnimation() {
        if (!shouldAnimate()) {
            stopAnimation();
            return;
        }

        if (animationFrameId) {
            return;
        }

        skillsMap.classList.add("skills-js-enabled");
        animationFrameId = requestAnimationFrame(animateSkills);
    }

    function restartAnimation() {
        stopAnimation();
        startAnimation();
    }

    skillsMap.addEventListener("pointermove", updatePointerPosition);
    skillsMap.addEventListener("pointerleave", clearPointerPosition);

    window.addEventListener("resize", restartAnimation);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopAnimation();
        } else {
            startAnimation();
        }
    });

    if (typeof desktopMedia.addEventListener === "function") {
        desktopMedia.addEventListener("change", restartAnimation);
        reducedMotionMedia.addEventListener("change", restartAnimation);
    } else {
        desktopMedia.addListener(restartAnimation);
        reducedMotionMedia.addListener(restartAnimation);
    }

    startAnimation();
})();