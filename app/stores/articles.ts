import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import type {
  Article,
  ArticleListItem,
  CreateArticleDto,
  UpdateArticleDto,
  ApiMeta,
} from '~/types/api'

// Response shape for list endpoints (after useApi unwraps outer { data })
interface ListResponse<T> {
  data: T[]
  meta?: ApiMeta
}

interface ArticlesState {
  articles: ArticleListItem[]
  currentArticle: Article | null
  meta: ApiMeta | null
  loading: boolean
  error: string | null
}

export const useArticlesStore = defineStore('articles', {
  state: (): ArticlesState => ({
    articles: [],
    currentArticle: null,
    meta: null,
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch paginated list of articles (all statuses for CMS)
     * Writers can only see their own articles, admins can see all
     */
    async fetchArticles(options?: {
      page?: number
      limit?: number
      status?: 'draft' | 'published' | 'archived'
      search?: string
      authorId?: string
    }) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const authStore = useAuthStore()

        // Writers can only see their own articles unless explicitly requesting another author
        // Admins can see all articles
        const authorId = authStore.isAdmin 
          ? options?.authorId 
          : authStore.user?.id

        // List endpoints return { data: [...], meta: {...} } after unwrap
        const response = await api.get<ListResponse<ArticleListItem>>('/articles', {
          page: options?.page ?? 1,
          limit: options?.limit ?? 20,
          status: options?.status,
          search: options?.search,
          authorId,
        })

        // Defensive: ensure `articles` is always an array and `meta` proper shape
        this.articles = Array.isArray(response.data) ? response.data : []
        this.meta = response.meta ?? null
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch articles'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single article by ID
     */
    async fetchArticle(id: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        // Single item endpoints return the item directly after unwrap
        const article = await api.get<Article>(`/articles/${id}`)
        this.currentArticle = article
        return article
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch article'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new article
     */
    async createArticle(data: CreateArticleDto) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        // POST returns the created item directly after unwrap
        const article = await api.post<Article>('/articles', data as unknown as Record<string, unknown>)
        return article
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create article'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Update an existing article
     */
    async updateArticle(id: string, data: UpdateArticleDto) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        // PUT returns the updated item directly after unwrap
        const article = await api.put<Article>(`/articles/${id}`, data as unknown as Record<string, unknown>)
        this.currentArticle = article

        // Update in list if present
        const index = this.articles.findIndex(a => a.id === id)
        if (index !== -1) {
          this.articles[index] = article
        }

        return article
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update article'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete an article
     */
    async deleteArticle(id: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        await api.delete(`/articles/${id}`)

        // Remove from list
        this.articles = this.articles.filter(a => a.id !== id)
        if (this.currentArticle?.id === id) {
          this.currentArticle = null
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete article'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Clear current article
     */
    clearCurrent() {
      this.currentArticle = null
    },
  },
})
