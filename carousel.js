(function () {
  function getCarouselItems(track) {
    return Array.from(track.children);
  }

  function clampIndex(index, items) {
    return Math.max(0, Math.min(index, items.length - 1));
  }

  function getScrollTarget(track, item) {
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    return Math.min(item.offsetLeft, maxScrollLeft);
  }

  function setActiveItem(track, items, index, shouldScroll) {
    const activeIndex = clampIndex(index, items);

    items.forEach(function (item, itemIndex) {
      item.classList.toggle("is-active", itemIndex === activeIndex);
    });

    if (shouldScroll) {
      track.scrollTo({
        left: getScrollTarget(track, items[activeIndex]),
        behavior: "smooth"
      });
    }

    return activeIndex;
  }

  function setupCarousel(carousel) {
    const track = carousel.querySelector("[data-carousel-track]");
    const previousButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");

    if (!track || !previousButton || !nextButton) {
      return;
    }

    const items = getCarouselItems(track);

    if (!items.length) {
      return;
    }

    let activeIndex = setActiveItem(track, items, 0, false);

    previousButton.addEventListener("click", function () {
      activeIndex = setActiveItem(track, items, activeIndex - 1, true);
    });

    nextButton.addEventListener("click", function () {
      activeIndex = setActiveItem(track, items, activeIndex + 1, true);
    });
  }

  document.querySelectorAll("[data-carousel]").forEach(setupCarousel);
})();