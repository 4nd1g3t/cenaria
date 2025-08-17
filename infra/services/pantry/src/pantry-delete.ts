import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from './ddb.js';
import { badRequest, getSub } from './utils.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const sub = getSub(event);
  if (!sub) return badRequest('Missing user sub');

  const id = event.pathParameters?.['id'];
  if (!id) return badRequest('Missing path param id');

  const ifMatchRaw = event.headers?.['if-match'] || event.headers?.['If-Match'];
  const expectedVersion = ifMatchRaw !== undefined ? parseInt(String(ifMatchRaw), 10) : undefined;
  if (ifMatchRaw !== undefined && !Number.isFinite(expectedVersion)) {
    return badRequest('If-Match must be an integer version');
  }

  const names: Record<string, string> = {};
  const values: Record<string, any> = {};
  let ConditionExpression = 'attribute_exists(PK) AND attribute_exists(SK)';

  if (expectedVersion !== undefined) {
    names['#v'] = 'version';
    values[':expected'] = expectedVersion;
    ConditionExpression += ' AND #v = :expected';
  }

  try {
    await ddb.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${sub}`, SK: `PANTRY#${id}` },
      ConditionExpression,
      ...(Object.keys(names).length ? { ExpressionAttributeNames: names } : {}),
      ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
    }));

    return { statusCode: 204, headers: {} , body: '' };
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      // Si hay OCC -> 409; si no, 404 por no existir
      return expectedVersion !== undefined
        ? { statusCode: 409, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'CONFLICT', message: 'Version mismatch or item not found' }) }
        : { statusCode: 404, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Not Found' }) };
    }
    console.error('PANTRY_DELETE_ERROR', { message: err?.message, stack: err?.stack });
    return { statusCode: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Internal error' }) };
  }
};
