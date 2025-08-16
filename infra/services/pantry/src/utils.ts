import type { APIGatewayProxyEventV2 } from 'aws-lambda';

export function ok(body: unknown, statusCode = 200) {
  return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}
export function created(body: unknown) { return ok(body, 201); }
export function badRequest(message: string, details?: unknown) { return ok({ code: 'BAD_REQUEST', message, details }, 400); }
export function unauthorized(message = 'Unauthorized') { return ok({ code: 'UNAUTHORIZED', message }, 401); }
export function conflict(message: string) { return ok({ code: 'CONFLICT', message }, 409); }
export function now() { return Date.now(); }
export function normalizeName(name: string) {
  return name.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
export function getSub(event: APIGatewayProxyEventV2): string | undefined {
  // Soporta Cognito JWT authorizer o cabecera de desarrollo `x-user-sub`
  const fromJwt = (event.requestContext.authorizer as any)?.jwt?.claims?.sub;
  const fromHeader = event.headers?.['x-user-sub'] || event.headers?.['X-User-Sub'];
  return fromJwt || fromHeader;
}
export function decodeCursor(cursor?: string) {
  if (!cursor) return undefined;
  try { return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')); } catch { return undefined; }
}
export function encodeCursor(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}