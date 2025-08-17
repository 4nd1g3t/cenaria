import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from './ddb.js';
import { ok, badRequest, getSub } from './utils.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const sub = getSub(event);
  if (!sub) return badRequest('Missing user sub');

  const id = event.pathParameters?.['id'];
  if (!id) return badRequest('Missing path param id');

  const res = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${sub}`, SK: `PANTRY#${id}` },
  }));

  if (!res.Item) {
    return { statusCode: 404, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Not Found' }) };
  }

  const it = res.Item as any;
  return ok({
    id: it.id,
    name: it.name,
    quantity: it.quantity,
    unit: it.unit,
    category: it.category,
    perishable: it.perishable,
    notes: it.notes,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
    version: it.version,
  });
};
