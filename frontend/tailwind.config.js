/** @type {import('tailwindcss').Config} */

const brandColors = {
    // Foundation Colors based on Untitled UI standard
    primary: {
        25: '#F2F8F7',
        50: '#E4F1EF',
        100: '#C2E0DB',
        200: '#9BCDC5',
        300: '#71B7AC',
        400: '#52A397',
        500: '#388D80',
        600: '#1F4842', // Default Primary
        700: '#1A3D38',
        800: '#14302C',
        900: '#102522',
    },
    gray: {
        25: '#FDFDFD',
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#EAEAEB',
        300: '#D5D7DA',
        400: '#A4A7AE',
        500: '#717680',
        600: '#535862',
        700: '#414651',
        800: '#252B37',
        900: '#181D27',
        950: '#0A0D12'
    },
    error: {
        25: '#FFFBFA',
        50: '#FEF3F2',
        100: '#FEE4E2',
        200: '#FECDCA',
        300: '#FDA29B',
        400: '#F97066',
        500: '#F04438',
        600: '#D92D20',
        700: '#B42318',
        800: '#912018',
        900: '#7A271A',
    },
    warning: {
        25: '#FFFCF5',
        50: '#FFFAEB',
        100: '#FEF0C7',
        200: '#FEDF89',
        300: '#FEC84B',
        400: '#FDB022',
        500: '#F79009',
        600: '#DC6803',
        700: '#B54708',
        800: '#93370D',
        900: '#7A2E0E',
    },
    success: {
        25: '#F6FEF9',
        50: '#ECFDF3',
        100: '#D1FADF',
        200: '#A6F4C5',
        300: '#6CE9A6',
        400: '#32D583',
        500: '#12B76A',
        600: '#039855',
        700: '#027A48',
        800: '#05603A',
        900: '#054F31',
    },
    indigo: {
        25: '#F5F6FF',
        50: '#EEF4FF',
        100: '#E0EAFF',
        200: '#C7D7FE',
        300: '#A4BCFD',
        400: '#8098F9',
        500: '#6172F3',
        600: '#444CE7',
        700: '#3538CD',
        800: '#2D31A6',
        900: '#2D3282',
    },
};

export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "node_modules/flowbite-react/dist/**/*.{js,jsx,ts,tsx}",
        "node_modules/flowbite/**/*.js"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            colors: {
                ...brandColors,
                brand: brandColors.primary,
                'brand-medium': brandColors.primary[500],
                'brand-strong': brandColors.primary[700],
                // Flowbite aliases correctly overriding default button states
                cyan: brandColors.primary,
                blue: brandColors.primary,
                red: brandColors.error,
                green: brandColors.success,
                yellow: brandColors.warning,
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
    plugins: [
        require('flowbite/plugin')
    ],
}
