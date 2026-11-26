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
        aqi: {
          good: '#10B981',       // Emerald 500
          moderate: '#F59E0B',   // Amber 500
          unhealthySensitive: '#F97316', // Orange 500
          unhealthy: '#EF4444',  // Red 500
          veryUnhealthy: '#8B5CF6', // Purple 500
          hazardous: '#881337',  // Rose 900
        }
      }
    },
  },
  plugins: [],
}
