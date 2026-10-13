import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * A tiny file based key-value store.
 */
export default class Store<Value> {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  pathOf(key: string): string {
    if (!/^[\w-]+$/.test(key)) {
      throw new Error(`Invalid key ${key}`);
    }
    return path.join(this.#directory, `${key}.json`);
  }

  async set(key: string, value: Value): Promise<void> {
    await mkdir(this.#directory, { recursive: true });
    await writeFile(this.pathOf(key), JSON.stringify(value));
  }

  async get(key: string): Promise<Value | undefined> {
    try {
      return JSON.parse(await readFile(this.pathOf(key), "utf8")) as Value;
    } catch (error) {
      console.error(`Could not read ${key}: ${String(error)}`);
      return undefined;
    }
  }

  async load(key: string): Promise<Value> {
    const value = await this.get(key);
    if (value === undefined) {
      throw new Error(`Key ${key} not found`);
    }
    return value;
  }

  async delete(key: string): Promise<boolean> {
    try {
      await rm(this.pathOf(key));
      return true;
    } catch {
      return false;
    }
  }

  async keys(): Promise<string[]> {
    const files = await readdir(this.#directory);
    return files.map((file) => path.basename(file, ".json")).sort();
  }
}
