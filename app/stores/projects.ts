import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import type {
  Project,
  ProjectListItem,
  CreateProjectDto,
  UpdateProjectDto,
  ApiMeta,
} from '~/types/api'

// Response shape for list endpoints (after useApi unwraps outer { data })
interface ListResponse<T> {
  data: T[]
  meta?: ApiMeta
}

interface ProjectsState {
  projects: ProjectListItem[]
  currentProject: Project | null
  meta: ApiMeta | null
  loading: boolean
  error: string | null
}

export const useProjectsStore = defineStore('projects', {
  state: (): ProjectsState => ({
    projects: [],
    currentProject: null,
    meta: null,
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch paginated list of projects (all statuses for CMS)
     * Writers can only see their own projects, admins can see all
     */
    async fetchProjects(options?: {
      page?: number
      limit?: number
      status?: 'draft' | 'published' | 'archived'
      search?: string
      featured?: boolean
      authorId?: string
    }) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        const authStore = useAuthStore()

        // Writers can only see their own projects unless explicitly requesting another author
        // Admins can see all projects
        const authorId = authStore.isAdmin 
          ? options?.authorId 
          : authStore.user?.id

        // List endpoints return { data: [...], meta: {...} } after unwrap
        const response = await api.get<ListResponse<ProjectListItem>>('/projects', {
          page: options?.page ?? 1,
          limit: options?.limit ?? 20,
          status: options?.status,
          search: options?.search,
          featured: options?.featured,
          authorId,
        })

        this.projects = response.data
        this.meta = response.meta ?? null
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch projects'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single project by ID
     */
    async fetchProject(id: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        // Single item endpoints return the item directly after unwrap
        const project = await api.get<Project>(`/projects/${id}`)
        this.currentProject = project
        return project
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch project'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new project
     */
    async createProject(data: CreateProjectDto) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        // POST returns the created item directly after unwrap
        const project = await api.post<Project>('/projects', data as unknown as Record<string, unknown>)
        return project
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create project'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Update an existing project
     */
    async updateProject(id: string, data: UpdateProjectDto) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        // PUT returns the updated item directly after unwrap
        const project = await api.put<Project>(`/projects/${id}`, data as unknown as Record<string, unknown>)
        this.currentProject = project
        return project
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update project'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Delete a project
     */
    async deleteProject(id: string) {
      this.loading = true
      this.error = null

      try {
        const api = useApi()
        await api.delete(`/projects/${id}`)
        // Remove from local state
        this.projects = this.projects.filter(p => p.id !== id)
        if (this.currentProject?.id === id) {
          this.currentProject = null
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to delete project'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Clear current project state
     */
    clearCurrentProject() {
      this.currentProject = null
    },
  },
})
