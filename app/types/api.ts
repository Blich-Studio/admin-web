// Minimal CMS API types used across the admin UI.

export interface ApiMeta {
  total?: number
  page?: number
  limit?: number
  totalPages?: number
  hasNext?: boolean
  hasPrev?: boolean
}

export interface ApiResponse<T> {
  data: T
  meta?: ApiMeta
}

export interface Author {
  id: string
  displayName: string
  avatarUrl: string | null
}

export interface Tag {
  id: string
  name: string
  slug?: string
  description?: string | null
  createdAt: string
  updatedAt?: string
}

export interface FileMetadata {
  name: string
  url: string
  size?: number
  contentType?: string
  createdAt?: string
}

export interface ArticleListItem {
  id: string
  title: string
  slug: string
  perex?: string
  coverImageUrl?: string | null
  author?: Author
  status?: 'draft' | 'published' | 'archived'
  tags: Tag[]
  likesCount?: number
  viewsCount?: number
  publishedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface Article extends ArticleListItem {
  content?: string
  isLiked?: boolean
}

export interface CreateArticleDto {
  title: string
  slug?: string
  perex?: string
  content?: string
  coverImageUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
  tags?: string[]
}

export type UpdateArticleDto = Partial<CreateArticleDto>

export interface ProjectListItem {
  id: string
  title: string
  slug: string
  shortDescription?: string | null
  coverImageUrl?: string | null
  author?: Author
  status?: 'draft' | 'published' | 'archived'
  featured?: boolean
  tags: Tag[]
  likesCount?: number
  viewsCount?: number
  publishedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface Project extends ProjectListItem {
  description?: string
  galleryUrls?: string[]
  videoUrl?: string | null
  externalUrl?: string | null
  githubUrl?: string | null
  isLiked?: boolean
}

export interface CreateProjectDto {
  title: string
  slug?: string
  description?: string
  shortDescription?: string | null
  coverImageUrl?: string | null
  galleryUrls?: string[]
  videoUrl?: string | null
  externalUrl?: string | null
  githubUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
  featured?: boolean
  tags?: string[]
}

export type UpdateProjectDto = Partial<CreateProjectDto>

