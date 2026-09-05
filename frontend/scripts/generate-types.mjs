#!/usr/bin/env node
/**
 * contracts/wall.schema.json -> src/types/generated/wall.ts
 *
 * The schema is the single source of truth for the frontend/backend boundary
 * (docs/adr/0007). Python validates its export against it; TypeScript takes
 * its types from it. Neither side hand-writes the shape, so an indicator whose
 * unit or granularity changes breaks the build rather than a production chart.
 *
 * Deliberately dependency-free. It handles the subset of JSON Schema this one
 * document uses; anything else throws rather than guessing, because a silently
 * wrong type is worse than a missing one.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA = resolve(HERE, "../../contracts/wall.schema.json");
const OUT = resolve(HERE, "../src/types/generated/wall.ts");

const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
const interfaces = [];

const pascal = (s) =>
  s.replace(/(^\w|[-_ ]\w)/g, (m) => m.replace(/[-_ ]/, "").toUpperCase());

function typeOf(node, name) {
  if (node.enum) return node.enum.map((v) => JSON.stringify(v)).join(" | ");

  const kinds = Array.isArray(node.type) ? node.type : [node.type];
  const nullable = kinds.includes("null");
  const kind = kinds.find((k) => k !== "null");
  let base;

  switch (kind) {
    case "string":
      base = "string";
      break;
    case "number":
      base = "number";
      break;
    case "integer":
      base = "number";
      break;
    case "boolean":
      base = "boolean";
      break;
    case "array":
      base = `${typeOf(node.items, name)}[]`;
      break;
    case "object": {
      base = pascal(name);
      emit(base, node);
      break;
    }
    default:
      throw new Error(`unsupported schema type ${JSON.stringify(kinds)} at ${name}`);
  }
  return nullable ? `${base} | null` : base;
}

function emit(name, node) {
  if (interfaces.some((i) => i.name === name)) return;
  const entry = { name, lines: [] };
  interfaces.push(entry); // registered before recursion so cycles terminate

  const required = new Set(node.required ?? []);
  for (const [key, prop] of Object.entries(node.properties ?? {})) {
    // A singular child name reads better as the interface for an array item.
    const childName = prop.type === "array" ? key.replace(/s$/, "") : key;
    const t = typeOf(prop, childName);
    if (prop.description) {
      entry.lines.push(`  /** ${prop.description.replace(/\s+/g, " ")} */`);
    }
    entry.lines.push(`  ${key}${required.has(key) ? "" : "?"}: ${t};`);
  }
  entry.body = `export interface ${name} {\n${entry.lines.join("\n")}\n}`;
}

emit(schema.title ?? "Contract", schema);

const header = `// GENERATED — do not edit.
// Source: contracts/wall.schema.json
// Regenerate: npm run types
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${header}\n${interfaces.map((i) => i.body).join("\n\n")}\n`);
console.log(
  `types: ${interfaces.length} interface(s) -> ${OUT.replace(process.cwd() + "/", "")}`
);
