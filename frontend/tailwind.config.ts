import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f2',
          100: '#d6ecdf',
          500: '#2f8f5b',
          600: '#237a49',
          700: '#1c633c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
