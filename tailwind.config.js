/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d5e0ff',
          300: '#b2c7ff',
          400: '#84a2ff',
          500: '#5175ff',
          600: '#324eff',
          700: '#233ae0',
          800: '#1d2eb3',
          900: '#1b278e',
          950: '#101656',
        },
        dark: {
          bg: '#090D16',       // Deep developer-tool background
          card: '#111827',     // Dark slate/gray card
          border: '#1F2937',   // Slate border
          hover: '#1F2937',    // Card hover
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
