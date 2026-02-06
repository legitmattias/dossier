import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { Profile } from "../../domain/entities/profile.js";
import type { IProfileRepository } from "../../application/ports/profile-repository.js";
import { parseProfile, serializeProfile } from "../validation/profile-schema.js";

export class FileProfileRepository implements IProfileRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<Profile | null> {
    let content: string;
    try {
      content = await readFile(this.filePath, "utf-8");
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }

    const json: unknown = JSON.parse(content);
    return parseProfile(json);
  }

  async save(profile: Profile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const serialized = serializeProfile(profile);
    const content = JSON.stringify(serialized, null, 2) + "\n";
    await writeFile(this.filePath, content, "utf-8");
  }

  async exists(): Promise<boolean> {
    try {
      await readFile(this.filePath);
      return true;
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
