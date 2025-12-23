// Shared API types for the CMS

// Pagination metadata
export interface ApiMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// API response wrapper
export interface ApiResponse<T> {
  data: T
  meta?: ApiMeta
}

// Author info
export interface Author {
  id: string
  displayName: string
  avatarUrl: string | null
}

// Tag
export interface Tag {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// Article list item (for listing)
export interface ArticleListItem {
  id: string
  title: string
  slug: string
  perex: string
  coverImageUrl: string | null
  author: Author
  status: 'draft' | 'published' | 'archived'
  likesCount: number
  viewsCount: number
  tags: Tag[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// Full article (with content)
export interface Article extends ArticleListItem {
  content: string
  isLiked?: boolean
}

// Create/Update article DTO
export interface CreateArticleDto {
  title: string
  slug?: string
  perex: string
  content: string
  coverImageUrl?: string | null
  status: 'draft' | 'published' | 'archived'
  tags: string[] // tag names
}

export interface UpdateArticleDto {
  title?: string
  slug?: string
  perex?: string
  content?: string
  coverImageUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
  tags?: string[]
}

// Project types
export interface ProjectListItem {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  coverImageUrl: string | null
  author: Author
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  likesCount: number
  viewsCount: number
  tags: Tag[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Project extends ProjectListItem {
  description: string
  galleryUrls: string[]
  videoUrl: string | null
  externalUrl: string | null
  githubUrl: string | null
  isLiked?: boolean
}

export interface CreateProjectDto {
  title: string
  slug?: string
  description: string
  shortDescription?: string | null
  coverImageUrl?: string | null
  galleryUrls?: string[]
  videoUrl?: string | null
  externalUrl?: string | null
  githubUrl?: string | null
  status: 'draft' | 'published' | 'archived'
  featured?: boolean
  tags: string[]
}

export interface UpdateProjectDto {
  title?: string
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

// Comment types
export interface CommentUser {
  id: string
  displayName: string
  avatarUrl: string | null
}

export interface Comment {
  id: string
  content: string
  user: CommentUser
  userId: string
  articleId: string | null
  projectId: string | null
  parentId: string | null
  status: 'pending' | 'approved' | 'rejected' | 'spam'
  likesCount: number
  isLiked?: boolean
  replies?: Comment[]
  createdAt: string
  updatedAt: string
}
