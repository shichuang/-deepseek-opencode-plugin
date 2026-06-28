/**
 * JSON Schema Canonicalizer — Ported from DeepSeek-Reasonix.
 *
 * DeepSeek's API is sensitive to JSON Schema ordering. Two logically
 * identical schemas with different key ordering produce different
 * cache prefixes and can cause 400 errors.
 */

type JsonObj = Record<string, unknown>

// ── Public API ──────────────────────────────────────────────────────

export function canonicalizeSchema(schema: unknown): JsonObj {
  if (schema === undefined || schema === null || (typeof schema === "string" && schema === "")) {
    return { type: "object" }
  }
  if (typeof schema !== "object" || Array.isArray(schema)) {
    return { type: "object" }
  }
  return canonicalizeObject(schema as JsonObj) as JsonObj
}

export function canonicalizeSchemaString(schema: unknown): string {
  return JSON.stringify(canonicalizeSchema(schema))
}

// ── Core recursive canonicalizer ────────────────────────────────────

type SchemaKey = string

const NAMED_SCHEMA_KEYS = new Set<SchemaKey>([
  "properties", "patternProperties", "$defs", "definitions", "dependentSchemas",
])

const RECURSIVE_KEYS = new Set<SchemaKey>([
  "items", "additionalItems", "contains", "not", "if", "then", "else",
  "propertyNames", "unevaluatedProperties", "additionalProperties",
  "allOf", "anyOf", "oneOf", "prefixItems",
])

function canonicalizeObject(obj: JsonObj): unknown {
  if (Array.isArray(obj)) return obj.map(canonicalizeObject)

  const result: JsonObj = {}
  for (const key of Object.keys(obj).sort()) {
    const val = obj[key]
    if (NAMED_SCHEMA_KEYS.has(key)) {
      result[key] = canonicalizeNamedSchemas(val as JsonObj)
    } else if (key === "dependentRequired") {
      result[key] = canonicalizeDependentRequired(val)
    } else if (RECURSIVE_KEYS.has(key)) {
      result[key] = canonicalizeObject(val as JsonObj)
    } else {
      result[key] = val
    }
  }

  fixRequired(result)
  fixDependentRequired(result)
  return result
}

// ── Schema fixers ───────────────────────────────────────────────────

function fixRequired(obj: JsonObj): void {
  if (!("required" in obj)) return
  const req = obj.required
  if (Array.isArray(req)) {
    obj.required = [...req].sort((a, b) => String(a).localeCompare(String(b)))
  } else {
    delete obj.required
  }
}

function fixDependentRequired(obj: JsonObj): void {
  if (!("dependentRequired" in obj)) return
  const dr = obj.dependentRequired
  if (typeof dr !== "object" || Array.isArray(dr) || dr === null) {
    delete obj.dependentRequired
  }
}

// ── Named schema canonicalizer ──────────────────────────────────────

function canonicalizeNamedSchemas(v: unknown): unknown {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return canonicalizeObject(v as JsonObj)
  }
  const result: JsonObj = {}
  for (const name of Object.keys(v as JsonObj).sort()) {
    result[name] = canonicalizeObject((v as JsonObj)[name] as JsonObj)
  }
  return result
}

// ── DependentRequired canonicalizer ─────────────────────────────────

function canonicalizeDependentRequired(v: unknown): unknown {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return v
  const result: JsonObj = {}
  for (const key of Object.keys(v as JsonObj).sort()) {
    const inner = (v as JsonObj)[key]
    if (Array.isArray(inner)) {
      result[key] = [...inner].sort((a, b) => String(a).localeCompare(String(b)))
    }
  }
  return result
}
