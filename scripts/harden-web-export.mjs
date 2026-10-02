import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportRoot = path.join(projectRoot, "dist");

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(entryPath)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

function hardenHtml(source, filePath) {
  if (!/<html\b/i.test(source) || !/<head\b/i.test(source) || !/<\/head>/i.test(source)) {
    throw new Error(`Expected a complete static HTML document: ${filePath}`);
  }

  const rtlHtml = source.replace(/<html\b([^>]*)>/i, (_match, rawAttributes) => {
    const attributes = rawAttributes.replace(/\s(?:lang|dir)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
    return `<html${attributes} lang="ar" dir="rtl">`;
  });

  const scriptHashes = [...rtlHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`);
  const scriptSources = ["'self'", ...new Set(scriptHashes)].join(" ");
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "connect-src 'self' blob:",
    "worker-src 'self' blob:",
  ].join("; ");
  const safePolicy = policy.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${safePolicy}">`;

  const withoutOldPolicy = rtlHtml.replace(
    /\s*<meta\b(?=[^>]*http-equiv\s*=\s*(["'])Content-Security-Policy\1)[^>]*>/gi,
    "",
  );
  return withoutOldPolicy.replace(/<head\b[^>]*>/i, (head) => `${head}${meta}`);
}

try {
  const files = await htmlFiles(exportRoot);
  if (files.length === 0) throw new Error(`No static HTML documents found in ${exportRoot}`);
  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    await writeFile(filePath, hardenHtml(original, filePath));
  }
  console.log(`Hardened ${files.length} static HTML document(s): Arabic RTL, hashed inline scripts, and self-hosted-only fonts.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
