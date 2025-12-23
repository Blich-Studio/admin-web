<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()

const handleLogout = () => {
  authStore.logout()
  navigateTo('/login')
}

const navSections = computed(() => {
  const sections = [
    {
      title: 'Content',
      items: [
        { label: 'Dashboard', icon: 'lucide:layout-dashboard', to: '/admin' },
        { label: 'Articles', icon: 'lucide:file-text', to: '/admin/articles' },
        { label: 'Projects', icon: 'lucide:folder-kanban', to: '/admin/projects' },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Tags', icon: 'lucide:tags', to: '/admin/tags' },
        { label: 'Media', icon: 'lucide:image', to: '/admin/media' },
      ],
    },
  ]

  // Add admin-only section
  if (authStore.isAdmin) {
    sections.push({
      title: 'Administration',
      items: [
        { label: 'Users', icon: 'lucide:users', to: '/admin/users' },
        { label: 'Activity', icon: 'lucide:activity', to: '/admin/activity' },
      ],
    })
  }

  return sections
})

const isActiveLink = (to: string) => {
  if (to === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(to)
}
</script>

<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="admin-sidebar">
      <div class="admin-sidebar__header">
        <h1>Blich CMS</h1>
      </div>

      <nav class="admin-sidebar__nav">
        <div
          v-for="section in navSections"
          :key="section.title"
          class="admin-sidebar__section"
        >
          <div class="admin-sidebar__section-title">{{ section.title }}</div>
          <NuxtLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="admin-sidebar__link"
            :class="{ 'admin-sidebar__link--active': isActiveLink(item.to) }"
          >
            <Icon :name="item.icon" class="icon" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>

      <div class="admin-sidebar__footer">
        <button class="btn btn--secondary btn--sm" style="width: 100%" @click="handleLogout">
          <Icon name="lucide:log-out" class="icon" />
          Logout
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="admin-main">
      <NuxtPage />
    </main>
  </div>
</template>
