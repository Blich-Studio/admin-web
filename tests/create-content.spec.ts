// @vitest-environment happy-dom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { computed, reactive, ref, watch } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import NewArticle from '../app/pages/admin/articles/new.vue'
import NewProject from '../app/pages/admin/projects/new.vue'

const mocks = vi.hoisted(() => ({
  articles: { createArticle: vi.fn(), updateArticle: vi.fn() },
  projects: { createProject: vi.fn(), updateProject: vi.fn() },
  replace: vi.fn(),
}))
vi.mock('~/stores/articles', () => ({ useArticlesStore: () => mocks.articles }))
vi.mock('~/stores/projects', () => ({ useProjectsStore: () => mocks.projects }))
beforeEach(() => {
  vi.resetAllMocks()
  for (const [name, value] of Object.entries({
    computed,
    reactive,
    ref,
    watch,
    definePageMeta: vi.fn(),
    onBeforeRouteLeave: vi.fn(),
    onBeforeRouteUpdate: vi.fn(),
    useRouter: () => ({ replace: mocks.replace }),
  }))
    vi.stubGlobal(name, value)
})
afterEach(() => vi.unstubAllGlobals())

for (const [kind, component, create] of [
  ['articles', NewArticle, mocks.articles.createArticle],
  ['projects', NewProject, mocks.projects.createProject],
] as const) {
  async function prepare() {
    const wrapper = shallowMount(component, {
      global: {
        stubs: [
          'NuxtLink',
          'Icon',
          'MarkdownEditor',
          'ImageUpload',
          'TagSelector',
          'ProjectSelector',
          'GalleryUpload',
          'EditorSaveStatus',
        ],
      },
    })
    await wrapper.find('#editor-title').setValue('A useful game')
    if (kind === 'articles')
      await wrapper.find('#editor-perex').setValue('A useful lesson')
    wrapper
      .findComponent({ name: 'MarkdownEditor' })
      .vm.$emit('update:modelValue', 'A complete piece of writing')
    await flushPromises()
    return wrapper
  }

  it(`${kind}: locks repeat submission until the saved editor opens`, async () => {
    let finish!: (value: unknown) => void
    let navigate!: () => void
    create.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    mocks.replace.mockReturnValue(
      new Promise<void>((resolve) => {
        navigate = resolve
      }),
    )
    const wrapper = await prepare()
    try {
      const save = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Save Draft')!
      await save.trigger('click')
      await save.trigger('click')
      expect(create).toHaveBeenCalledTimes(1)
      finish({ ...create.mock.calls[0]![0], id: 'saved-id' })
      await flushPromises()
      expect(mocks.replace).toHaveBeenCalledWith(`/admin/${kind}/saved-id`)
      expect(save.attributes('disabled')).toBeDefined()
      navigate()
      await flushPromises()
    } finally {
      wrapper.unmount()
    }
  })

  it(`${kind}: keeps a failed creation editable and retries the entered content`, async () => {
    create.mockRejectedValueOnce(new Error('Please try again'))
    create.mockImplementationOnce(async (body) => ({ ...body, id: 'saved-id' }))
    const wrapper = await prepare()
    try {
      const save = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Save Draft')!
      await save.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Please try again')
      expect(
        (wrapper.find('#editor-title').element as HTMLInputElement).value,
      ).toBe('A useful game')
      expect(mocks.replace).not.toHaveBeenCalled()
      await save.trigger('click')
      await flushPromises()
      expect(create).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: 'A useful game', status: 'draft' }),
      )
      expect(mocks.replace).toHaveBeenCalledWith(`/admin/${kind}/saved-id`)
    } finally {
      wrapper.unmount()
    }
  })
}
