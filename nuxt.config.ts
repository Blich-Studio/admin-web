// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
    title: 'Blich CMS',
    meta: [
      { name: 'X-Content-Type-Options', content: 'nosniff' },
        { name: 'X-Frame-Options', content: 'DENY' },
        { name: 'X-XSS-Protection', content: '1; mode=block' },
        { name: 'referrer', content: 'strict-origin-when-cross-origin' }
    ]
  },
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL,
    },
  },
  hooks: {
    'ready': (nuxt) => {
      const apiUrl = nuxt.options.runtimeConfig.public.apiUrl
      if (!apiUrl) {
        throw new Error('NUXT_PUBLIC_API_URL environment variable is required. Please set it in your .env file.')
      }
    },
  },
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@pinia/nuxt'
  ],
  css: ['@/assets/css/main.scss'],
  nitro: {
    preset: 'bun',
    routeRules: {
      '/**': {
        headers: {
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.blichstudio.com https://localhost:* http://localhost:* ws://localhost:* wss://localhost:*"
          ].join('; ')
        }
      }
    }
  }
})
