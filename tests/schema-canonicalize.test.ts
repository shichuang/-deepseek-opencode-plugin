/**
 * Tests for schema-canonicalize.ts
 *
 * Ported from DeepSeek-Reasonix internal/provider/schema_canonicalize_test.go
 */

import { describe, it, expect } from "vitest"
import { canonicalizeSchema, canonicalizeSchemaString } from "../src/transform/schema-canonicalize.js"

describe("canonicalizeSchema", () => {
  it("replaces empty/undefined schema with type:object", () => {
    expect(canonicalizeSchema(undefined)).toEqual({ type: "object" })
    expect(canonicalizeSchema(null)).toEqual({ type: "object" })
    expect(canonicalizeSchema("")).toEqual({ type: "object" })
    expect(canonicalizeSchema(42)).toEqual({ type: "object" })
  })

  it("sorts required arrays alphabetically", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        email: { type: "string" },
      },
      required: ["email", "name", "age"],
    }
    const result = canonicalizeSchema(schema)
    expect(result.required).toEqual(["age", "email", "name"])
  })

  it("drops non-array required values", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" } },
      required: { name: true },
    }
    const result = canonicalizeSchema(schema)
    expect(result).not.toHaveProperty("required")
  })

  it("drops non-object dependentRequired", () => {
    const schema = {
      type: "object",
      properties: { a: {}, b: {} },
      dependentRequired: "not-an-object",
    }
    const result = canonicalizeSchema(schema)
    expect(result).not.toHaveProperty("dependentRequired")
  })

  it("recursively canonicalizes nested schemas", () => {
    const schema = {
      type: "object",
      properties: {
        address: {
          type: "object",
          properties: {
            city: { type: "string" },
            zip: { type: "string" },
          },
          required: ["zip", "city"],
        },
      },
    }
    const result = canonicalizeSchema(schema) as Record<string, unknown>
    const props = result.properties as Record<string, Record<string, unknown>>
    expect(props.address.required).toEqual(["city", "zip"])
  })

  it("produces stable string output", () => {
    const s1 = canonicalizeSchemaString({
      properties: { b: {}, a: {} },
      required: ["b", "a"],
    })
    const s2 = canonicalizeSchemaString({
      required: ["a", "b"],
      properties: { a: {}, b: {} },
    })
    expect(s1).toBe(s2)
  })

  it("handles anyOf/oneOf/allOf recursively", () => {
    const schema = {
      anyOf: [
        {
          type: "object",
          properties: { c: {}, b: {} },
          required: ["b", "c"],
        },
        { type: "string" },
      ],
    }
    const result = canonicalizeSchema(schema) as Record<string, unknown>
    const anyOf = result.anyOf as Record<string, unknown>[]
    expect(anyOf[0].required).toEqual(["b", "c"])
  })

  it("sorts dependentRequired arrays", () => {
    const schema = {
      type: "object",
      properties: { a: {}, b: {}, c: {} },
      dependentRequired: {
        a: ["c", "b"],
      },
    }
    const result = canonicalizeSchema(schema) as Record<string, unknown>
    const dr = result.dependentRequired as Record<string, string[]>
    expect(dr.a).toEqual(["b", "c"])
  })
})