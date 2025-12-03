import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    tooling: false,
    stylistic: true,
  },
})
  .prepend({
    ignores: ['*.config.ts', '*.config.mjs', '*.config.js'],
  })
  .append({
    rules: {
      // Vue 3 / Nuxt specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-multiple-template-root': 'off', // Vue 3 allows multiple roots
      
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  })
