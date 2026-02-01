/**
 * HackDay Central Design System
 * Design tokens for consistent styling across the application
 */

export const designTokens = {
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    // Secondary/accent colors
    secondary: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
      950: '#4a044e',
    },
    // Neutral/gray scale
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },
    // Status colors
    status: {
      success: {
        light: '#dcfce7',
        DEFAULT: '#22c55e',
        dark: '#15803d',
      },
      warning: {
        light: '#fef3c7',
        DEFAULT: '#f59e0b',
        dark: '#b45309',
      },
      error: {
        light: '#fee2e2',
        DEFAULT: '#ef4444',
        dark: '#b91c1c',
      },
      info: {
        light: '#dbeafe',
        DEFAULT: '#3b82f6',
        dark: '#1d4ed8',
      },
    },
    // Quality gate status colors
    qualityGates: {
      draft: '#f59e0b',      // amber
      verified: '#22c55e',   // green
      deprecated: '#71717a', // gray
    },
    // Maturity stages
    maturity: {
      experimenting: '#f59e0b',  // amber
      repeating: '#3b82f6',      // blue
      scaling: '#8b5cf6',        // purple
      transforming: '#22c55e',   // green
    },
    // Experience levels
    experience: {
      newbie: '#94a3b8',      // slate
      curious: '#60a5fa',     // blue
      comfortable: '#34d399', // emerald
      power_user: '#a78bfa',  // violet
      expert: '#f472b6',      // pink
    },
  },

  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },

  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },
} as const

// Experience level display labels (mapped from internal codes)
export const experienceLevelLabels: Record<string, string> = {
  newbie: 'AI Newbie',
  curious: 'AI Curious',
  comfortable: 'AI Comfortable',
  power_user: 'AI Power User',
  expert: 'AI Expert',
}

// Asset type display labels
export const assetTypeLabels: Record<string, string> = {
  prompt: 'Prompt',
  skill: 'Skill',
  app: 'App',
}

// Project status display labels
export const projectStatusLabels: Record<string, string> = {
  idea: 'Idea',
  building: 'Building',
  incubation: 'Incubation',
  completed: 'Completed',
  archived: 'Archived',
}

// Maturity stage display labels
export const maturityStageLabels: Record<string, string> = {
  experimenting: 'Experimenting',
  repeating: 'Repeating',
  scaling: 'Scaling',
  transforming: 'Transforming',
}

// Quality gate status labels
export const qualityGateLabels: Record<string, string> = {
  draft: 'Draft',
  verified: 'Verified',
  deprecated: 'Deprecated',
}

export type ExperienceLevel = keyof typeof experienceLevelLabels
export type AssetType = keyof typeof assetTypeLabels
export type ProjectStatus = keyof typeof projectStatusLabels
export type MaturityStage = keyof typeof maturityStageLabels
export type QualityGateStatus = keyof typeof qualityGateLabels
