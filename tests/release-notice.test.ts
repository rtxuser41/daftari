import { describe, expect, it } from "vitest";

import {
  compareAppVersions,
  resolveReleaseNotice,
  validateDownloadUrl,
} from "../lib/release-notice";

describe("local release notice validation", () => {
  it("compares numeric app versions without lexicographic mistakes", () => {
    expect(compareAppVersions("1.10.0", "1.9.0")).toBe(1);
    expect(compareAppVersions("1.2.0", "1.2.0")).toBe(0);
    expect(compareAppVersions("1.1.9", "1.2.0")).toBe(-1);
    expect(compareAppVersions("1.2", "1.1.0")).toBeNull();
  });

  it("shows only a newer release with an HTTPS download link", () => {
    expect(
      resolveReleaseNotice("1.2.0", {
        version: "1.3.0",
        url: "https://example.org/releases/daftar.apk",
      }),
    ).toEqual({
      state: "available",
      version: "1.3.0",
      url: "https://example.org/releases/daftar.apk",
    });
  });

  it("does not announce current/older versions or an unset feed", () => {
    expect(resolveReleaseNotice("1.2.0", null).state).toBe("unconfigured");
    expect(resolveReleaseNotice("1.2.0", { version: "1.2.0", url: "https://example.org/app" }).state).toBe("not-newer");
    expect(resolveReleaseNotice("1.2.0", { version: "1.1.9", url: "https://example.org/app" }).state).toBe("not-newer");
  });

  it("rejects malformed versions and unsafe or local URLs", () => {
    expect(resolveReleaseNotice("1.2.0", { version: "latest", url: "https://example.org/app" }).state).toBe("invalid");
    expect(validateDownloadUrl("http://example.org/app.apk")).toBeNull();
    expect(validateDownloadUrl("javascript:alert(1)")).toBeNull();
    expect(validateDownloadUrl("https://localhost/app.apk")).toBeNull();
    expect(validateDownloadUrl("https://127.0.0.1/app.apk")).toBeNull();
    expect(validateDownloadUrl("https://user:pass@example.org/app.apk")).toBeNull();
  });
});
