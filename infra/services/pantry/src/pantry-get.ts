import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, GSI1, GSI2 } from './ddb.js';
import { ok, badRequest, getSub, decodeCursor, encodeCursor } from './utils.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const sub = getSub(event);
  if (!sub) return badRequest('Missing user sub (auth or x-user-sub header)');

  const params = event.queryStringParameters || {};
  const search = params['search'];
  const category = params['category'];
  const limit = Math.min(parseInt(params['limit'] || '20', 10), 100);
  const cursor = decodeCursor(params['cursor']);

  let cmd;
  if (search) {
    cmd = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1,
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${sub}`, ':prefix': search.toLowerCase() },
      Limit: limit,
      ExclusiveStartKey: cursor
    });
  } else if (category) {
    cmd = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI2,
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${sub}#CAT#${category}` },
      Limit: limit,
      ExclusiveStartKey: cursor,
      ScanIndexForward: false
    });
  } else {
    cmd = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${sub}`, ':prefix': 'PANTRY#' },
      Limit: limit,
      ExclusiveStartKey: cursor
    });
  }

  const res = await ddb.send(cmd);
  const items = (res.Items || []).map((it) => ({
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
  }));

  return ok({ items, nextCursor: res.LastEvaluatedKey ? encodeCursor(res.LastEvaluatedKey) : undefined });
};