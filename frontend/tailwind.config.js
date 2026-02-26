/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Foundation Colors based on Untitled UI standard
                primary: {
                    25: '#F5FBFA',
                    50: '#F0F9FF',
                    100: '#E0F2FE',
                    200: '#B9E6FE',
                    300: '#7CD4FD',
                    400: '#38BDF8',
                    500: '#0EA5E9',
                    600: '#0284C7', // Default Primary
                    700: '#0369A1',
                    800: '#075985',
                    900: '#0C4A6E',
                },
                gray: {
                    25: '#FCFCFD',
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937',
                    900: '#111827',
                },
                error: {
                    25: '#FFFBFA',
                    50: '#FEF2F2',
                    100: '#FEE2E2',
                    200: '#FECACA',
                    300: '#FCA5A5',
                    400: '#F87171',
                    500: '#EF4444',
                    600: '#DC2626',
                    700: '#B91C1C',
                    800: '#991B1B',
                    900: '#7F1D1D',
                },
                warning: {
                    25: '#FFFCF5',
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    200: '#FDE68A',
                    300: '#FCD34D',
                    400: '#FBBF24',
                    500: '#F59E0B',
                    600: '#D97706',
                    700: '#B45309',
                    800: '#92400E',
                    900: '#78350F',
                },
                success: {
                    25: '#F6FEF9',
                    50: '#ECFDF5',
                    100: '#D1FAE5',
                    200: '#A7F3D0',
                    300: '#6EE7B7',
                    400: '#34D399',
                    500: '#10B981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065F46',
                    900: '#064E3B',
                },
            },
            borderRadius: {
                'none': '0',
                'sm': '0.125rem', // 2px
                'md': '0.375rem', // 6px
                'lg': '0.5rem',   // 8px
                'xl': '0.75rem',  // 12px
                '2xl': '1rem',    // 16px
                'full': '9999px',
            },
            boxShadow: {
                // Layered crisp shadows mirroring advanced design tools
                'xs': '0px 1px 2px rgba(16, 24, 40, 0.05)',
                'sm': '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)',
                'md': '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
                'lg': '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
                'xl': '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
                '2xl': '0px 24px 48px -12px rgba(16, 24, 40, 0.18)',
                '3xl': '0px 32px 64px -12px rgba(16, 24, 40, 0.14)',
                'focused': '0px 0px 0px 4px rgba(56, 189, 248, 0.24)', // Primary focus ring
                'focused-error': '0px 0px 0px 4px rgba(248, 113, 113, 0.24)',
            },
            typography: {
                DEFAULT: {
                    css: {
                        color: '#374151',
                        a: {
                            color: '#0284C7',
                            '&:hover': {
                                color: '#0369A1',
                            },
                        },
                    },
                },
            },
        },
    },
    plugins: [],
}
