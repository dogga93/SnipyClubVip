/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        verdict: {
          noBet: '#64748b',
          lean: '#38bdf8',
          value: '#22c55e',
          strong: '#10b981',
          trap: '#ef4444'
        }
      }
    }
  },
  plugins: []
};
