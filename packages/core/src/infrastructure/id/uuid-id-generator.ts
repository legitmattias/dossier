import { randomUUID } from "node:crypto";

import type { IIdGenerator } from "../../application/ports/id-generator.js";

export class UuidIdGenerator implements IIdGenerator {
  generate(prefix?: string): string {
    const uuid = randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  }
}
