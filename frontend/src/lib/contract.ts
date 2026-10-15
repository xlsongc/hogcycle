/**
 * The contract, as every page receives it.
 *
 * It is the only thing crossing the boundary (docs/adr/0007): imported at
 * build time now, fetched from an API later, the same shape either way. It is
 * checked once, here. A payload of another major version than the schema this
 * frontend's types were generated from fails the static build, rather than
 * drawing a chart from fields that mean something else (docs/adr/0024).
 */

import wall from "@/data/wall.json";
import { CONTRACT_VERSION, type WallContract } from "@/types/generated/wall";

const major = (version: string) => version.split(".")[0];

// `unknown`, not a partial type: an unversioned file has no field in common
// with one, and the type checker's complaint about that says nothing useful.
function check(raw: unknown): WallContract {
  const got = (raw as { contract_version?: unknown }).contract_version;
  if (typeof got !== "string" || major(got) !== major(CONTRACT_VERSION)) {
    throw new Error(
      `src/data/wall.json is contract ${typeof got === "string" ? got : "unversioned"}, ` +
        `but this frontend was built for ${CONTRACT_VERSION}. Re-export it from this ` +
        "checkout: hogcycle export"
    );
  }
  return raw as WallContract;
}

export const contract: WallContract = check(wall);
