/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f7f4ec',
        ink: '#20242b',
        accent: '#b3402f',
        accentDark: '#8f2f22',
        gold: '#a97b3a',
        steel: '#3d5a75',
        moss: '#5b6e52',
      },
      fontFamily: {
        serifcn: ['"Noto Serif SC"', '"Source Han Serif SC"', '"Songti SC"', 'SimSun', 'serif'],
        sanscn: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        paper: '0 1px 2px rgba(32,36,43,0.06), 0 8px 24px rgba(32,36,43,0.06)',
      },
    },
  },
  plugins: [],
};
