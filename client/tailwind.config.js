/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: { DEFAULT: '#0F0F13', card: '#16161D', border: '#1E1E2A' },
                accent: { DEFAULT: '#6C63FF', hover: '#5A52E0', glow: 'rgba(108,99,255,0.15)' },
                success: '#22C55E',
                warning: '#F59E0B',
                danger: '#EF4444',
                text: { primary: '#F1F1F5', secondary: '#8B8B9E', muted: '#4A4A5A' }
            }
        },
    },
    plugins: [],
}
