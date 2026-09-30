import { computed, inject, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

import { editorLogoutGuardKey } from '../utils/editor-navigation'

interface Publication {
  status: 'draft' | 'published' | 'archived'
  slug: string
}

// These forms contain JSON values. Snapshot arrays as well as scalar fields so
// edits made during a request cannot silently change its payload or saved state.
export function useEditorState<T extends Publication>(
  form: T,
  saving: Ref<boolean>,
  existing = false,
) {
  const snapshot = (): T => JSON.parse(JSON.stringify(form))
  const baseline = ref(JSON.stringify(form))
  const ready = ref(!existing)
  const savedStatus = ref<Publication['status'] | null>(null)
  const savedSlug = ref('')
  const logoutGuard = inject(editorLogoutGuardKey, null)
  let permittedPath: string | undefined
  const isDirty = computed(
    () => ready.value && JSON.stringify(form) !== baseline.value,
  )
  const stateLabel = computed(() =>
    saving.value
      ? 'Saving…'
      : isDirty.value
        ? 'Unsaved changes'
        : savedStatus.value
          ? 'All changes saved'
          : 'Not saved yet',
  )

  function markLoaded() {
    baseline.value = JSON.stringify(form)
    savedStatus.value = form.status
    savedSlug.value = form.slug
    ready.value = true
  }

  function acknowledge(submitted: T, saved: Publication) {
    for (const field of ['status', 'slug'] as const) {
      if (form[field] === submitted[field])
        Object.assign(form, { [field]: saved[field] })
    }
    baseline.value = JSON.stringify({ ...submitted, ...saved })
    savedStatus.value = saved.status
    savedSlug.value = saved.slug
  }

  function mayLeave(to: { path: string }, from: { path: string }) {
    if (to.path === from.path) return true
    if (to.path === permittedPath) {
      permittedPath = undefined
      return true
    }
    if (saving.value) return false
    return (
      !isDirty.value ||
      window.confirm('You have unsaved changes. Leave without saving them?')
    )
  }
  onBeforeRouteLeave(mayLeave)
  onBeforeRouteUpdate(mayLeave)
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value && !saving.value) return
    event.preventDefault()
    event.returnValue = ''
  }
  const confirmLogout = () => {
    if (!mayLeave({ path: '/login' }, { path: '/admin/editor' })) return false
    permittedPath = '/login'
    return true
  }
  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnload)
    if (logoutGuard) logoutGuard.value = confirmLogout
  })
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', beforeUnload)
    if (logoutGuard?.value === confirmLogout) logoutGuard.value = null
  })

  return {
    snapshot,
    isDirty,
    savedStatus,
    savedSlug,
    stateLabel,
    markLoaded,
    acknowledge,
    permitNavigation: (path: string) => {
      permittedPath = path
    },
  }
}
