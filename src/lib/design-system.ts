/**
 * HackDay Central Design System
 * FH-inspired warm editorial language:
 * soft paper-toned backgrounds · dark navy typography · terracotta accenting
 * Display: Fraunces · Body: Manrope
 */

export const designTokens = {
  colors: {
    // Terracotta primary
    primary: {
      50:  '#fdf4ef',
      100: '#fbe4d4',
      200: '#f6c6a8',
      300: '#efa076',
      400: '#e8834d',
      500: '#dd6e42',
      600: '#b9552d',
      700: '#9a431f',
      800: '#7d3519',
      900: '#672c16',
      950: '#3f1809',
    },
    // Navy secondary (ink)
    secondary: {
      50:  '#eef1f7',
      100: '#d4daea',
      200: '#aab5d5',
      300: '#7e90be',
      400: '#556ea8',
      500: '#3a5490',
      600: '#2c4078',
      700: '#1f2f5c',
      800: '#14213d',
      900: '#0d1628',
      950: '#070d17',
    },
    // Neutral — warm paper tones
    neutral: {
      50:  '#faf7f3',
      100: '#f7f2ea',
      200: '#ece6db',
      300: '#ddd4c5',
      400: '#c4b8a5',
      500: '#9e9183',
      600: '#7a6e62',
      700: '#5f6b7a',
      800: '#3a3530',
      900: '#1e1a16',
      950: '#0f0d0b',
    },
    // Status
    status: {
      success: {
        light:   '#d1ede7',
        DEFAULT: '#2f6f5e',
        dark:    '#1a4f43',
      },
      warning: {
        light:   '#fef3c7',
        DEFAULT: '#b45309',
        dark:    '#78350f',
      },
      error: {
        light:   '#f9e4e4',
        DEFAULT: '#a63d40',
        dark:    '#7b1d20',
      },
      info: {
        light:   '#fdf4ef',
        DEFAULT: '#dd6e42',
        dark:    '#b9552d',
      },
    },
    // Semantic surfaces
    background: '#f7f2ea',
    foreground:  '#14213d',
    muted:       'rgba(247, 242, 234, 0.6)',
    mutedForeground: '#5f6b7a',
    accent:      'rgba(20, 33, 61, 0.06)',
    border:      'rgba(20, 33, 61, 0.12)',
    card:        'rgba(255, 251, 246, 0.92)',
    ring:        '#dd6e42',
    // Quality gate
    qualityGates: {
      draft:      '#b45309',
      in_progress:'#b45309',
      verified:   '#2f6f5e',
      deprecated: '#5f6b7a',
    },
    // Maturity
    maturity: {
      experimenting: '#b45309',
      repeating:     '#5f6b7a',
      scaling:       '#5f6b7a',
      transforming:  '#2f6f5e',
    },
    // Experience
    experience: {
      newbie:     '#9ca3af',
      curious:    '#5f6b7a',
      comfortable:'#2f6f5e',
      power_user: '#5f6b7a',
      expert:     '#14213d',
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
    56: '14rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },

  typography: {
    fontFamily: {
      display: ['Fraunces', 'Georgia', 'serif'],
      sans:    ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    fontSize: {
      xs:   ['0.75rem',   { lineHeight: '1rem' }],
      sm:   ['0.875rem',  { lineHeight: '1.25rem' }],
      base: ['1rem',      { lineHeight: '1.5rem' }],
      lg:   ['1.125rem',  { lineHeight: '1.75rem' }],
      xl:   ['1.25rem',   { lineHeight: '1.75rem' }],
      '2xl':['1.5rem',    { lineHeight: '2rem' }],
      '3xl':['1.875rem',  { lineHeight: '2.25rem' }],
      '4xl':['2.25rem',   { lineHeight: '2.5rem' }],
      '5xl':['3rem',      { lineHeight: '1' }],
      '6xl':['3.75rem',   { lineHeight: '1' }],
    },
    fontWeight: {
      thin:       '100',
      extralight: '200',
      light:      '300',
      normal:     '400',
      medium:     '500',
      semibold:   '600',
      bold:       '700',
      extrabold:  '800',
      black:      '900',
    },
  },

  animations: {
    duration: {
      fast:   '150ms',
      normal: '300ms',
      slow:   '500ms',
    },
    easing: {
      ease:      'ease',
      easeIn:    'ease-in',
      easeOut:   'ease-out',
      easeInOut: 'ease-in-out',
      spring:    'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },

  breakpoints: {
    sm:  '640px',
    md:  '768px',
    lg:  '1024px',
    xl:  '1280px',
    '2xl': '1536px',
  },

  borderRadius: {
    none:  '0',
    sm:    '0.375rem',
    DEFAULT:'0.5rem',
    md:    '0.5rem',
    lg:    '0.75rem',
    xl:    '1.25rem',
    '2xl': '1.75rem',
    '3xl': '2.5rem',
    full:  '9999px',
  },

  shadows: {
    sm:     '0 1px 3px rgba(20, 33, 61, 0.08)',
    DEFAULT:'0 4px 16px rgba(20, 33, 61, 0.1)',
    md:     '0 4px 16px rgba(20, 33, 61, 0.1)',
    lg:     '0 12px 40px rgba(20, 33, 61, 0.12)',
    xl:     '0 24px 70px rgba(20, 33, 61, 0.08)',
    card:   '0 24px 70px rgba(20, 33, 61, 0.08)',
    inner:  'inset 0 2px 4px rgba(20, 33, 61, 0.06)',
    none:   'none',
  },
} as const

// Experience level display labels
export const experienceLevelLabels: Record<string, string> = {
  newbie:     'AI Newbie',
  curious:    'AI Curious',
  comfortable:'AI Comfortable',
  power_user: 'AI Power User',
  expert:     'AI Expert',
}

// Hack type display labels
export const assetTypeLabels: Record<string, string> = {
  prompt: 'Prompt',
  skill:  'Skill',
  app:    'App',
}

// Project status display labels
export const projectStatusLabels: Record<string, string> = {
  idea:       'Idea',
  building:   'Building',
  incubation: 'Incubation',
  completed:  'Completed',
  archived:   'Archived',
}

// Maturity stage display labels
export const maturityStageLabels: Record<string, string> = {
  experimenting: 'Experimenting',
  repeating:     'Repeating',
  scaling:       'Scaling',
  transforming:  'Transforming',
}

// Quality gate status labels
export const qualityGateLabels: Record<string, string> = {
  draft:       'In progress',
  in_progress: 'In progress',
  verified:    'Verified',
  deprecated:  'Deprecated',
}

export type ExperienceLevel  = keyof typeof experienceLevelLabels
export type AssetType        = keyof typeof assetTypeLabels
export type ProjectStatus    = keyof typeof projectStatusLabels
export type MaturityStage    = keyof typeof maturityStageLabels
export type QualityGateStatus= keyof typeof qualityGateLabels
