// "Neon Court" design system, dark-first, playful-premium.
// `tokens` is the source of truth; `colors` is kept for backwards compatibility.

export const tokens = {
  bg: {
    base: '#0E0B1E',
    raised: '#171331',
    elevated: '#211B45',
  },
  border: {
    subtle: 'rgba(255,255,255,0.08)',
    strong: 'rgba(255,255,255,0.16)',
  },
  brand: {
    primary: '#8B5CF6',
    primaryDown: '#6D3FE0', // pressed / edge shade
    cyan: '#22D3EE',
    gradient: ['#8B5CF6', '#22D3EE'] as const, // render at 135°
  },
  semantic: {
    success: '#34D399',
    successBg: 'rgba(52,211,153,0.14)',
    successDown: '#1FAE7C',
    warn: '#FBBF24',
    warnBg: 'rgba(251,191,36,0.14)',
    warnDown: '#DD9E0C',
    danger: '#FB7185', // rose, not pure red
    dangerBg: 'rgba(251,113,133,0.14)',
    dangerDown: '#E14D64',
  },
  game: {
    xpGold: '#FFC94A',
    streakGradient: ['#FF9A3D', '#FF5E62'] as const,
    ringTrack: 'rgba(255,255,255,0.10)',
  },
  text: {
    primary: '#F4F2FF',
    secondary: '#A9A3C9',
    muted: '#6E6893', // decorative only, below 4.5:1 on bg.base
    onCard: '#17133A',
    onCardMuted: '#55517E',
  },
  card: {
    face: '#FDFBFF', // flashcard face stays deliberately LIGHT
    faceEdge: '#E5DFF5',
  },
  radius: {
    card: 28,
    tile: 20,
    button: 16,
    pill: 999,
  },
} as const;

// Font family keys as registered in App.tsx via useFonts.
export const fonts = {
  display: 'Baloo2_700Bold',
  displayHeavy: 'Baloo2_800ExtraBold',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemiBold: 'InstrumentSans_600SemiBold',
  bodyBold: 'InstrumentSans_700Bold',
  stat: 'SpaceGrotesk_700Bold',
  hanzi: 'NotoSansSC_500Medium',
} as const;

// Spring presets for Animated.spring (useNativeDriver: false on web).
export const springs = {
  snappy: { damping: 18, stiffness: 260, mass: 1 },
  bouncy: { damping: 12, stiffness: 180, mass: 1 },
  gentle: { damping: 20, stiffness: 120, mass: 1 },
} as const;

// Dark-elevation shadow presets (pair with a 1px border.subtle).
export const shadows = {
  tile: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

// Hanzi display size by visible character count (spaces excluded).
export function hanziSize(hanzi: string): number {
  const len = hanzi.replace(/\s/g, '').length;
  if (len <= 2) return 64;
  if (len <= 4) return 44;
  return 32;
}

// Legacy palette, kept so existing imports keep compiling.
export const colors = {
  bg: tokens.bg.base,
  bgCard: tokens.bg.raised,
  surface: tokens.card.face,
  surfaceText: tokens.text.onCard,
  primary: tokens.brand.primary,
  primaryDark: tokens.brand.primaryDown,
  accent: tokens.game.xpGold,
  success: tokens.semantic.success,
  warn: tokens.semantic.warn,
  danger: tokens.semantic.danger,
  textLight: tokens.text.primary,
  textMuted: tokens.text.secondary,
};
