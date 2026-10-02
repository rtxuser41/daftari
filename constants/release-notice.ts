import type { ReleaseNoticeConfig } from "@/lib/release-notice";

/**
 * Configure only after a release has a real, verified HTTPS download/store URL.
 * This is build-time local configuration, not a live release feed or push service.
 */
export const RELEASE_NOTICE_CONFIG: ReleaseNoticeConfig | null = null;
