import confetti from 'canvas-confetti';

/**
 * Fire gold particle confetti celebrating a verified milestone.
 * Respects prefers-reduced-motion: the user has opted out of animation
 * effects, so we short-circuit and do nothing.
 */
export function fireGoldConfetti(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gold = ['#d4a574', '#f5d78e', '#c29360', '#fff3c4', '#b8860b'];

  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 32,
    gravity: 0.7,
    ticks: 180,
    colors: gold,
    scalar: 1.1,
    origin: { x: 0.5, y: 0.65 },
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      startVelocity: 45,
      colors: gold,
      origin: { x: 0, y: 0.8 },
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      startVelocity: 45,
      colors: gold,
      origin: { x: 1, y: 0.8 },
    });
  }, 250);
}
