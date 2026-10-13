import { inspect } from "node:util";

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Unlike JSON.stringify this handles BigInt, circular references, Maps, Sets, etc.
export const formatValue = (value: unknown): string =>
  inspect(value, { depth: Infinity, breakLength: Infinity });
