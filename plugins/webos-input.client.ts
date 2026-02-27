/**
 * webOS TV Remote Control & DPAD Navigation Plugin
 *
 * Refactored for TV app best practices following webOS industry standards.
 *
 * Features:
 * - Improved spatial navigation with grid-based scoring
 * - Focus history and restoration
 * - Smart scroll management
 * - Event debouncing for remote controls
 * - Proper element filtering
 */

type Direction = 'down' | 'left' | 'right' | 'up';

interface FocusHistory {
  path: string;
  elementSelector: string | null;
  timestamp: number;
}

interface NavigationState {
  isProcessing: boolean;
  lastKeyTime: number;
  focusHistory: FocusHistory[];
  currentFocus: HTMLElement | null;
}

const DEBOUNCE_MS = 80;
const FOCUS_HISTORY_MAX = 10;
const SCROLL_MARGIN = 100;

export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window === 'undefined') {
    return;
  }

  const isWebOS =
    window.location.protocol === 'file:' ||
    window.location.search.includes('webos=true');

  if (!isWebOS) {
    return;
  }

  const currentPath = window.location.pathname;
  if (currentPath.includes('/media/')) {
    const router = useRouter();
    router.replace('/');
  }

  document.body.classList.add('webosTV');

  const state: NavigationState = {
    isProcessing: false,
    lastKeyTime: 0,
    focusHistory: [],
    currentFocus: null,
  };

  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=1024, initial-scale=1');
  }

  function isOnDetailPage(): boolean {
    const path = window.location.pathname;
    return (
      path.startsWith('/album/') ||
      path.startsWith('/artist/') ||
      path.startsWith('/playlist/') ||
      path.startsWith('/podcast/')
    );
  }

  function isOnLoginPage(): boolean {
    return window.location.pathname === '/login';
  }

  function shouldSkipElement(element: Element): boolean {
    const el = element as HTMLElement;

    if (el.closest('[class*="trackSeeker"]')) {
      return true;
    }

    if (el.closest('[class*="actions"]')) {
      return true;
    }

    if (
      el.hasAttribute('disabled') ||
      el.getAttribute('aria-disabled') === 'true'
    ) {
      return true;
    }

    if (el.getAttribute('tabindex') === '-1') {
      return true;
    }

    if (!isOnDetailPage()) {
      if (el.closest('.layoutContent')) {
        return true;
      }
    }

    const computedStyle = window.getComputedStyle(el);
    if (
      computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden'
    ) {
      return true;
    }

    return false;
  }

  function isVisible(element: Element): boolean {
    if (!element) return false;
    const el = element as HTMLElement;

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    const isInViewport =
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewportHeight &&
      rect.left < viewportWidth;

    if (!isInViewport) {
      return false;
    }

    const swiperSlide = el.closest('swiper-slide');
    if (swiperSlide) {
      const slideRect = swiperSlide.getBoundingClientRect();
      const visibleLeft = Math.max(slideRect.left, 0);
      const visibleRight = Math.min(slideRect.right, viewportWidth);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);

      if (visibleWidth < slideRect.width * 0.3) {
        return false;
      }
    }

    return true;
  }

  function getFocusableElements(): HTMLElement[] {
    const selectors = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]:not([tabindex="-1"])',
    ].join(',');

    const elements = document.querySelectorAll(selectors);
    return Array.from(elements).filter(
      (el) => isVisible(el) && !shouldSkipElement(el),
    ) as HTMLElement[];
  }

  function getElementCenter(el: HTMLElement): {
    x: number;
    y: number;
    rect: DOMRect;
  } {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      rect,
    };
  }

  function calculateDistance(
    current: DOMRect,
    target: DOMRect,
    direction: Direction,
  ): number {
    let dx = 0;
    let dy = 0;

    switch (direction) {
      case 'up':
        dy = current.top - target.bottom;
        dx = Math.abs(
          current.left + current.width / 2 - (target.left + target.width / 2),
        );
        break;
      case 'down':
        dy = target.top - current.bottom;
        dx = Math.abs(
          current.left + current.width / 2 - (target.left + target.width / 2),
        );
        break;
      case 'left':
        dx = current.left - target.right;
        dy = Math.abs(
          current.top + current.height / 2 - (target.top + target.height / 2),
        );
        break;
      case 'right':
        dx = target.left - current.right;
        dy = Math.abs(
          current.top + current.height / 2 - (target.top + target.height / 2),
        );
        break;
    }

    return Math.sqrt(dx * dx + dy * dy);
  }

  function hasOverlap(a: DOMRect, b: DOMRect, tolerance = 0.2): boolean {
    const aCenter = a.left + a.width / 2;
    const bCenter = b.left + b.width / 2;
    const tolerancePx = Math.max(a.width, b.width) * tolerance;

    return Math.abs(aCenter - bCenter) < tolerancePx;
  }

  function hasVerticalOverlap(
    a: DOMRect,
    b: DOMRect,
    tolerance = 0.2,
  ): boolean {
    const aCenter = a.top + a.height / 2;
    const bCenter = b.top + b.height / 2;
    const tolerancePx = Math.max(a.height, b.height) * tolerance;

    return Math.abs(aCenter - bCenter) < tolerancePx;
  }

  function isInDirection(
    current: DOMRect,
    target: DOMRect,
    direction: Direction,
  ): boolean {
    const threshold = 5;

    switch (direction) {
      case 'up':
        return target.bottom <= current.top + threshold;
      case 'down':
        return target.top >= current.bottom - threshold;
      case 'left':
        return target.right <= current.left + threshold;
      case 'right':
        return target.left >= current.right - threshold;
    }
  }

  function navigateSpatial(direction: Direction): boolean {
    const allElements = getFocusableElements();
    if (allElements.length === 0) return false;

    const currentElement = document.activeElement as HTMLElement;

    if (
      !currentElement ||
      currentElement === document.body ||
      currentElement === document.documentElement ||
      !isVisible(currentElement)
    ) {
      initializeFocus();
      return true;
    }

    const current = getElementCenter(currentElement);
    let bestElement: HTMLElement | null = null;
    let bestScore = Infinity;

    for (const element of allElements) {
      if (element === currentElement) continue;

      const target = getElementCenter(element);

      if (!isInDirection(current.rect, target.rect, direction)) {
        continue;
      }

      const distance = calculateDistance(current.rect, target.rect, direction);

      let alignmentBonus = 0;
      if (direction === 'left' || direction === 'right') {
        if (hasVerticalOverlap(current.rect, target.rect)) {
          alignmentBonus = -1000;
        }
      } else {
        if (hasOverlap(current.rect, target.rect)) {
          alignmentBonus = -1000;
        }
      }

      const score = distance + alignmentBonus;

      if (score < bestScore) {
        bestScore = score;
        bestElement = element;
      }
    }

    if (bestElement) {
      focusElement(bestElement);
      return true;
    }

    return false;
  }

  function focusElement(element: HTMLElement, scroll = true): void {
    element.focus({ preventScroll: true });
    state.currentFocus = element;

    if (scroll) {
      smartScrollIntoView(element);
    }

    saveFocusHistory();
  }

  function smartScrollIntoView(element: HTMLElement): void {
    if (element.closest('swiper-slide')) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;

    const needsVerticalScroll =
      rect.top < SCROLL_MARGIN || rect.bottom > viewportHeight - SCROLL_MARGIN;
    const needsHorizontalScroll =
      rect.left < SCROLL_MARGIN || rect.right > viewportWidth - SCROLL_MARGIN;

    if (needsVerticalScroll || needsHorizontalScroll) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }

  function saveFocusHistory(): void {
    const path = window.location.pathname;
    const element = document.activeElement as HTMLElement;

    if (!element || element === document.body) return;

    const selector = generateElementSelector(element);
    const historyEntry: FocusHistory = {
      path,
      elementSelector: selector,
      timestamp: Date.now(),
    };

    state.focusHistory = state.focusHistory.filter((h) => h.path !== path);
    state.focusHistory.push(historyEntry);

    if (state.focusHistory.length > FOCUS_HISTORY_MAX) {
      state.focusHistory = state.focusHistory.slice(-FOCUS_HISTORY_MAX);
    }
  }

  function generateElementSelector(element: HTMLElement): string | null {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.getAttribute('data-test-id')) {
      return `[data-test-id="${element.getAttribute('data-test-id')}"]`;
    }

    const classes = element.className;
    if (classes && typeof classes === 'string') {
      const classList = classes.split(' ').filter((c) => c && !c.includes(':'));
      if (classList.length > 0) {
        return `${element.tagName.toLowerCase()}.${classList[0]}`;
      }
    }

    return null;
  }

  function restoreFocus(): boolean {
    const path = window.location.pathname;
    const historyEntry = state.focusHistory.find((h) => h.path === path);

    if (historyEntry?.elementSelector) {
      try {
        const element = document.querySelector(
          historyEntry.elementSelector,
        ) as HTMLElement;
        if (element && isVisible(element) && !shouldSkipElement(element)) {
          focusElement(element);
          return true;
        }
      } catch {
        // Selector might be invalid
      }
    }

    return false;
  }

  function initializeFocus(): void {
    if (restoreFocus()) {
      return;
    }

    const allElements = getFocusableElements();

    if (isOnDetailPage()) {
      const playAllButton = document.getElementById('play-all-button');
      if (playAllButton && isVisible(playAllButton)) {
        focusElement(playAllButton);
        return;
      }

      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (
          button.textContent?.toLowerCase().includes('play') &&
          isVisible(button) &&
          !shouldSkipElement(button)
        ) {
          focusElement(button as HTMLElement);
          return;
        }
      }
    }

    if (isOnLoginPage()) {
      const firstInput = document.querySelector(
        'input:not([type="hidden"]):not([type="checkbox"])',
      ) as HTMLElement;
      if (firstInput && isVisible(firstInput)) {
        focusElement(firstInput);
        return;
      }
    }

    const prioritySelectors = [
      'button.primary',
      'button[type="submit"]',
      '.pageLink.active',
      'a[href].active',
      'input:not([type="hidden"]):not([type="checkbox"])',
      'button:not([disabled])',
      'a[href]',
    ];

    for (const selector of prioritySelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && isVisible(element) && !shouldSkipElement(element)) {
        focusElement(element);
        return;
      }
    }

    if (allElements.length > 0) {
      focusElement(allElements[0]);
    }
  }

  function debounce(func: () => void): void {
    const now = Date.now();
    if (now - state.lastKeyTime < DEBOUNCE_MS) {
      return;
    }
    state.lastKeyTime = now;

    if (state.isProcessing) {
      return;
    }

    state.isProcessing = true;
    func();
    state.isProcessing = false;
  }

  function handleBack(): void {
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

    const router = useRouter();
    if (window.history.length > 1) {
      router.back();
    }
  }

  function handleOK(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      if (
        activeElement instanceof HTMLInputElement &&
        activeElement.type === 'checkbox'
      ) {
        activeElement.checked = !activeElement.checked;
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      activeElement.click();
    }
  }

  function setupSearchToggle(): void {
    let searchExpanded = false;
    let searchIsProcessing = false;

    const searchInput = document.getElementById(
      'search-input',
    ) as HTMLInputElement;
    const searchForm = searchInput?.closest('form') as HTMLFormElement;
    const searchWrapper = searchInput?.parentElement as HTMLElement;
    const searchButton = searchForm?.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    if (!searchForm || !searchInput || !searchButton || !searchWrapper) {
      setTimeout(setupSearchToggle, 500);
      return;
    }

    searchWrapper.classList.add('webos-search-wrapper');

    searchButton.addEventListener('click', (evt) => {
      if (searchIsProcessing) {
        evt.preventDefault();
        return;
      }

      if (!searchExpanded) {
        evt.preventDefault();
        searchIsProcessing = true;
        searchExpanded = true;
        searchForm.classList.add('searchExpanded');

        setTimeout(() => {
          searchInput.focus();
          searchInput.select();
          searchIsProcessing = false;
        }, 100);
      }
    });

    searchInput.addEventListener('blur', () => {
      if (searchExpanded) {
        searchExpanded = false;
        searchForm.classList.remove('searchExpanded');
      }
    });

    searchButton.addEventListener('mousedown', (evt) => {
      if (searchExpanded) {
        evt.preventDefault();
      }
    });
  }

  function onKeyDown(evt: KeyboardEvent): void {
    const keyCode = evt.keyCode;

    if (
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.type !== 'checkbox'
    ) {
      if (keyCode === 27) {
        document.activeElement.blur();
        evt.preventDefault();
        return;
      }

      if (keyCode === 13) {
        return;
      }

      if ([37, 38, 39, 40].includes(keyCode)) {
        return;
      }
    }

    switch (keyCode) {
      case 10009:
      case 461:
        evt.preventDefault();
        debounce(handleBack);
        break;
      case 13:
        if (
          !(document.activeElement instanceof HTMLInputElement) ||
          document.activeElement.type === 'checkbox'
        ) {
          evt.preventDefault();
        }
        debounce(handleOK);
        break;
      case 27:
        evt.preventDefault();
        debounce(handleBack);
        break;
      case 37:
        evt.preventDefault();
        debounce(() => navigateSpatial('left'));
        break;
      case 38:
        evt.preventDefault();
        debounce(() => navigateSpatial('up'));
        break;
      case 39:
        evt.preventDefault();
        debounce(() => navigateSpatial('right'));
        break;
      case 40:
        evt.preventDefault();
        debounce(() => navigateSpatial('down'));
        break;
      case 8:
        if (
          !(document.activeElement instanceof HTMLInputElement) &&
          !(document.activeElement instanceof HTMLTextAreaElement)
        ) {
          evt.preventDefault();
          debounce(handleBack);
        }
        break;
    }
  }

  document.addEventListener('keydown', onKeyDown);

  setupSearchToggle();

  setTimeout(initializeFocus, 150);

  nuxtApp.hook('page:finish', () => {
    setTimeout(initializeFocus, 150);
  });

  nuxtApp.hook('page:transition:finish', () => {
    setTimeout(initializeFocus, 150);
  });

  const observer = new MutationObserver(() => {
    const activeElement = document.activeElement;
    if (
      !activeElement ||
      activeElement === document.body ||
      activeElement === document.documentElement ||
      !isVisible(activeElement)
    ) {
      setTimeout(initializeFocus, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
});
