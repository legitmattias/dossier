import { ProfileNotFoundError } from "../errors/application-errors.js";
import type { IProfileRepository } from "../ports/profile-repository.js";
import type { SearchProfileInput, SearchProfileOutput, SearchResultItem } from "../dtos/search-dtos.js";

export interface SearchProfileDeps {
  readonly profileRepository: IProfileRepository;
}

export async function searchProfile(
  deps: SearchProfileDeps,
  input: SearchProfileInput,
): Promise<SearchProfileOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const q = input.query.toLowerCase();
  const matchName = (name: string) => name.toLowerCase().includes(q);

  const skills: SearchResultItem[] = profile.skills
    .filter((s) => matchName(s.name))
    .map((s) => ({
      id: s.id,
      name: s.name,
      type: "skill" as const,
      description: s.description,
      meta: s.proficiency,
    }));

  const goals: SearchResultItem[] = profile.goals
    .filter((g) => matchName(g.name))
    .map((g) => ({
      id: g.id,
      name: g.name,
      type: "goal" as const,
      description: g.description,
      meta: `${g.status}, ${g.priority}`,
    }));

  const interests: SearchResultItem[] = profile.interests
    .filter((i) => matchName(i.name))
    .map((i) => ({
      id: i.id,
      name: i.name,
      type: "interest" as const,
      description: i.description,
    }));

  const projects: SearchResultItem[] = profile.projects
    .filter((p) => matchName(p.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: "project" as const,
      description: p.description,
      meta: `${p.status}, ${p.priority}`,
    }));

  return {
    query: input.query,
    results: { skills, goals, interests, projects },
    total: skills.length + goals.length + interests.length + projects.length,
  };
}
