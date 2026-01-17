import { defineStore } from 'pinia'
import type { Tag } from '~/types/api'

interface TagsState {
  tags: Tag[]
  loading: boolean
  error: string | null
}

export const useTagsStore = defineStore('tags', {
  state: (): TagsState => ({
    tags: [],
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch all tags
     */
    async fetchTags() {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const response: unknown = await api.get('/tags')

        // `useApi()` may unwrap the outer `{ data: ... }` for us.
        // Support both shapes: either `Tag[]` or `{ data: Tag[] }`.
        if (Array.isArray(response)) {
          this.tags = response
        } else if (
          response &&
          typeof response === 'object' &&
          'data' in response &&
          Array.isArray((response as Record<string, unknown>).data)
        ) {
          this.tags = (response as Record<string, unknown>).data as Tag[]
        } else {
          this.tags = []
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch tags'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new tag
     */
    async createTag(name: string, description?: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const tag = await api.post<Tag>('/tags', { name, description })
        this.tags.push(tag)
        return tag
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create tag'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete a tag
     */
    async deleteTag(id: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        await api.delete(`/tags/${id}`)
        this.tags = this.tags.filter(t => t.id !== id)
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete tag'
        throw err
      } finally {
        this.loading = false
      }
    },
  },
})
