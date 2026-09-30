// @vitest-environment happy-dom
import { shallowMount, flushPromises } from '@vue/test-utils'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ArticleEditor from '../app/pages/admin/articles/[id].vue'
import ProjectEditor from '../app/pages/admin/projects/[id].vue'

const stores = vi.hoisted(() => ({ articles: { fetchArticle: vi.fn(), updateArticle: vi.fn() }, projects: { fetchProject: vi.fn(), updateProject: vi.fn() } }))
vi.mock('~/stores/articles', () => ({ useArticlesStore: () => stores.articles }))
vi.mock('~/stores/projects', () => ({ useProjectsStore: () => stores.projects }))
const draft = { title: 'Test game', slug: 'test-game', perex: 'Summary', content: 'Article body', description: 'Game description', type: 'game', status: 'draft', tags: [] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  for (const [name, value] of Object.entries({ computed, onMounted, reactive, ref, watch, definePageMeta: vi.fn(), onBeforeRouteLeave: vi.fn(), onBeforeRouteUpdate: vi.fn(), useRoute: () => ({ params: { id: 'content-id' } }), useRouter: () => ({ push: vi.fn() }) })) vi.stubGlobal(name, value)
  stores.articles.fetchArticle.mockResolvedValue(draft)
  stores.projects.fetchProject.mockResolvedValue(draft)
  stores.articles.updateArticle.mockImplementation(async (_id, body) => ({ ...body }))
  stores.projects.updateProject.mockImplementation(async (_id, body) => ({ ...body }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

for (const [name, component, save] of [
  ['article', ArticleEditor, stores.articles.updateArticle],
  ['project', ProjectEditor, stores.projects.updateProject],
] as const) {
  describe(`${name} publishing`, () => {
    const mount = () => shallowMount(component, { global: { stubs: ['NuxtLink', 'Icon', 'MarkdownEditor', 'ImageUpload', 'TagInput', 'TagSelector', 'ProjectSelector', 'GalleryUpload', 'EditorSaveStatus'] } })
    it('keeps published status when the editor saves again', async () => {
      const wrapper = mount()
      try {
        await flushPromises()
        await wrapper.findAll('button').find(button => button.text() === 'Publish')!.trigger('click')
        await flushPromises()
        expect(save).toHaveBeenLastCalledWith('content-id', expect.objectContaining({ status: 'published' }))
        expect(wrapper.findAll('button').some(button => button.text() === 'Publish')).toBe(false)
        await wrapper.findAll('button').find(button => /^Save/.test(button.text()))!.trigger('click')
        await flushPromises()
        expect(save).toHaveBeenCalledTimes(2)
        expect(save).toHaveBeenLastCalledWith('content-id', expect.objectContaining({ status: 'published' }))
      } finally { wrapper.unmount() }
    })

    it('keeps the draft editable when publishing fails', async () => {
      save.mockRejectedValueOnce(new Error('Unable to publish'))
      const wrapper = mount()
      try {
        await flushPromises()
        await wrapper.findAll('button').find(button => button.text() === 'Publish')!.trigger('click')
        await flushPromises()
        expect(wrapper.text()).toContain('Unable to publish')
        await wrapper.findAll('button').find(button => /^Save/.test(button.text()))!.trigger('click')
        await flushPromises()
        expect(save).toHaveBeenLastCalledWith('content-id', expect.objectContaining({ status: 'draft' }))
      } finally { wrapper.unmount() }
    })
  })
}
