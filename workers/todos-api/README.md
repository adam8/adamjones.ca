# Todos API Worker

## Files
- `src/index.js`: Worker route handlers and validation stubs.
- `migrations/0001_create_todos.sql`: To-do schema.
- `migrations/0002_create_sketches.sql`: Daily sketch schema.
- `wrangler.toml`: Worker, D1, R2, and env var config.

## Before Deploy
1. Replace `database_id` in `wrangler.toml`.
2. Ensure route for this worker is attached to `api.adamjones.ca/*`.
3. Put the API application behind Cloudflare Access.
4. Create and bind an R2 bucket for sketch uploads.
5. Set `SKETCHES_PUBLIC_BASE_URL` to your public asset domain.

## Local Commands
```bash
npx wrangler d1 migrations apply adamjones_todos --local
npx wrangler dev
```

## Remote Commands
```bash
npx wrangler d1 migrations apply adamjones_todos --remote
npx wrangler deploy
```

## API Endpoints
- `GET /` basic service metadata
- `GET /health` health check
- `GET /todos`
- `POST /todos` body: `{ "text": "..." }`
- `PATCH /todos/:id` body: `{ "completed": true|false }`
- `DELETE /todos/:id`
- `GET /sketches?limit=30&before=<ISO-8601>`
- `GET /sketches/latest`
- `POST /sketches` body: `{ "sketch_at", "object_key", "content_type", "size_bytes", "image_url"?, "note"? }`
- `POST /sketches/upload` multipart form fields: `file` + optional `sketch_at`, `note`, `object_key`
- `PATCH /sketches/:id` body: `{ "note": "..." }`
- `DELETE /sketches/:id`
