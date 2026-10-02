export type ReleaseNoticeConfig = {
  version: string;
  url: string;
};

export type ReleaseNoticeResolution =
  | { state: "unconfigured" }
  | { state: "invalid" }
  | { state: "not-newer" }
  | { state: "available"; version: string; url: string };

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseVersion(value: string) {
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) return null;
  return match.slice(1).map(Number);
}

export function compareAppVersions(left: string, right: string): number | null {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  if (!leftParts || !rightParts) return null;

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

export function validateDownloadUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;

  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hostname.includes(".") ||
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
      hostname === "[::1]"
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveReleaseNotice(
  currentVersion: string,
  config: ReleaseNoticeConfig | null | undefined,
): ReleaseNoticeResolution {
  if (config == null) return { state: "unconfigured" };
  if (typeof config.version !== "string" || typeof config.url !== "string") {
    return { state: "invalid" };
  }

  const comparison = compareAppVersions(config.version, currentVersion);
  const url = validateDownloadUrl(config.url);
  if (comparison === null || !url) return { state: "invalid" };
  if (comparison <= 0) return { state: "not-newer" };
  return { state: "available", version: config.version.trim(), url };
}
