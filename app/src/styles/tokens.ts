/**
 * Design Tokens — Enviopack Brand Book 2025
 * Fuente: Inter | Primary: Celtic Blue | Accent: Penn Blue | Orange: Bittersweet
 */

export const colors = {
  // Primarios
  richBlack: '#000000',
  celticBlue: '#1E2A4F',
  aliceBlue: '#DCEBFC',
  white: '#FFFFFF',

  // Tonos de Celtic Blue
  blue50: '#F5F6F7',
  blue100: '#F2F6F9',
  blue200: '#F0F7FC',
  blue300: '#E5EFF9',
  blue400: '#DCEBFC',  // alice blue
  blue500: '#4B6C98',
  blue600: '#425EBC',
  blue700: '#3B527F',
  blue800: '#2B3C66',
  blue900: '#1E2A4F',  // celtic blue
  blue950: '#12172D',
  blue975: '#070B23',

  // Secundario: Penn Blue (CTA, links, activos)
  pennBlue: '#4870FA',
  pennBlue400: '#9CC0FF',
  pennBlue500: '#5C8EFF',
  pennBlue600: '#577DE5',

  // Acento: Bittersweet (advertencias, naranja)
  bittersweet: '#E76000',
  orange400: '#FFB07B',
  orange500: '#FF8D40',

  // Feedback
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#4870FA',
  infoLight: '#DCEBFC',

  // Neutrales
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
} as const

export const fonts = {
  base: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

export const fontSizes = {
  xs: '11px',
  sm: '12px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '30px',
  '5xl': '36px',
}

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
}

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
}

export const shadows = {
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
}
