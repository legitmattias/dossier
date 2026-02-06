import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { success, info, warn, error, table } from "./output.js";

describe("output helpers", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("success prints with green checkmark", () => {
    success("done");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("✓"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("done"));
  });

  it("info prints with blue info symbol", () => {
    info("notice");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("ℹ"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("notice"));
  });

  it("warn prints with yellow warning", () => {
    warn("careful");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("⚠"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("careful"));
  });

  it("error prints to stderr with red X", () => {
    error("failed");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("✗"));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("failed"));
  });

  it("table prints headers and rows", () => {
    table(["Name", "Value"], [["foo", "bar"], ["baz", "qux"]]);
    expect(logSpy).toHaveBeenCalledTimes(4); // header + separator + 2 rows
  });

  it("table does nothing with empty rows", () => {
    table(["Name", "Value"], []);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
