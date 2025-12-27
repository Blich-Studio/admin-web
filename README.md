# Blich CMS

A modern content management system built with **Nuxt 4**, **Vue 3**, and **TypeScript**, designed to manage articles, projects, comments, tags, and media assets for the Blich Studio platform.

## Features

- 📝 **Article Management** — Create, edit, and publish articles with rich markdown editor and cover images
- 🎨 **Project Management** — Showcase portfolio projects with galleries, videos, and external links
- 🏷️ **Tag System** — Organize content with a flexible tagging system
- 💬 **Comment Moderation** — Review and manage user comments
- 👥 **User Management** — Administer users, roles, and permissions
- 📊 **Activity Feed** — Track content changes and user interactions
- 🖼️ **Media Library** — Upload, browse, and manage image assets with inline insertion into article markdown
- 🔐 **Authentication** — Secure JWT-based authentication with role-based access control
- 📱 **Responsive Design** — Works seamlessly on desktop and tablet devices

## Tech Stack

- **Framework**: Nuxt 4 (Vue 3)
- **Language**: TypeScript
- **Package Manager**: bun
- **Build Tool**: Vite
- **State Management**: Pinia
- **HTTP Client**: $fetch (native Nuxt)
- **Backend**: NestJS API Gateway
- **Styling**: Sass (custom design system)
- **Deployment**: Docker + Google Cloud Run

## Setup

Install dependencies:

```bash
bun install
```

## Development

### Environment Setup

Create or update `.env` with the following variables:

```env
NUXT_PUBLIC_API_URL=http://localhost:3000/api/_proxy
```

For production, set:

```env
NUXT_PUBLIC_API_URL=https://api.blichstudio.com
```

### Development Server

Start the development server on `http://localhost:3000`:

```bash
bun run dev
```

The development server includes:
- Hot module replacement (HMR)
- Automatic reloads on file changes
- Server-side rendering (SSR) for SEO
- API proxy for authentication cookie handling

### Type Checking

Run TypeScript type checking:

```bash
bun run typecheck
```

### Linting

Run ESLint to check code style:

```bash
bun run lint
```

Fix linting issues automatically:

```bash
bun run lint:fix
```

## Production

### Build

Build the application for production:

```bash
bun run build
```

The build process:
- Compiles TypeScript
- Bundles Vue components
- Optimizes assets
- Generates production-ready Docker image

### Docker Build

Build and tag the Docker image:

```bash
docker build -t blich-cms:latest .
```

The Dockerfile uses a multi-stage build:
- **Builder stage**: Installs dependencies and builds the Nuxt application
- **Runner stage**: Minimal runtime image with only production artifacts

### Preview

Locally preview the production build:

```bash
bun run preview
```

## Architecture

### Pages

- `/admin` — Dashboard with recent articles and statistics
- `/admin/articles` — Article list and management
- `/admin/articles/[id]` — Article editor with markdown and image picker
- `/admin/projects` — Project list and management
- `/admin/projects/[id]` — Project editor
- `/admin/tags` — Tag list and editor
- `/admin/comments` — Comment moderation interface
- `/admin/users` — User management
- `/admin/activity` — Activity feed and audit log
- `/admin/media` — Media library with upload and browsing

### Components

- **MarkdownEditor** — Rich text editor with live preview and inline image insertion
- **ImagePicker** — Reusable image selection and upload component
- **CommentSection** — Comment display and moderation interface
- **Navigation** — Admin sidebar navigation
- **Footer** — Application footer with version info

### Stores (Pinia)

- `auth` — User authentication and session management
- `articles` — Article CRUD operations
- `projects` — Project CRUD operations
- `tags` — Tag management
- `comments` — Comment moderation
- `users` — User administration
- `stats` — Dashboard statistics

### API Integration

The CMS communicates with the **api-gateway** backend through a server-side proxy at `/api/_proxy`, which:
- Forwards requests to the real backend
- Handles cookie-based authentication for SSR
- Preserves session across server and client rendering

API endpoints used:
- `POST /articles` — Create article
- `PUT /articles/:id` — Update article
- `GET /articles` — List articles
- `DELETE /articles/:id` — Delete article
- `POST /uploads/file` — Upload media file
- `GET /uploads/files/:folder` — List files in folder
- `PUT /users/:id/role` — Update user role
- And more...

## Media Management

### Uploading Images

1. Navigate to **Admin > Media** to upload images
2. Use the file upload dialog to select images from your computer
3. Images are stored in Google Cloud Storage and served via CDN

### Inline Image Insertion

1. In the article editor, click the **image icon** in the markdown toolbar
2. Select an existing image from the media library or upload a new one
3. The image will be inserted as markdown syntax: `![alt](url)`
4. The live preview shows the rendered image immediately

## Type Safety

All API responses and component props are fully typed with TypeScript. Key types are defined in `app/types/api.ts`:

- `Article` — Complete article object
- `ArticleListItem` — Lightweight article for lists
- `Project` / `ProjectListItem` — Project types
- `Tag` — Tag definition
- `FileMetadata` — Media file information
- `ApiResponse<T>` — Standard API wrapper
- `ApiMeta` — Pagination metadata

## Authentication & Authorization

The CMS uses JWT tokens stored in HTTP-only cookies for security:

- **Roles**: `reader` (view-only), `writer` (create/edit), `admin` (full access)
- **SSR-Aware**: Cookies are forwarded on server-side requests
- **Secure by Default**: No tokens stored in localStorage

Login is handled by the backend's `/auth/login` endpoint. The CMS checks authentication on startup via `useAuthStore` and redirects unauthenticated users to login.

## Testing

Run tests with:

```bash
bun run test
```

Run end-to-end tests:

```bash
bun run test:e2e
```

## Deployment

### Google Cloud Run

The application is deployed to Cloud Run using Cloud Build:

1. Push code to the `development` branch
2. Cloud Build automatically triggers the build pipeline (see `cloudbuild.yaml`)
3. Docker image is built and pushed to Artifact Registry
4. Cloud Run service is updated with the new image

### Environment Variables

In Cloud Run settings, configure:

- `NUXT_PUBLIC_API_URL` — API gateway base URL (must be set at runtime for SSR)

### Monitoring

Check deployment status in the Google Cloud Console:
- **Cloud Build**: View build logs and history
- **Cloud Run**: Monitor traffic, errors, and performance metrics
- **Artifact Registry**: Manage container images

## Documentation

- [Nuxt Documentation](https://nuxt.com/docs)
- [Vue 3 Guide](https://vuejs.org/)
- [Pinia Store Documentation](https://pinia.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)

## Contributing

When making changes:

1. Run `bun run typecheck` to ensure no TypeScript errors
2. Run `bun run lint:fix` to fix code style issues
3. Test locally with `bun run dev`
4. Commit changes with clear commit messages
5. Push to feature branch and create a pull request

## License

Licensed under the same license as the Blich Studio project.
