# Todos API Worker

## Files
- `src/index.js`: Worker route handlers and validation stubs.
- `migrations/0001_create_todos.sql`: Initial D1 schema.
- `wrangler.toml`: Worker and D1 binding config.

## Before Deploy
1. Replace `database_id` in `wrangler.toml`.
2. Ensure route for this worker is attached to `api.adamjones.ca/*`.
3. Put the API application behind Cloudflare Access.

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
