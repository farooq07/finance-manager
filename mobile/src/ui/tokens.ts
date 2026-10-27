// WealthAxis design tokens — soft light gradients, airy cards (see
// docs/superpowers/specs/2026-10-21-mobile-foundation-design.md).

const light = {
    card: '#FFFFFF',
    cardBorder: '#EEF2F0',
    text: '#0F172A',
    textMuted: '#64748B',
    textFaint: '#94A3B8',
    moneyIn: '#059669',
    moneyOut: '#0F172A',
    accent: '#10B981',
    accentText: '#FFFFFF',
    danger: '#DC2626',
    warningBg: '#FEF3C7',
    warningText: '#92400E',
    skeleton: '#E2E8F0',
    heroBloom: ['#FDE2E4', '#FCE7F3', 'rgba(255,255,255,0)'] as readonly [string, string, string],
};

const dark: typeof light = {
    card: '#1E293B',
    cardBorder: '#273449',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    textFaint: '#64748B',
    moneyIn: '#34D399',
    moneyOut: '#F1F5F9',
    accent: '#10B981',
    accentText: '#FFFFFF',
    danger: '#F87171',
    warningBg: '#422006',
    warningText: '#FCD34D',
    skeleton: '#334155',
    heroBloom: ['rgba(244,114,182,0.25)', 'rgba(167,139,250,0.15)', 'rgba(30,41,59,0)'],
};

export const tokens = {
    colors: { light, dark },
    gradients: {
        light: ['#F3FBF7', '#FFFBF4', '#F1F6FC'],
        dark: ['#0F172A', '#111827'],
    } as const,
    radius: { hero: 28, card: 20, field: 14, pill: 999 },
    space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    font: {
        regular: 'Inter_400Regular',
        medium: 'Inter_500Medium',
        semibold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
    },
};

export type ThemeColors = typeof light;
