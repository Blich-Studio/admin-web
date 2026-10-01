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
NUXT_API_URL=http://localhost:3002
```

### Development Server

Start the development server on `http://localhost:3000`:

```bash
bun run dev
```

The development server includes:
- Hot module replacement (HMR)
- Automatic reloads on file changes
- Client-side rendering for the private CMS
- API proxy for authentication cookie handling

### Type Checking

Run TypeScript type checking:

```bash
bun run typecheck
```

### Linting

Run ESLint to check code style:

```bash
bunx eslint .
```

Fix linting issues automatically:

```bash
bunx eslint . --fix
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
- Writes the server build to `.output` (Docker packaging is a separate step)

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

Browser workflow checks use an isolated local API fixture. Never run mutation checks against production content.

## Deployment

### Google Cloud Run

The application is deployed to Cloud Run using Cloud Build:

1. Merge a checked pull request to the `main` branch
2. Cloud Build automatically triggers the build pipeline (see `cloudbuild.yaml`)
3. Docker image is built and pushed to Artifact Registry
4. Cloud Run service is updated with the new image

### Environment Variables

In Cloud Run settings, configure:

- `NUXT_API_URL` — server-only API gateway base URL (also required during build/type checking)

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
2. Run `bunx eslint . --fix` to fix code style issues
3. Test locally with `bun run dev`
4. Commit changes with clear commit messages
5. Push to feature branch and create a pull request

## License

Licensed under the same license as the Blich Studio project.


## Relaunch session and rendering foundation (2026-09-27)

The server proxy owns HttpOnly access/refresh cookies. It strips token fields from login/refresh responses, coordinates only requests presenting the same refresh credential, and clears cookies on logout even if upstream revocation fails. Temporary refresh-service failures return 503 without discarding cookies. The API gateway must provide `GET /auth/me` and `POST /auth/logout` before deploying this frontend.

Markdown is parsed and then sanitized with an explicit `sanitize-html` allowlist in `app/utils/render-markdown.ts`. Keep CMS previews and public renderers on the same policy. Custom raw HTML, scripts, inline styles, and Markdown iframes are intentionally removed.

Run `bun run test`, `bun run typecheck`, and `bun run build`. Use a local `NUXT_API_URL` (and `NUXT_PUBLIC_API_URL` for existing configurations) when verifying against test data. Never point mutation tests at production.

The private CMS renders on the client (`ssr: false`) and restores identity/role from `/auth/me` before navigation. It does not store or read JWTs in localStorage. Legacy CMS auth keys are removed on restore, login, and logout. Writers/admins can enter; readers use the public site.

## Publishing workflow

Article and project editors show unsaved changes and the last saved visibility. Publishing updates the saved state, and a later save preserves it. The public-page link uses the last saved published slug; draft preview stays inside the Markdown editor.

Save failures retain the form for retry. Creation moves straight to the new editor after success and avoids repeated creates while requests or navigation are pending. Navigation, logout, and closing the tab warn about unsaved changes. These are in-memory drafts, not autosave or offline recovery; browser crashes and concurrent edits in another tab are not covered.

On phones, the CMS menu collapses and editor controls stack vertically.

### CMS icons

Lucide icons are bundled from `@iconify-json/lucide`: source scanning includes used icons in the client bundle, and the same-origin Nuxt icon endpoint serves the local collection for dynamic names. Keep `provider: 'server'` and external fallback disabled: the client-only CMS otherwise defaults to Iconify's external API, which the Content Security Policy deliberately does not allow. Do not broaden CSP to work around missing icons.
