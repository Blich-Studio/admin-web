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
  featured?: boolean
  tags: Tag[]
  likesCount?: number
  viewsCount?: number
  projectId?: string | null
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
  featured?: boolean
  tags?: string[]
  projectId?: string | null
}

export type UpdateArticleDto = Partial<CreateArticleDto>

export type ProjectType = 'game' | 'engine' | 'tool' | 'animation' | 'artwork' | 'other'
export type ProjectChannel = 'sound' | 'motion' | 'play'
export type ProjectPlatform =
  | 'soundcloud'
  | 'youtube'
  | 'dailymotion'
  | 'vimeo'
  | 'peertube'
  | 'itchio'
  | 'steam'
  | 'internet_archive'
  | 'github'
  | 'codeberg'
  | 'other'
export type ProjectLicense =
  | 'cc0-1.0'
  | 'cc-by-4.0'
  | 'cc-by-sa-4.0'
  | 'cc-by-nc-4.0'
  | 'cc-by-nc-sa-4.0'
  | 'mit'
  | 'apache-2.0'
  | 'gpl-3.0'
  | 'proprietary'
  | 'other'

export interface ProjectListItem {
  id: string
  title: string
  slug: string
  type?: ProjectType
  channel?: ProjectChannel | null
  platform?: ProjectPlatform | null
  externalUrl?: string | null
  embedUrl?: string | null
  license?: ProjectLicense | null
  archiveUrl?: string | null
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
  githubUrl?: string | null
  itchioUrl?: string | null
  steamUrl?: string | null
  youtubeUrl?: string | null
  isLiked?: boolean
}

export interface CreateProjectDto {
  title: string
  slug?: string
  type?: ProjectType
  channel?: ProjectChannel | null
  platform?: ProjectPlatform | null
  externalUrl?: string | null
  embedUrl?: string | null
  license?: ProjectLicense | null
  archiveUrl?: string | null
  description?: string
  shortDescription?: string | null
  coverImageUrl?: string | null
  galleryUrls?: string[]
  githubUrl?: string | null
  itchioUrl?: string | null
  steamUrl?: string | null
  youtubeUrl?: string | null
  status?: 'draft' | 'published' | 'archived'
  featured?: boolean
  tags?: string[]
}

export type UpdateProjectDto = Partial<CreateProjectDto>
