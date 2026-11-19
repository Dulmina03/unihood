import { reportEndpoint } from '../places/report-endpoint';

export function boardingRequestEndpoint(env: Readonly<Record<string, string | undefined>>): string | null {
  const endpoint = reportEndpoint(env);
  return endpoint ? endpoint.replace(/\/reports$/, '/boarding-requests') : null;
}
