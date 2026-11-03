import { useEffect, useRef } from 'react';

/**
 * Hold the latest value of a prop in a ref. Components read callback props
 * through it, so an inline callback (a new function every parent render)
 * never re-triggers their data effects.
 */
export const useLatest = <T>(value: T) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
};
