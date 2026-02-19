import type { Profile } from "../../domain/entities/profile.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import { serializeProfile } from "../validation/profile-schema.js";

export class JsonExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const serialized = serializeProfile(profile);
    return JSON.stringify({ generator: "dossier", ...serialized as Record<string, unknown> }, null, 2) + "\n";
  }
}
