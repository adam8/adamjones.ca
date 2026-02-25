const ALLOWED_ORIGINS = new Set(["https://adamjones.ca", "https://www.adamjones.ca"]);
const MAX_TODO_LENGTH = 280;
const MAX_SKETCH_NOTE_LENGTH = 280;
const DEFAULT_SKETCH_PAGE_SIZE = 30;
const MAX_SKETCH_PAGE_SIZE = 200;
const MAX_SKETCH_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_SKETCH_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

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

  const todoIdMatch = url.pathname.match(/^\/todos\/([^/]+)$/);
  if (todoIdMatch && method === "PATCH") {
    return updateTodo(env, request, todoIdMatch[1]);
  }

  if (todoIdMatch && method === "DELETE") {
    return deleteTodo(env, request, todoIdMatch[1]);
  }

  if (url.pathname === "/sketches" && method === "GET") {
    return listSketches(env, request, url);
  }

  if (url.pathname === "/sketches/latest" && method === "GET") {
    return getLatestSketch(env, request);
  }

  if (url.pathname === "/sketches" && method === "POST") {
    return createSketch(env, request);
  }

  if (url.pathname === "/sketches/upload" && method === "POST") {
    return uploadSketch(env, request);
  }

  const sketchIdMatch = url.pathname.match(/^\/sketches\/([^/]+)$/);
  if (sketchIdMatch && method === "PATCH") {
    return updateSketch(env, request, sketchIdMatch[1]);
  }

  if (sketchIdMatch && method === "DELETE") {
    return deleteSketch(env, request, sketchIdMatch[1]);
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

async function listSketches(env, request, url) {
  const limit = parseSketchLimit(url.searchParams.get("limit"));
  if (!limit.ok) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: limit.message } },
      400,
      request
    );
  }

  const beforeParam = sanitizeText(url.searchParams.get("before"));
  let rowsResult;
  if (beforeParam) {
    const before = normalizeIsoTimestamp(beforeParam);
    if (!before) {
      return json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Query parameter before must be a valid timestamp.",
          },
        },
        400,
        request
      );
    }

    rowsResult = await env.DB.prepare(
      "SELECT id, sketch_at, object_key, image_url, content_type, size_bytes, note, created_at, updated_at FROM sketches WHERE sketch_at < ? ORDER BY sketch_at DESC, created_at DESC LIMIT ?"
    )
      .bind(before, limit.value)
      .all();
  } else {
    rowsResult = await env.DB.prepare(
      "SELECT id, sketch_at, object_key, image_url, content_type, size_bytes, note, created_at, updated_at FROM sketches ORDER BY sketch_at DESC, created_at DESC LIMIT ?"
    )
      .bind(limit.value)
      .all();
  }

  const sketches = (rowsResult.results || []).map(normalizeSketchRow);
  return json({ data: sketches }, 200, request);
}

async function getLatestSketch(env, request) {
  const row = await env.DB.prepare(
    "SELECT id, sketch_at, object_key, image_url, content_type, size_bytes, note, created_at, updated_at FROM sketches ORDER BY sketch_at DESC, created_at DESC LIMIT 1"
  ).first();
  return json({ data: normalizeSketchRow(row) }, 200, request);
}

async function createSketch(env, request) {
  const body = await parseJson(request);
  if (!body.ok) {
    return body.response;
  }

  const sketchAtInput = body.value?.sketch_at;
  const sketchAt = normalizeIsoTimestamp(sketchAtInput || new Date().toISOString());
  if (!sketchAt) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "sketch_at must be a valid timestamp.",
        },
      },
      400,
      request
    );
  }

  const objectKey = sanitizeText(body.value?.object_key);
  if (!objectKey || !isValidObjectKey(objectKey)) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "object_key is required and must be a safe object path.",
        },
      },
      400,
      request
    );
  }

  const contentType = sanitizeText(body.value?.content_type).toLowerCase();
  if (!ALLOWED_SKETCH_CONTENT_TYPES.has(contentType)) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "content_type must be an allowed image MIME type.",
        },
      },
      400,
      request
    );
  }

  const sizeBytes = toPositiveInteger(body.value?.size_bytes);
  if (!sizeBytes) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "size_bytes must be a positive integer.",
        },
      },
      400,
      request
    );
  }

  const note = normalizeSketchNote(body.value?.note);
  if (!note.ok) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: note.message } },
      400,
      request
    );
  }

  const imageUrlRaw = sanitizeText(body.value?.image_url);
  const imageUrl = imageUrlRaw || buildSketchImageUrl(env, objectKey);
  if (!isValidHttpUrl(imageUrl)) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            "image_url is required unless SKETCHES_PUBLIC_BASE_URL is configured.",
        },
      },
      400,
      request
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      "INSERT INTO sketches (id, sketch_at, object_key, image_url, content_type, size_bytes, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        sketchAt,
        objectKey,
        imageUrl,
        contentType,
        sizeBytes,
        note.value,
        now,
        now
      )
      .run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "A sketch already exists with this object key.",
          },
        },
        409,
        request
      );
    }
    throw error;
  }

  return json(
    {
      data: {
        id,
        sketch_at: sketchAt,
        object_key: objectKey,
        image_url: imageUrl,
        content_type: contentType,
        size_bytes: sizeBytes,
        note: note.value,
        created_at: now,
        updated_at: now,
      },
    },
    201,
    request
  );
}

async function uploadSketch(env, request) {
  if (!env.SKETCHES_BUCKET) {
    return json(
      {
        error: {
          code: "CONFIG_ERROR",
          message: "SKETCHES_BUCKET binding is not configured.",
        },
      },
      500,
      request
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json(
      {
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Content-Type must be multipart/form-data for uploads.",
        },
      },
      415,
      request
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json(
      { error: { code: "INVALID_FORM_DATA", message: "Malformed multipart payload." } },
      400,
      request
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: "Form field file is required." } },
      400,
      request
    );
  }

  if (file.size <= 0 || file.size > MAX_SKETCH_UPLOAD_BYTES) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `Uploaded image must be between 1 byte and ${MAX_SKETCH_UPLOAD_BYTES} bytes.`,
        },
      },
      400,
      request
    );
  }

  const uploadContentType =
    sanitizeText(form.get("content_type")).toLowerCase() ||
    sanitizeText(file.type).toLowerCase();
  if (!ALLOWED_SKETCH_CONTENT_TYPES.has(uploadContentType)) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Only JPEG, PNG, WEBP, HEIC, and HEIF uploads are supported.",
        },
      },
      400,
      request
    );
  }

  const sketchAtInput = sanitizeText(form.get("sketch_at")) || new Date().toISOString();
  const sketchAt = normalizeIsoTimestamp(sketchAtInput);
  if (!sketchAt) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "sketch_at must be a valid timestamp.",
        },
      },
      400,
      request
    );
  }

  const note = normalizeSketchNote(form.get("note"));
  if (!note.ok) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: note.message } },
      400,
      request
    );
  }

  const explicitObjectKey = sanitizeText(form.get("object_key"));
  const objectKey = explicitObjectKey || buildSketchObjectKey(sketchAt, uploadContentType);
  if (!isValidObjectKey(objectKey)) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "object_key must be a safe object path.",
        },
      },
      400,
      request
    );
  }

  const imageUrl = buildSketchImageUrl(env, objectKey);
  if (!isValidHttpUrl(imageUrl)) {
    return json(
      {
        error: {
          code: "CONFIG_ERROR",
          message:
            "SKETCHES_PUBLIC_BASE_URL is required to produce a public image URL.",
        },
      },
      500,
      request
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const body = await file.arrayBuffer();

  await env.SKETCHES_BUCKET.put(objectKey, body, {
    httpMetadata: { contentType: uploadContentType },
  });

  try {
    await env.DB.prepare(
      "INSERT INTO sketches (id, sketch_at, object_key, image_url, content_type, size_bytes, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        sketchAt,
        objectKey,
        imageUrl,
        uploadContentType,
        file.size,
        note.value,
        now,
        now
      )
      .run();
  } catch (error) {
    await env.SKETCHES_BUCKET.delete(objectKey).catch((cleanupError) => {
      console.error("Failed to delete orphaned sketch object", cleanupError);
    });

    if (isUniqueConstraintError(error)) {
      return json(
        {
          error: {
            code: "CONFLICT",
            message: "A sketch already exists with this object key.",
          },
        },
        409,
        request
      );
    }
    throw error;
  }

  return json(
    {
      data: {
        id,
        sketch_at: sketchAt,
        object_key: objectKey,
        image_url: imageUrl,
        content_type: uploadContentType,
        size_bytes: file.size,
        note: note.value,
        created_at: now,
        updated_at: now,
      },
    },
    201,
    request
  );
}

async function updateSketch(env, request, id) {
  const body = await parseJson(request);
  if (!body.ok) {
    return body.response;
  }

  if (typeof body.value?.note !== "string") {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "PATCH /sketches/:id currently requires a string note field.",
        },
      },
      400,
      request
    );
  }

  const note = normalizeSketchNote(body.value.note);
  if (!note.ok) {
    return json(
      { error: { code: "VALIDATION_ERROR", message: note.message } },
      400,
      request
    );
  }

  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "UPDATE sketches SET note = ?, updated_at = ? WHERE id = ?"
  )
    .bind(note.value, now, id)
    .run();

  if (!result.success || (result.meta && result.meta.changes === 0)) {
    return json(
      { error: { code: "NOT_FOUND", message: "Sketch not found." } },
      404,
      request
    );
  }

  const row = await env.DB.prepare(
    "SELECT id, sketch_at, object_key, image_url, content_type, size_bytes, note, created_at, updated_at FROM sketches WHERE id = ?"
  )
    .bind(id)
    .first();

  return json({ data: normalizeSketchRow(row) }, 200, request);
}

async function deleteSketch(env, request, id) {
  const existing = await env.DB.prepare(
    "SELECT id, object_key FROM sketches WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!existing) {
    return json(
      { error: { code: "NOT_FOUND", message: "Sketch not found." } },
      404,
      request
    );
  }

  await env.DB.prepare("DELETE FROM sketches WHERE id = ?").bind(id).run();
  if (env.SKETCHES_BUCKET && existing.object_key) {
    await env.SKETCHES_BUCKET.delete(existing.object_key).catch((error) => {
      console.error("Failed to delete sketch object from R2", error);
    });
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

function normalizeSketchRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sketch_at: row.sketch_at,
    object_key: row.object_key,
    image_url: row.image_url,
    content_type: row.content_type,
    size_bytes: row.size_bytes,
    note: row.note || "",
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

function normalizeIsoTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseSketchLimit(rawValue) {
  if (rawValue == null || rawValue === "") {
    return { ok: true, value: DEFAULT_SKETCH_PAGE_SIZE };
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_SKETCH_PAGE_SIZE) {
    return {
      ok: false,
      message: `Query parameter limit must be an integer between 1 and ${MAX_SKETCH_PAGE_SIZE}.`,
    };
  }
  return { ok: true, value: parsed };
}

function normalizeSketchNote(value) {
  if (value == null || value === "") {
    return { ok: true, value: "" };
  }
  if (typeof value !== "string") {
    return { ok: false, message: "note must be a string." };
  }
  const note = value.trim();
  if (note.length > MAX_SKETCH_NOTE_LENGTH) {
    return {
      ok: false,
      message: `note must be ${MAX_SKETCH_NOTE_LENGTH} characters or less.`,
    };
  }
  return { ok: true, value: note };
}

function toPositiveInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function buildSketchImageUrl(env, objectKey) {
  const base = sanitizePublicBaseUrl(env.SKETCHES_PUBLIC_BASE_URL);
  if (!base) return "";
  const encodedKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${encodedKey}`;
}

function sanitizePublicBaseUrl(value) {
  const base = sanitizeText(value).replace(/\/+$/, "");
  if (!base) return "";
  if (!isValidHttpUrl(base)) return "";
  return base;
}

function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function extensionForContentType(contentType) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "img";
  }
}

function buildSketchObjectKey(sketchAtIso, contentType) {
  const dt = new Date(sketchAtIso);
  const year = String(dt.getUTCFullYear());
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const hour = String(dt.getUTCHours()).padStart(2, "0");
  const minute = String(dt.getUTCMinutes()).padStart(2, "0");
  const second = String(dt.getUTCSeconds()).padStart(2, "0");
  const ext = extensionForContentType(contentType);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `sketches/${year}/${month}/${year}-${month}-${day}-${hour}${minute}${second}-${suffix}.${ext}`;
}

function isValidObjectKey(value) {
  if (typeof value !== "string") return false;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_\-.]{1,511}$/.test(value)) return false;
  return !value.includes("..");
}

function isUniqueConstraintError(error) {
  const message = String(error && error.message ? error.message : error);
  return message.toUpperCase().includes("UNIQUE");
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
