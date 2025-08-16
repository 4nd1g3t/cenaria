// services/pantry/src/utils.ts
import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

type ApiEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

export function ok(body: unknown, statusCode = 200) {
  return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

export function created(body: unknown) {
  return ok(body, 201);
}

export function badRequest(message: string, details?: unknown) {
  return ok({ code: 'BAD_REQUEST', message, details }, 400);
}

export function unauthorized(message = 'Unauthorized') {
  return ok({ code: 'UNAUTHORIZED', message }, 401);
}

export function conflict(message: string) {
  return ok({ code: 'CONFLICT', message }, 409);
}

export function now() { return Date.now(); }

/** Normaliza a minúsculas y quita acentos (compatible con Node.js en Lambda) */
export function normalizeName(name: string) {
  return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Obtiene el sub del usuario: primero de JWT (Cognito Authorizer), en dev permite header x-user-sub */
export function getSub(event: ApiEvent): string | undefined {
  const auth: any = (event as any)?.requestContext?.authorizer;
  // REST (CognitoUserPoolsAuthorizer):
  const fromRest = auth?.claims?.sub;
  // HTTP API (JWT authorizer):
  const fromHttpV2 = auth?.jwt?.claims?.sub;
  // Fallback de dev (NO usar en prod):
  const headers = (event as any).headers || {};
  const fromHeader = process.env.NODE_ENV !== 'production'
    ? (headers['x-user-sub'] || headers['X-User-Sub'])
    : undefined;

  return fromRest || fromHttpV2 || fromHeader;
}

export function decodeCursor(cursor?: string) {
  if (!cursor) return undefined;
  try { return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')); }
  catch { return undefined; }
}

export function encodeCursor(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}
