<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const login = async () => {
  error.value = ''
  isLoading.value = true
  
  try {
    await authStore.login(email.value, password.value)
    await navigateTo('/admin')
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Film grain overlay -->
    <div class="grain-overlay" />
    
    <!-- Decorative blobs -->
    <div class="blob blob-1" />
    <div class="blob blob-2" />
    <div class="blob blob-3" />
    
    <div class="login-container">
      <!-- Logo/Brand matching website -->
      <div class="brand">
        <h1 class="logo-text">
          <span class="logo-blich">BLICH</span>
          <span class="logo-studio">STUDIO</span>
          <span class="logo-sparkle">✱</span>
        </h1>
        <p class="subtitle">Content Management System</p>
      </div>

      <!-- Login Card -->
      <div class="login-card">
        <div class="card-header">
          <h2 class="card-title">Welcome back</h2>
          <p class="card-description">Sign in to manage your content</p>
        </div>

        <form class="login-form" @submit.prevent="login">
          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-input"
              placeholder="you@example.com"
              required
              autocomplete="email"
              :disabled="isLoading"
            >
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="form-input"
              placeholder="••••••••"
              required
              autocomplete="current-password"
              :disabled="isLoading"
            >
          </div>

          <div v-if="error" class="error-message">
            <svg class="error-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 4.5v4M8 10.5v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <span>{{ error }}</span>
          </div>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="loading-spinner" />
            <span>{{ isLoading ? 'Signing in...' : 'Sign in' }}</span>
          </button>
        </form>

        <div class="card-footer">
          <p class="footer-note">
            Writers and admins only. Readers should use the 
            <a href="https://blichstudio.com" target="_blank" rel="noopener">main website</a>.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <p class="copyright">© {{ new Date().getFullYear() }} Blich Studio. All rights reserved.</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Clay/Terracotta Color Palette (OKLCH)
$clay-orange: oklch(0.68 0.14 45);
$clay-rust: oklch(0.55 0.15 35);
$clay-beige: oklch(0.85 0.08 60);

// Dark Theme Colors
$admin-bg: oklch(0.12 0.015 280);
$admin-card-bg: oklch(0.18 0.02 285);
$admin-border: oklch(0.24 0.025 285);
$admin-text: oklch(0.92 0.01 80);
$admin-text-muted: oklch(0.62 0.02 280);
$admin-primary: $clay-orange;
$admin-primary-hover: $clay-rust;
$admin-danger: oklch(0.55 0.18 25);

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $admin-bg;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.grain-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
  z-index: 0;
}

// Decorative background blobs
.blob {
  position: absolute;
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
  animation: float 20s ease-in-out infinite;
}

.blob-1 {
  top: 10%;
  right: 15%;
  width: 300px;
  height: 300px;
  background: color-mix(in oklch, $clay-rust 15%, transparent);
  animation-delay: 0s;
}

.blob-2 {
  top: 50%;
  left: 10%;
  width: 400px;
  height: 400px;
  background: color-mix(in oklch, $clay-orange 10%, transparent);
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  animation-delay: -7s;
}

.blob-3 {
  bottom: 10%;
  right: 25%;
  width: 250px;
  height: 250px;
  background: color-mix(in oklch, $clay-beige 8%, transparent);
  border-radius: 30% 70% 70% 30% / 30% 60% 40% 70%;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(20px, -20px) rotate(5deg); }
  50% { transform: translate(-10px, 10px) rotate(-3deg); }
  75% { transform: translate(15px, 15px) rotate(3deg); }
}

.login-container {
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
}

.brand {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-text {
  font-family: "Space Grotesk", sans-serif;
  font-size: 3rem;
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.03em;
  margin: 0 0 0.75rem;
  position: relative;
  display: inline-block;
}

.logo-blich {
  display: block;
  color: $admin-text;
}

.logo-studio {
  display: block;
  color: $admin-primary;
}

.logo-sparkle {
  position: absolute;
  right: -1.5rem;
  top: -0.5rem;
  font-size: 1.25rem;
  color: $admin-primary;
  animation: wiggle 3s ease-in-out infinite;
}

@keyframes wiggle {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(10deg); }
}

.subtitle {
  font-size: 0.875rem;
  color: $admin-text-muted;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 500;
}

.login-card {
  background: $admin-card-bg;
  border: 1px solid $admin-border;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px color-mix(in oklch, white 5%, transparent);
}

.card-header {
  text-align: center;
  margin-bottom: 2rem;
}

.card-title {
  font-family: "Space Grotesk", sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: $admin-text;
  margin: 0 0 0.5rem;
}

.card-description {
  font-size: 0.9375rem;
  color: $admin-text-muted;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: $admin-text;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  color: $admin-text;
  background: $admin-bg;
  border: 1px solid $admin-border;
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  
  &::placeholder {
    color: $admin-text-muted;
  }
  
  &:focus {
    border-color: $admin-primary;
    box-shadow: 0 0 0 3px color-mix(in oklch, $admin-primary 20%, transparent);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: color-mix(in oklch, $admin-danger 15%, transparent);
  border: 1px solid color-mix(in oklch, $admin-danger 30%, transparent);
  border-radius: 10px;
  color: oklch(0.75 0.12 25);
  font-size: 0.875rem;
}

.error-icon {
  flex-shrink: 0;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem 1.5rem;
  margin-top: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: $admin-bg;
  background: $admin-primary;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
  
  &:hover:not(:disabled) {
    background: $admin-primary-hover;
    box-shadow: 0 4px 12px color-mix(in oklch, $admin-primary 30%, transparent);
  }
  
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid $admin-border;
}

.footer-note {
  font-size: 0.8125rem;
  color: $admin-text-muted;
  text-align: center;
  margin: 0;
  line-height: 1.6;
  
  a {
    color: $admin-primary;
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

.copyright {
  text-align: center;
  font-size: 0.75rem;
  color: $admin-text-muted;
  margin: 2rem 0 0;
}
</style>
