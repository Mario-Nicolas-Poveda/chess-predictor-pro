export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const DUR = { fast: 0.15, base: 0.25, slow: 0.45, reveal: 0.7, draw: 1.4 } as const;
export const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;
export const SPRING_SOFT = { type: 'spring', stiffness: 160, damping: 22 } as const;
export const SPRING_HOP = { type: 'spring', stiffness: 520, damping: 26 } as const;
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.reveal, ease: EASE_OUT } },
} as const;
