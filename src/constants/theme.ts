/**
 * CookstoveCare Visual Design System & Color Tokens
 * Mirrors Android Jetpack Compose palette & styling
 */

export const Colors = {
  // Primary & secondary brand
  primary: '#673AB7',
  primaryLight: '#D0BCFF',
  primaryDark: '#512DA8',
  secondary: '#625b71',
  secondaryLight: '#CCC2DC',
  accent: '#7D5260',
  
  // Status Colors
  success: '#4CAF50',
  successDark: '#388E3C',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Status-specific badges
  statusCollected: '#E0F2FE', // light blue
  statusCollectedText: '#0284C7',
  statusAssigned: '#FEF3C7', // amber
  statusAssignedText: '#D97706',
  statusInProgress: '#E0E7FF', // indigo
  statusInProgressText: '#4F46E5',
  statusRepairCompleted: '#DCFCE7', // emerald
  statusRepairCompletedText: '#16A34A',
  statusReplacementCompleted: '#F3E8FF', // purple
  statusReplacementCompletedText: '#9333EA',
  statusDistributed: '#D1FAE5', // green
  statusDistributedText: '#059669',

  // Auth Gradients
  authGradientStart: '#667EEA',
  authGradientEnd: '#764BA2',
  authCardSurface: '#F8FAFC',
  authCardSurfaceDark: '#1E293B',

  // Welcome screen pastel gradients & floating dots
  welcomeGradientStart: '#E8F5E9',
  welcomeGradientMid1: '#FFF8E1',
  welcomeGradientMid2: '#FFECB3',
  welcomeGradientEnd: '#E3F2FD',
  welcomeDots: {
    pink: 'rgba(248, 187, 217, 0.4)',
    blue: 'rgba(187, 222, 251, 0.4)',
    yellow: 'rgba(255, 245, 157, 0.4)',
    purple: 'rgba(225, 190, 231, 0.4)',
    green: 'rgba(200, 230, 201, 0.4)',
  },

  // Surfaces & Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceHover: '#E2E8F0',

  // Borders & Dividers
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#EEF2F6',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',
};

export const Typography = {
  fontFamilies: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
  },
};
