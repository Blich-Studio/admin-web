// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { defineComponent, reactive, ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { editorLogoutGuardKey } from '../app/utils/editor-navigation'
import { useEditorState } from '../app/composables/useEditorState'

const leave = vi.fn()
const update = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('onBeforeRouteLeave', leave)
  vi.stubGlobal('onBeforeRouteUpdate', update)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function editor(existing = true) {
  const form = reactive({
    title: 'A game',
    slug: 'a-game',
    status: 'draft' as 'draft' | 'published' | 'archived',
    tags: ['design'],
  })
  const saving = ref(false)
  const logoutGuard = ref<(() => boolean) | null>(null)
  let state!: ReturnType<typeof useEditorState<typeof form>>
  const wrapper = mount(
    defineComponent({
      setup() {
        state = useEditorState(form, saving, existing)
        return () => null
      },
    }),
    { global: { provide: { [editorLogoutGuardKey as symbol]: logoutGuard } } },
  )
  return { form, saving, state, wrapper, logoutGuard }
}

it('tracks edits and reverting to the loaded version', () => {
  const { form, state, wrapper } = editor()
  state.markLoaded()
  expect(state.isDirty.value).toBe(false)
  form.title = 'Changed'
  expect(state.stateLabel.value).toBe('Unsaved changes')
  form.title = 'A game'
  expect(state.stateLabel.value).toBe('All changes saved')
  wrapper.unmount()
})

it('snapshots nested values and keeps newer edits dirty after the request succeeds', () => {
  const { form, state, wrapper } = editor()
  state.markLoaded()
  const submitted = state.snapshot()
  form.tags.push('new-tag')
  form.slug = 'newer-slug'
  state.acknowledge(submitted, { status: 'published', slug: 'saved-slug' })
  expect(submitted.tags).toEqual(['design'])
  expect(form.slug).toBe('newer-slug')
  expect(form.status).toBe('published')
  expect(state.savedSlug.value).toBe('saved-slug')
  expect(state.isDirty.value).toBe(true)
  wrapper.unmount()
})

it('becomes clean after publishing and retains the server-confirmed visibility', () => {
  const { form, state, wrapper } = editor()
  state.markLoaded()
  state.acknowledge(state.snapshot(), { status: 'published', slug: 'a-game' })
  expect(form.status).toBe('published')
  expect(state.savedStatus.value).toBe('published')
  expect(state.isDirty.value).toBe(false)
  wrapper.unmount()
})

it('protects both leaving and changing to another editor, respecting cancel', () => {
  const { form, state, wrapper } = editor()
  const confirm = vi.fn().mockReturnValue(false)
  vi.stubGlobal('confirm', confirm)
  state.markLoaded()
  form.title = 'Unfinished'
  const to = { path: '/admin/articles/other' }
  const from = { path: '/admin/articles/current' }
  expect(leave.mock.calls[0]![0](to, from)).toBe(false)
  expect(update.mock.calls[0]![0](to, from)).toBe(false)
  confirm.mockReturnValue(true)
  expect(leave.mock.calls[0]![0](to, from)).toBe(true)
  wrapper.unmount()
})

it('warns on tab close and removes the listener on unmount', () => {
  const { form, state, wrapper } = editor()
  state.markLoaded()
  form.title = 'Unfinished'
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  wrapper.unmount()
  const next = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(next)
  expect(next.defaultPrevented).toBe(false)
})

it('allows only the explicit post-save destination during a pending save', () => {
  const { state, saving, wrapper } = editor(false)
  saving.value = true
  const guard = leave.mock.calls[0]![0]
  const from = { path: '/admin/articles/new' }
  expect(guard({ path: '/admin/projects' }, from)).toBe(false)
  state.permitNavigation('/admin/articles/saved-id')
  expect(guard({ path: '/admin/articles/saved-id' }, from)).toBe(true)
  expect(guard({ path: '/admin/projects' }, from)).toBe(false)
  wrapper.unmount()
})

it('asks before logout, blocks during saving, and permits confirmed logout only once', () => {
  const { form, state, saving, wrapper, logoutGuard } = editor()
  const confirm = vi.fn().mockReturnValue(false)
  vi.stubGlobal('confirm', confirm)
  state.markLoaded()
  form.title = 'Unfinished'
  expect(logoutGuard.value!()).toBe(false)
  confirm.mockReturnValue(true)
  saving.value = true
  expect(logoutGuard.value!()).toBe(false)
  saving.value = false
  expect(logoutGuard.value!()).toBe(true)
  const guard = leave.mock.calls[0]![0]
  const calls = confirm.mock.calls.length
  expect(guard({ path: '/login' }, { path: '/admin/articles/current' })).toBe(true)
  expect(confirm).toHaveBeenCalledTimes(calls)
  wrapper.unmount()
  expect(logoutGuard.value).toBeNull()
})
