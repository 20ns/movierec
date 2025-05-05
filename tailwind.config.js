module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            // Prevent prose from adding margins around images, as our custom renderer handles it
            img: {
              marginTop: '0',
              marginBottom: '0',
            },
          },
        },
      }),
      animation: {
        'pulse-subtle': 'pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.85 },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Add this line
  ],
}