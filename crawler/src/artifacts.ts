/**
 * Артефактите се пазят gzip на диск, не в базата (т. 5), по път
 * artifacts/{run_id}/{domain}/{page_slug}/{kind}[.ua].gz
 */
import { gzipSync, gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ARTIFACT_ROOT = process.env.CRAWLER_ARTIFACTS ?? resolve(HERE, '..', 'artifacts');

/** Безопасно за файлова система парче от домейн/slug. */
function safe(part: string): string {
  return part.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 120) || '_';
}

export function artifactPath(
  runId: string,
  domain: string,
  pageSlug: string,
  kind: string,
  uaVariant?: string,
): string {
  const name = uaVariant && uaVariant !== '-' ? `${kind}.${uaVariant}.gz` : `${kind}.gz`;
  return join(ARTIFACT_ROOT, safe(runId), safe(domain), safe(pageSlug), name);
}

/** Записва (gzip) и връща абсолютния път. */
export function writeArtifact(
  runId: string,
  domain: string,
  pageSlug: string,
  kind: string,
  uaVariant: string | undefined,
  data: string,
): string {
  const path = artifactPath(runId, domain, pageSlug, kind, uaVariant);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, gzipSync(Buffer.from(data, 'utf8')));
  return path;
}

export function readArtifact(path: string): string {
  return gunzipSync(readFileSync(path)).toString('utf8');
}
