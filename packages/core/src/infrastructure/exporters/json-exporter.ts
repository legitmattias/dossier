import type { Profile } from "../../domain/entities/profile.js";
import type { ExportOptions, IExporter } from "../../application/ports/exporter.js";
import { serializeProfile } from "../validation/profile-schema.js";

export class JsonExporter implements IExporter {
  export(profile: Profile, _options?: ExportOptions): string {
    const serialized = serializeProfile(profile);
    return JSON.stringify(serialized, null, 2) + "\n";
  }
}
