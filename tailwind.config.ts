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
				// RabbitMQ Component Colors
				producer: {
					DEFAULT: 'hsl(var(--producer))',
					foreground: 'hsl(var(--producer-foreground))'
				},
				exchange: {
					direct: {
						DEFAULT: 'hsl(var(--exchange-direct))',
						foreground: 'hsl(var(--exchange-direct-foreground))'
					},
					fanout: {
						DEFAULT: 'hsl(var(--exchange-fanout))',
						foreground: 'hsl(var(--exchange-fanout-foreground))'
					},
					topic: {
						DEFAULT: 'hsl(var(--exchange-topic))',
						foreground: 'hsl(var(--exchange-topic-foreground))'
					},
					headers: {
						DEFAULT: 'hsl(var(--exchange-headers))',
						foreground: 'hsl(var(--exchange-headers-foreground))'
					}
				},
				queue: {
					DEFAULT: 'hsl(var(--queue))',
					foreground: 'hsl(var(--queue-foreground))'
				},
				consumer: {
					DEFAULT: 'hsl(var(--consumer))',
					foreground: 'hsl(var(--consumer-foreground))'
				},
				connection: {
					DEFAULT: 'hsl(var(--connection))',
					active: 'hsl(var(--connection-active))',
					error: 'hsl(var(--connection-error))'
				},
				status: {
					active: 'hsl(var(--status-active))',
					warning: 'hsl(var(--status-warning))',
					error: 'hsl(var(--status-error))',
					idle: 'hsl(var(--status-idle))'
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
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
