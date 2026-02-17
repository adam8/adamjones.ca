# To-Do Card Feature Checklist

## Repo Structure
- [ ] Keep implementation in this repository.
- [ ] Create API worker at `workers/todos-api/`.
- [ ] Keep card hydration logic in `public/js/todo-card.js`.
- [ ] Keep dashboard HTML fallback in `public/index.html`.

## Cloudflare / D1 Setup
- [ ] Create D1 database for to-dos in Cloudflare.
- [ ] Set the DB name and ID in `workers/todos-api/wrangler.toml`.
- [ ] Run local and remote migrations.
- [ ] Set a Cloudflare Worker route for `api.adamjones.ca/*`.

## Database
- [ ] Apply `workers/todos-api/migrations/0001_create_todos.sql`.
- [ ] Confirm constraints reject blank text and invalid completed values.
- [ ] Seed a few rows for manual testing.

## API (Worker)
- [ ] Implement `GET /todos`.
- [ ] Implement `POST /todos`.
- [ ] Implement `PATCH /todos/:id`.
- [ ] Implement `DELETE /todos/:id`.
- [ ] Keep response and error JSON format consistent.
- [ ] Enforce CORS allowlist for dashboard origin only.
- [ ] Enforce JSON body and payload validation on write routes.

## Security
- [ ] Protect `api.adamjones.ca` with Cloudflare Access.
- [ ] Restrict access policy to your identity.
- [ ] Verify unauthenticated requests are blocked.
- [ ] Verify authenticated browser requests succeed.

## Dashboard Card (Fallback + Hydration)
- [ ] Keep to-do card hard-coded in `public/index.html`.
- [ ] Render at least 2 fallback items in HTML.
- [ ] Hydrate from API after page load with timeout.
- [ ] Keep fallback HTML visible if hydration fails.
- [ ] Enable add, toggle, and delete actions after hydration.
- [ ] Roll back optimistic UI updates when writes fail.

## UX / Accessibility
- [ ] Ensure keyboard access for add, toggle, and delete controls.
- [ ] Ensure mobile tap targets are usable.
- [ ] Ensure error and sync status messaging is visible and concise.

## Validation and Testing
- [ ] Manually test desktop + mobile on production domain.
- [ ] Confirm cross-device data sync.
- [ ] Confirm API failure keeps static list visible.
- [ ] Confirm no uncaught browser console errors.

## Launch
- [ ] Deploy worker and dashboard update.
- [ ] Verify production API CORS and Access behavior.
- [ ] Monitor Worker logs and error counts during first week.
