import { describe, expect, it } from "vitest";
import { slugify } from "./slugify.js";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Machine Learning")).toBe("machine-learning");
  });

  it("handles dots and version numbers", () => {
    expect(slugify("TypeScript 5.x")).toBe("typescript-5-x");
  });

  it("converts # to -sharp", () => {
    expect(slugify("C#")).toBe("c-sharp");
  });

  it("converts + to -plus", () => {
    expect(slugify("C++")).toBe("c-plus-plus");
  });

  it("collapses consecutive hyphens", () => {
    expect(slugify("React -- Native")).toBe("react-native");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify(" -Hello World- ")).toBe("hello-world");
  });

  it("handles simple names", () => {
    expect(slugify("Python")).toBe("python");
  });

  it("handles already-valid slugs", () => {
    expect(slugify("already-valid")).toBe("already-valid");
  });

  it("handles names with parentheses and special chars", () => {
    expect(slugify("Node.js (LTS)")).toBe("node-js-lts");
  });

  // Domain extensibility: non-dev examples
  it("handles music instrument names", () => {
    expect(slugify("Acoustic Guitar")).toBe("acoustic-guitar");
  });

  it("handles language names with special characters", () => {
    expect(slugify("Mandarin Chinese")).toBe("mandarin-chinese");
  });
});
