
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				success: {
					DEFAULT: '#10B981',
					muted: '#D1FAE5'
				},
				warning: {
					DEFAULT: '#F59E0B',
					muted: '#FEF3C7'
				},
				error: {
					DEFAULT: '#EF4444',
					muted: '#FEE2E2'
				},
				// New metric-specific colors
				metric: {
					// Cost metrics - red theme
					cost: {
						DEFAULT: '#EF4444',
						light: '#FEE2E2',
						dark: '#B91C1C',
						muted: 'rgba(239, 68, 68, 0.1)'
					},
					// Volume metrics - blue theme
					volume: {
						DEFAULT: '#3B82F6',
						light: '#DBEAFE',
						dark: '#1D4ED8',
						muted: 'rgba(59, 130, 246, 0.1)'
					},
					// Revenue metrics - green theme
					revenue: {
						DEFAULT: '#10B981',
						light: '#D1FAE5',
						dark: '#047857',
						muted: 'rgba(16, 185, 129, 0.1)'
					},
					// Profit metrics - teal theme
					profit: {
						DEFAULT: '#14B8A6',
						light: '#CCFBF1',
						dark: '#0F766E',
						muted: 'rgba(20, 184, 166, 0.1)'
					},
					// Ratio metrics - orange theme (ROAS, etc)
					ratio: {
						DEFAULT: '#F97316',
						light: '#FFEDD5',
						dark: '#C2410C',
						muted: 'rgba(249, 115, 22, 0.1)'
					},
					// Rate metrics - purple theme (CVR, etc)
					rate: {
						DEFAULT: '#8B5CF6',
						light: '#EDE9FE',
						dark: '#6D28D9',
						muted: 'rgba(139, 92, 246, 0.1)'
					},
					// Performance metrics - amber theme
					performance: {
						DEFAULT: '#F59E0B',
						light: '#FEF3C7',
						dark: '#B45309',
						muted: 'rgba(245, 158, 11, 0.1)'
					}
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-slow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
