## Admin Panel

Vue 3 + Vite admin UI for editorial workflows. It authenticates against the API Gateway's REST endpoint and can optionally call legacy CMS routes.

### Environment

Copy `.env.example` to `.env`:

```bash
cp apps/admin/.env.example apps/admin/.env
```

Variables:

```env
VITE_API_GATEWAY_URL=http://localhost:3000/api/v1
VITE_CMS_API_URL=http://localhost:3001/api/cms
```

- `VITE_API_GATEWAY_URL` is required for `POST /admin/auth/login` and subsequent editorial proxy calls.
- `VITE_CMS_API_URL` is optional and only used when a component still hits the CMS directly.

### Auth Flow

1. User submits Supabase credentials via the login form.
2. UI calls `POST {VITE_API_GATEWAY_URL}/admin/auth/login`.
3. The returned JWT is stored in the Pinia auth store and attached to future Axios requests via an interceptor.

### Scripts

```bash
npm install       # Install deps
npm run dev       # Start Vite dev server (http://localhost:5174)
npm run build     # Production build
npm run preview   # Preview build output
```
