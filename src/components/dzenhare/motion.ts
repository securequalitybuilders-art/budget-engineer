import { useReducedMotion } from 'framer-motion';

/** True when the OS requests reduced motion — disables parallax/confetti/loops. Leaf module (no JSX). */
export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false;
}
