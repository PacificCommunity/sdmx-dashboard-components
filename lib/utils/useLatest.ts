import { useLayoutEffect, useRef } from 'react';

/**
 * Hold the latest value of a prop in a ref. Components read callback props
 * (and the fetcher) through it, so an inline callback (a new function every
 * parent render) never re-triggers their data effects. Updated in a layout
 * effect, which runs before any passive effect of the commit: a parent's ref
 * is current when its children's data effects read it.
 */
export const useLatest = <T>(value: T) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
};
