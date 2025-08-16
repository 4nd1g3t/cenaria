export function getSub(event: APIGatewayProxyEventV2): string | undefined {
  const fromJwt = (event.requestContext.authorizer as any)?.claims?.sub
    || (event.requestContext.authorizer as any)?.jwt?.claims?.sub;
  // DEV fallback (quítalo luego):
  const fromHeader = process.env.NODE_ENV !== 'production'
    ? (event.headers?.['x-user-sub'] || event.headers?.['X-User-Sub'])
    : undefined;
  return fromJwt || fromHeader;
}