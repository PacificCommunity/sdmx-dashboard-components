// jsdom has no canvas 2D context and no ResizeObserver; ECharts needs the
// first and every chart observes its container with the second
if (typeof window !== 'undefined') {
  // dynamic: the mock patches HTMLCanvasElement, which only exists in the
  // jsdom environment, and this file also runs for node-environment suites
  await import('vitest-canvas-mock');
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverStub;
  }
}
