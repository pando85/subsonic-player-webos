/**
 * webOS TV Remote Control & DPAD Navigation Plugin
 *
 * This plugin provides TV-friendly navigation using the remote control's
 * directional pad (DPAD) and action buttons.
 *
 * Features:
 * - Arrow key navigation (up/down/left/right)
 * - Enter/OK key for activation
 * - Back button support (webOS key code 461)
 * - Spatial navigation between focusable elements
 * - Only active on webOS (file:// protocol)
 */

export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if we're on webOS (file:// protocol)
  const isWebOS = window.location.protocol === 'file:';

  // Only activate for webOS TV environment
  if (!isWebOS) {
    return;
  }

  // Check if we're on a file system path and need to redirect
  const currentPath = window.location.pathname;
  if (currentPath.includes('/media/')) {
    const router = useRouter();
    router.replace('/');
  }

  // Add webosTV class to body for TV-specific CSS styles
  document.body.classList.add('webosTV');

  // Setup search input toggle behavior for TV (with retry logic)
  const setupSearchToggle = () => {
    let searchExpanded = false;
    let isProcessing = false; // Prevent double-click

    // Find search input first, then traverse to form (avoid :has() selector)
    const searchInput = document.getElementById(
      'search-input',
    ) as HTMLInputElement;
    const searchForm = searchInput?.closest('form') as HTMLFormElement;
    const searchWrapper = searchInput?.parentElement as HTMLElement;
    const searchButton = searchForm?.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    if (!searchForm || !searchInput || !searchButton || !searchWrapper) {
      // Retry after DOM is ready
      setTimeout(setupSearchToggle, 500);
      return;
    }

    // Add a custom class to the wrapper for targeting with CSS
    searchWrapper.classList.add('webos-search-wrapper');

    console.log('[webOS Search] Setup complete', {
      searchButton,
      searchForm,
      searchInput,
      searchWrapper,
    });

    // Handle search button click with debounce
    searchButton.addEventListener('click', (evt) => {
      // Prevent double-firing from TV remote
      if (isProcessing) {
        evt.preventDefault();
        console.log('[webOS Search] Ignoring duplicate click');
        return;
      }

      console.log('[webOS Search] Button clicked, expanded:', searchExpanded);

      if (!searchExpanded) {
        // Expand search input
        evt.preventDefault();
        isProcessing = true;
        searchExpanded = true;
        searchForm.classList.add('searchExpanded');
        console.log(
          '[webOS Search] Expanding search, classes:',
          searchForm.className,
        );

        // Small delay before allowing next action and focusing
        setTimeout(() => {
          searchInput.focus();
          searchInput.select();
          isProcessing = false;
        }, 100);
      } else {
        // If expanded, let the form submit normally (search)
        console.log(
          '[webOS Search] Submitting search with value:',
          searchInput.value,
        );
        // Don't prevent default - let form submit
      }
    });

    // Handle focus loss to collapse search
    searchInput.addEventListener('blur', () => {
      if (searchExpanded) {
        console.log('[webOS Search] Input lost focus, collapsing');
        searchExpanded = false;
        searchForm.classList.remove('searchExpanded');
      }
    });

    // Keep search button from triggering blur when clicking it
    searchButton.addEventListener('mousedown', (evt) => {
      if (searchExpanded) {
        evt.preventDefault(); // Prevent blur
      }
    });
  };

  setupSearchToggle();

  // Force tablet responsive design by setting viewport to tablet width
  // This triggers CSS media queries like @media (width >= 769px) for --tablet-up
  // but we disable hover effects via CSS since TV has no mouse
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=1024, initial-scale=1');
  }

  /**
   * Check if we're on an individual album/artist/playlist detail page
   * vs a list/discovery view
   */
  function isOnDetailPage(): boolean {
    const path = window.location.pathname;
    // Individual detail pages (not plural)
    return (
      path.startsWith('/album/') ||
      path.startsWith('/artist/') ||
      path.startsWith('/playlist/') ||
      path.startsWith('/podcast/')
    );
  }

  /**
   * Check if an element should be skipped for TV navigation
   * We skip links inside layoutContent (album titles, artist names)
   * to allow jumping directly between album images
   */
  function shouldSkipElement(element: Element): boolean {
    // On detail pages, allow all buttons (Play All, Shuffle, etc.)
    // On list/discovery pages, skip buttons inside album items
    const isDetailPage = isOnDetailPage();

    // Skip links/buttons inside layoutContent (album title, artist links)
    const layoutContent = element.closest('.layoutContent');
    if (layoutContent) {
      return true;
    }

    // Skip elements inside hidden action buttons (play/favourite on album hover)
    // These are the buttons that appear on hover in the album grid
    const actions = element.closest('[class*="actions"]');
    if (actions) {
      return true;
    }

    // On list/discovery pages (albums, artists, etc.), skip all buttons
    // inside layoutItem to only focus on images
    if (!isDetailPage) {
      const layoutItem = element.closest('.layoutItem');
      if (
        layoutItem &&
        (element.tagName === 'BUTTON' || element.tagName === 'A')
      ) {
        // Allow the main image link
        const isImageLink = element.closest('.layoutImage');
        if (!isImageLink) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if an element is visible
   */
  function isVisible(element: Element): boolean {
    if (!element) return false;
    const el = element as HTMLElement;

    // Check if element or its parent has dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return true;
    }

    // Fallback to offset dimensions
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      return true;
    }

    // For anchor tags, check if they have visible children
    if (el.tagName === 'A') {
      const firstChild = el.firstElementChild;
      if (firstChild) {
        const childRect = firstChild.getBoundingClientRect();
        return childRect.width > 0 && childRect.height > 0;
      }
    }

    return false;
  }

  /**
   * Get all focusable elements on the page
   */
  function getFocusableElements(): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]',
      '.focusable',
    ].join(',');

    const elements = document.querySelectorAll(selectors);
    const filtered = Array.from(elements).filter(
      (el) => isVisible(el) && !shouldSkipElement(el),
    ) as HTMLElement[];

    // Log page navigation elements specifically
    const pageLinks = filtered.filter((el) =>
      el.classList.contains('pageLink'),
    );
    if (pageLinks.length > 0) {
      console.log(
        '[webOS Navigation] Page navigation links found:',
        pageLinks.length,
      );
    }

    return filtered;
  }

  /**
   * Find the index of the current element in the focusable list
   */
  function findCurrentIndex(
    allElements: HTMLElement[],
    currentNode: Element | null,
  ): number {
    if (!currentNode) return -1;
    for (let i = 0; i < allElements.length; i++) {
      if (currentNode.isEqualNode(allElements[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get element's center position
   */
  function getElementCenter(el: HTMLElement): { x: number; y: number } {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  /**
   * Navigate to the nearest element in a direction
   */
  function navigateSpatial(
    direction: 'down' | 'left' | 'right' | 'up',
  ): boolean {
    const allElements = getFocusableElements();
    if (allElements.length === 0) return false;

    const currentElement = document.activeElement as HTMLElement;

    // If no element is focused or body is focused, focus the first element
    if (
      !currentElement ||
      currentElement === document.body ||
      !isVisible(currentElement)
    ) {
      navigationInit();
      return true;
    }

    const currentCenter = getElementCenter(currentElement);
    let bestElement: HTMLElement | null = null;
    let bestScore = Infinity;

    for (const element of allElements) {
      if (element === currentElement) continue;

      const center = getElementCenter(element);
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      // Check if element is in the correct direction
      let isInDirection = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;

      switch (direction) {
        case 'down':
          isInDirection = dy > 5;
          primaryDistance = Math.abs(dy);
          secondaryDistance = Math.abs(dx);
          break;
        case 'left':
          isInDirection = dx < -5;
          primaryDistance = Math.abs(dx);
          secondaryDistance = Math.abs(dy);
          break;
        case 'right':
          isInDirection = dx > 5;
          primaryDistance = Math.abs(dx);
          secondaryDistance = Math.abs(dy);
          break;
        case 'up':
          isInDirection = dy < -5;
          primaryDistance = Math.abs(dy);
          secondaryDistance = Math.abs(dx);
          break;
      }

      if (!isInDirection) continue;

      let score;
      if (direction === 'left' || direction === 'right') {
        // Horizontal navigation: prioritize horizontal alignment
        score = primaryDistance + secondaryDistance * 30;
      } else {
        // Vertical navigation: prioritize vertical alignment
        score = primaryDistance + secondaryDistance * 3;
      }

      if (score < bestScore) {
        bestScore = score;
        bestElement = element;
      }
    }

    if (bestElement) {
      console.log('[webOS Navigation] Focusing element:', {
        classes: bestElement.className,
        id: bestElement.id,
        tag: bestElement.tagName,
        text: bestElement.textContent?.substring(0, 50),
      });
      bestElement.focus();
      bestElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
      return true;
    }

    return false;
  }

  /**
   * Simple linear navigation (fallback)
   */
  function navigateLinear(amount: number): void {
    const allElements = getFocusableElements();

    if (allElements.length === 0) return;

    const currentElement = document.activeElement;

    if (
      !currentElement ||
      currentElement === document.body ||
      !isVisible(currentElement)
    ) {
      navigationInit();
      return;
    }

    const currentIndex = findCurrentIndex(allElements, currentElement);
    let newIndex = currentIndex + amount;

    // Wrap around
    if (newIndex < 0) newIndex = allElements.length - 1;
    if (newIndex >= allElements.length) newIndex = 0;

    if (allElements[newIndex]) {
      allElements[newIndex].focus();
      allElements[newIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }

  /**
   * Handle arrow key navigation
   */
  function handleArrowUp(): void {
    if (!navigateSpatial('up')) {
      navigateLinear(-1);
    }
  }

  function handleArrowDown(): void {
    if (!navigateSpatial('down')) {
      navigateLinear(1);
    }
  }

  function handleArrowLeft(): void {
    if (!navigateSpatial('left')) {
      navigateLinear(-1);
    }
  }

  function handleArrowRight(): void {
    if (!navigateSpatial('right')) {
      navigateLinear(1);
    }
  }

  /**
   * Handle back button
   */
  function handleBack(): void {
    // Try to use webOS platform back if available
    if (
      'webOS' in window &&
      (window as unknown as { webOS?: { platformBack?: () => void } }).webOS
        ?.platformBack
    ) {
      (
        window as unknown as { webOS: { platformBack: () => void } }
      ).webOS.platformBack();
      return;
    }

    // Otherwise use browser history
    const router = useRouter();
    if (window.history.length > 1) {
      router.back();
    }
  }

  /**
   * Handle OK/Enter button
   */
  function handleOK(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      // For checkboxes, toggle the checked state
      if (
        activeElement instanceof HTMLInputElement &&
        activeElement.type === 'checkbox'
      ) {
        activeElement.checked = !activeElement.checked;
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      // For other elements, trigger a click
      activeElement.click();
    }
  }

  /**
   * Initialize navigation - focus the first visible focusable element
   */
  function navigationInit(): void {
    const allElements = getFocusableElements();
    const isDetailPage = isOnDetailPage();

    // On detail pages (album, artist, playlist), prioritize Play All button
    if (isDetailPage) {
      // Try to find Play All button by ID first
      const playAllButton = document.getElementById('play-all-button');
      if (playAllButton && isVisible(playAllButton)) {
        playAllButton.focus();
        return;
      }

      // Fallback: find any button with "play" in text (case insensitive)
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (
          button.textContent?.toLowerCase().includes('play') &&
          isVisible(button) &&
          !shouldSkipElement(button)
        ) {
          button.focus();
          console.log(
            '[webOS Input] Initial focus on Play button:',
            button.textContent?.trim(),
          );
          return;
        }
      }
    }

    // Try to find a good initial element to focus
    // Priority: 1) buttons with specific classes, 2) first input, 3) first focusable
    const prioritySelectors = [
      'button[type="submit"]',
      'input:not([type="hidden"])',
      'a[href]',
      'button',
    ];

    for (const selector of prioritySelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && isVisible(element)) {
        element.focus();
        console.log(
          '[webOS Input] Initial focus on:',
          element.tagName,
          element.className,
        );
        return;
      }
    }

    // Fallback to first focusable element
    if (allElements.length > 0) {
      allElements[0].focus();
    }
  }

  /**
   * Main keydown event handler
   */
  function onKeyDown(evt: KeyboardEvent): void {
    const keyCode = evt.keyCode;

    // Log for debugging

    switch (keyCode) {
      case 10009: // Samsung/Tizen Back button
      case 461: // webOS Back button
        evt.preventDefault();
        handleBack();
        break;
      case 13: // Enter/OK
        // Don't prevent default for form inputs
        if (
          !(document.activeElement instanceof HTMLInputElement) ||
          document.activeElement.type === 'checkbox'
        ) {
          evt.preventDefault();
        }
        handleOK();
        break;
      case 27: // Escape
        evt.preventDefault();
        handleBack();
        break;
      case 37: // Left Arrow
        evt.preventDefault();
        handleArrowLeft();
        break;
      case 38: // Up Arrow
        evt.preventDefault();
        handleArrowUp();
        break;
      case 39: // Right Arrow
        evt.preventDefault();
        handleArrowRight();
        break;
      case 40: // Down Arrow
        evt.preventDefault();
        handleArrowDown();
        break;
      case 8: // Backspace (as back in some contexts)
        // Only handle as back if not in an input field
        if (
          !(document.activeElement instanceof HTMLInputElement) &&
          !(document.activeElement instanceof HTMLTextAreaElement)
        ) {
          evt.preventDefault();
          handleBack();
        }
        break;
    }
  }

  // Add keydown event listener
  document.addEventListener('keydown', onKeyDown);

  // Initialize focus when page loads
  setTimeout(navigationInit, 200);

  // Re-initialize when route changes
  nuxtApp.hook('page:finish', () => {
    setTimeout(navigationInit, 200);
  });

  // Also re-initialize on page transitions
  nuxtApp.hook('page:transition:finish', () => {
    setTimeout(navigationInit, 200);
  });

  // Watch for DOM changes and re-initialize if needed
  const observer = new MutationObserver(() => {
    // Only re-focus if current focus is invalid
    const activeElement = document.activeElement;
    if (
      !activeElement ||
      activeElement === document.body ||
      !isVisible(activeElement)
    ) {
      setTimeout(navigationInit, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
});
