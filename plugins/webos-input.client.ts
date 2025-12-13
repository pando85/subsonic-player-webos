/**
 * webOS TV Remote Control & DPAD Navigation Plugin
 *
 * This plugin provides TV-friendly navigation using the remote control's
 * directional pad (DPAD) and action buttons. It's automatically enabled
 * when running on webOS TV.
 *
 * Features:
 * - Arrow key navigation (up/down/left/right)
 * - Enter key for activation
 * - Back button support
 * - Spatial navigation between focusable elements
 * - Automatic focus highlighting
 */

export default defineNuxtPlugin((nuxtApp) => {
  // Only enable on webOS TV
  if (typeof window === 'undefined' || !('webOS' in window)) {
    return;
  }

  console.log('[webOS] TV input plugin enabled');

  // Track currently focused element
  let currentFocusIndex = 0;
  let focusableElements: Element[] = [];

  /**
   * Get all focusable elements on the page
   */
  function getFocusableElements(): Element[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '.focusable', // Allow custom focusable elements
    ].join(',');

    return Array.from(document.querySelectorAll(selectors)).filter((el) => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  /**
   * Update the list of focusable elements
   */
  function updateFocusableElements() {
    focusableElements = getFocusableElements();

    // Ensure current focus index is valid
    if (currentFocusIndex >= focusableElements.length) {
      currentFocusIndex = Math.max(0, focusableElements.length - 1);
    }
  }

  /**
   * Focus an element by index
   */
  function focusElementByIndex(index: number) {
    if (index < 0 || index >= focusableElements.length) {
      return;
    }

    const element = focusableElements[index] as HTMLElement;

    // Scroll element into view if needed
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    // Focus the element
    element.focus();
    currentFocusIndex = index;
  }

  /**
   * Find the nearest element in a given direction
   */
  function findNearestElementInDirection(
    direction: 'up' | 'down' | 'left' | 'right',
  ): number {
    if (focusableElements.length === 0) return -1;

    const currentElement = focusableElements[currentFocusIndex];
    if (!currentElement) return 0;

    const currentRect = currentElement.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    let bestIndex = -1;
    let bestDistance = Infinity;

    focusableElements.forEach((element, index) => {
      if (index === currentFocusIndex) return;

      const rect = element.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      // Check if element is in the correct direction
      let isInDirection = false;
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      switch (direction) {
        case 'up':
          isInDirection = dy < -10; // At least 10px above
          break;
        case 'down':
          isInDirection = dy > 10; // At least 10px below
          break;
        case 'left':
          isInDirection = dx < -10; // At least 10px to the left
          break;
        case 'right':
          isInDirection = dx > 10; // At least 10px to the right
          break;
      }

      if (!isInDirection) return;

      // Calculate distance (weighted by alignment)
      const distance = Math.sqrt(dx * dx + dy * dy);
      const alignment =
        direction === 'up' || direction === 'down'
          ? Math.abs(dx) // Prefer vertically aligned for up/down
          : Math.abs(dy); // Prefer horizontally aligned for left/right

      const score = distance + alignment * 0.5;

      if (score < bestDistance) {
        bestDistance = score;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  /**
   * Handle directional navigation
   */
  function handleDirection(direction: 'up' | 'down' | 'left' | 'right') {
    updateFocusableElements();

    const nearestIndex = findNearestElementInDirection(direction);

    if (nearestIndex >= 0) {
      focusElementByIndex(nearestIndex);
    } else {
      // Fallback to simple next/previous
      let newIndex = currentFocusIndex;
      if (direction === 'down' || direction === 'right') {
        newIndex = (currentFocusIndex + 1) % focusableElements.length;
      } else if (direction === 'up' || direction === 'left') {
        newIndex = currentFocusIndex - 1;
        if (newIndex < 0) newIndex = focusableElements.length - 1;
      }
      focusElementByIndex(newIndex);
    }
  }

  /**
   * Handle key press events
   */
  function handleKeyDown(event: KeyboardEvent) {
    // Update focusable elements on each interaction
    updateFocusableElements();

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        handleDirection('up');
        break;

      case 'ArrowDown':
        event.preventDefault();
        handleDirection('down');
        break;

      case 'ArrowLeft':
        event.preventDefault();
        handleDirection('left');
        break;

      case 'ArrowRight':
        event.preventDefault();
        handleDirection('right');
        break;

      case 'Enter':
        // Let the focused element handle Enter
        // Don't prevent default to allow normal form submission etc.
        if (document.activeElement) {
          (document.activeElement as HTMLElement).click?.();
        }
        break;

      case 'Escape':
      case 'Backspace':
        // Handle back button
        event.preventDefault();
        if (window.history.length > 1) {
          window.history.back();
        }
        break;
    }
  }

  /**
   * Initialize focus on first focusable element
   */
  function initializeFocus() {
    updateFocusableElements();

    // Focus first element if nothing is focused
    if (!document.activeElement || document.activeElement === document.body) {
      if (focusableElements.length > 0) {
        focusElementByIndex(0);
      }
    } else {
      // Find current focus in the list
      const activeIndex = focusableElements.indexOf(document.activeElement);
      if (activeIndex >= 0) {
        currentFocusIndex = activeIndex;
      }
    }
  }

  // Add keyboard event listener
  window.addEventListener('keydown', handleKeyDown);

  // Initialize focus after a short delay to ensure DOM is ready
  setTimeout(initializeFocus, 100);

  // Re-initialize when route changes (for Nuxt router)
  nuxtApp.hook('page:finish', () => {
    setTimeout(initializeFocus, 100);
  });

  // Re-scan focusable elements when DOM changes
  const observer = new MutationObserver(() => {
    // Debounce updates
    setTimeout(updateFocusableElements, 50);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('[webOS] TV input plugin initialized');
});
