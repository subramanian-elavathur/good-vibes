import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const createTempDir = (name: string): Promise<string> =>
  mkdtemp(path.join(tmpdir(), `good-vibes-consumer-${name}-`));

export const removeTempDir = (directory: string): Promise<void> =>
  rm(directory, { recursive: true, force: true });
