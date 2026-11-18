import { duplicateEndpoint } from '../places/duplicate-endpoint';
export function recommendationEndpoint(env: Readonly<Record<string, string | undefined>>): string | null {
  const endpoint = duplicateEndpoint(env);
  if (!endpoint) return null;
  const url = new URL(endpoint);
  return url.pathname === '/api/v1/duplicates/check' ? `${url.origin}/api/v1/contributions/boarding` : null;
}
