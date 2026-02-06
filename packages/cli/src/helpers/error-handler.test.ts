import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DomainNotFoundError,
  DuplicateSkillError,
  SkillNotFoundError,
  application,
} from "@dossier/core";
import { withErrorHandler } from "./error-handler.js";
import { ResolveError } from "./resolve.js";

describe("withErrorHandler", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("calls the action normally when no error", async () => {
    const action = vi.fn(async () => {});
    const wrapped = withErrorHandler(action);
    await wrapped();
    expect(action).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("handles ProfileNotFoundError", async () => {
    const wrapped = withErrorHandler(async () => {
      throw new application.ProfileNotFoundError();
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("No profile found"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles InvalidInputError", async () => {
    const wrapped = withErrorHandler(async () => {
      throw new application.InvalidInputError("bad input");
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("bad input"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles ResolveError", async () => {
    const wrapped = withErrorHandler(async () => {
      throw new ResolveError("Domain 'foo' not found.");
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Domain 'foo' not found"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles DuplicateSkillError", async () => {
    const wrapped = withErrorHandler(async () => {
      throw new DuplicateSkillError("TypeScript");
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("TypeScript"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles DomainNotFoundError", async () => {
    const wrapped = withErrorHandler(async () => {
      throw new DomainNotFoundError("music");
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("music"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles SkillNotFoundError", async () => {
    const wrapped = withErrorHandler(async () => {
      throw new SkillNotFoundError("Guitar");
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Guitar"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles unknown Error objects", async () => {
    const wrapped = withErrorHandler(async () => {
      throw new Error("something broke");
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Unexpected error"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles non-Error throws", async () => {
    const wrapped = withErrorHandler(async () => {
      throw "string error"; // eslint-disable-line no-throw-literal
    });
    await wrapped();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("unknown error"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
