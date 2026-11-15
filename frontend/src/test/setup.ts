import '@testing-library/jest-dom/vitest';

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
window.scrollTo = () => {};

// jsdom chưa hỗ trợ getComputedStyle(el, pseudo): Ant Design gọi để đo thanh cuộn → bỏ tham số pseudo.
const computed = window.getComputedStyle.bind(window);
window.getComputedStyle = (el: Element) => computed(el);

// jsdom không có ResizeObserver (Ant Design dùng để đo kích thước).
if (!('ResizeObserver' in window)) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
