import { defineSharedConfig } from '@blich-studio/eslint-config'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/*.vue', '.nuxt/**', 'dist/**', '*.config.ts', '*.config.mjs', '*.config.js'],
  },
  ...defineSharedConfig({
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './.nuxt/tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }),
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        sourceType: 'module',
      },
    },
  },
)
