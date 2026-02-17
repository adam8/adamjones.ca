const ALLOWED_ORIGINS = new Set(["https://adamjones.ca", "https://www.adamjones.ca"]);
const MAX_TODO_LENGTH = 280;

export default {
  async fetch(request, env) {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      console.error("Unhandled error", error);
      return json(
        { error: { code: "INTERNAL_ERROR", message: "Unexpected server error." } },
        500,
        request
      );
    }
  },
};

async function routeRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return corsPreflight(request);
  }

  if (url.pathname === "/" && method === "GET") {
    return json({ ok: true, service: "todos-api" }, 200, request);
  }

  if (url.pathname === "/health" && method === "GET") {
    return json({ ok: true }, 200, request);
  }

  if (url.pathname === "/todos" && method === "GET") {
    return listTodos(env, request);
  }

  if (url.pathname === "/todos" && method === "POST") {
    return createTodo(env, request);
  }

  const idMatch = url.pathname.match(/^\/todos\/([^/]+)$/);
  if (idMatch && method === "PATCH") {
    return updateTodo(env, request, idMatch[1]);
  }

  if (idMatch && method === "DELETE") {
    return deleteTodo(env, request, idMatch[1]);
  }

  return json(
    { error: { code: "NOT_FOUND", message: "Route not found." } },
    404,
    request
  );
}

async function listTodos(env, request) {
  const result = await env.DB.prepare(
    "SELECT id, text, completed, created_at, updated_at FROM todos ORDER BY updated_at DESC"
  ).all();

  const todos = (result.results || []).map(normalizeTodoRow);
  return json({ data: todos }, 200, request);
}

async function createTodo(env, request) {
  const body = await parseJson(request);
  if (!body.ok) {
    return body.response;
  }

  const text = sanitizeText(body.value.text);
  if (!text) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Todo text is required." } },
      400,
      request
    );
  }

  if (text.length > MAX_TODO_LENGTH) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `Todo text must be ${MAX_TODO_LENGTH} characters or less.`,
        },
      },
      400,
      request
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO todos (id, text, completed, created_at, updated_at) VALUES (?, ?, 0, ?, ?)"
  )
    .bind(id, text, now, now)
    .run();

  return json(
    {
      data: {
        id,
        text,
        completed: false,
        created_at: now,
        updated_at: now,
      },
    },
    201,
    request
  );
}

async function updateTodo(env, request, id) {
  const body = await parseJson(request);
  if (!body.ok) {
    return body.response;
  }

  const completed = body.value?.completed;
  if (typeof completed !== "boolean") {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "PATCH /todos/:id currently requires a boolean completed field.",
        },
      },
      400,
      request
    );
  }

  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "UPDATE todos SET completed = ?, updated_at = ? WHERE id = ?"
  )
    .bind(completed ? 1 : 0, now, id)
    .run();

  if (!result.success || (result.meta && result.meta.changes === 0)) {
    return json(
      { error: { code: "NOT_FOUND", message: "Todo not found." } },
      404,
      request
    );
  }

  const updated = await env.DB.prepare(
    "SELECT id, text, completed, created_at, updated_at FROM todos WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ data: normalizeTodoRow(updated) }, 200, request);
}

async function deleteTodo(env, request, id) {
  const result = await env.DB.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();

  if (!result.success || (result.meta && result.meta.changes === 0)) {
    return json(
      { error: { code: "NOT_FOUND", message: "Todo not found." } },
      404,
      request
    );
  }

  return json({ data: { id, deleted: true } }, 200, request);
}

function normalizeTodoRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    text: row.text,
    completed: row.completed === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function parseJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be application/json.",
          },
        },
        415,
        request
      ),
    };
  }

  try {
    const value = await request.json();
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      response: json(
        { error: { code: "INVALID_JSON", message: "Malformed JSON body." } },
        400,
        request
      ),
    };
  }
}

function sanitizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function corsPreflight(request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function json(payload, status, request) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
  };
  const origin = request.headers.get("origin");
  if (isAllowedOrigin(origin)) {
    Object.assign(headers, corsHeaders(origin));
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return /^https:\/\/([a-z0-9-]+\.)?adamjones\.ca$/i.test(origin);
}
