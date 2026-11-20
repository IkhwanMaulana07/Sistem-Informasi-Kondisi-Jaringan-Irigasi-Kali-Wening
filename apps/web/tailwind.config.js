/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#0f2942',
          blue: '#1b4d79',
          teal: '#0d9488',
          surface: '#ffffff',
          bg: '#f8fafc',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b'
        },
        condition: {
          baik: '#16a34a',
          rusak_ringan: '#d97706',
          rusak_sedang: '#ea580c',
          rusak_berat: '#dc2626'
        }
      }
    },
  },
  plugins: [],
}
