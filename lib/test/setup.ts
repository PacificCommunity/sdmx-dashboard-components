// jsdom has no canvas 2D context and no ResizeObserver; ECharts needs the
// first and every chart observes its container with the second
if (typeof window !== 'undefined') {
  // dynamic: the mock patches HTMLCanvasElement, which only exists in the
  // jsdom environment, and this file also runs for node-environment suites
  await import('vitest-canvas-mock');
  const resizeObserverTarget = window as unknown as { ResizeObserver?: unknown };
  if (!resizeObserverTarget.ResizeObserver) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    resizeObserverTarget.ResizeObserver = ResizeObserverStub;
  }
}

export {};
