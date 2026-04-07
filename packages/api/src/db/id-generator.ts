import { randomUUID } from "node:crypto";
import type { application } from "@dossier/core";

export class UuidIdGenerator implements application.IIdGenerator {
  generate(prefix?: string): string {
    return `${prefix ?? "id"}-${randomUUID()}`;
  }
}
