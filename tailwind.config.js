/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-gray': '#4A4A4A', // Example gray
        'brand-brown': '#6B4F4F', // Example brown
        'brand-green': '#2E4F4F', // Example deep green
        'accent-blue': '#0E86D4', // Example vibrant blue
        'accent-yellow': '#FFCD38', // Example yellow
        'accent-red': '#E63946', // Example red
        'accent-purple': '#8A2BE2', // Example purple
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Using Inter as primary sans-serif
      }
    },
  },
  plugins: [],
}
