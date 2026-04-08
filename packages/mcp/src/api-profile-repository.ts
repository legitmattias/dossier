/**
 * IProfileRepository implementation that reads/writes via the Dossier REST API.
 * Used in MCP Cloud Mode — the MCP server runs locally but stores data remotely.
 */
import type { Profile } from "@dossier/core";
import type { application } from "@dossier/core";
import { infrastructure } from "@dossier/core";

export class ApiProfileRepository implements application.IProfileRepository {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
  ) {}

  async load(): Promise<Profile | null> {
    try {
      const res = await fetch(`${this.apiUrl}/profile`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) return null;
      const json: unknown = await res.json();
      return infrastructure.parseProfile(json);
    } catch {
      return null;
    }
  }

  async save(profile: Profile): Promise<void> {
    // The API doesn't have a "replace entire profile" endpoint.
    // Individual mutations (add/update/remove skill etc.) are handled
    // by the use cases calling the API through the normal flow.
    // For whole-profile save, we serialize and PUT.
    const serialized = infrastructure.serializeProfile(profile);
    const res = await fetch(`${this.apiUrl}/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serialized),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to save profile: ${res.status} ${error}`);
    }
  }

  async exists(): Promise<boolean> {
    const profile = await this.load();
    return profile !== null;
  }
}
