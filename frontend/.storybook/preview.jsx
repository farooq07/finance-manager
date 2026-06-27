import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true }, // theme decorator drives the background
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story) => (
      <div className="min-h-screen bg-white p-6 text-gray-900 dark:bg-vault-ink dark:text-vault-bone">
        <Story />
      </div>
    ),
  ],
};

export default preview;
