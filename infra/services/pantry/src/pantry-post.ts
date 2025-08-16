import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { BatchWriteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { ddb, TABLE_NAME } from './ddb.js';
import { created, badRequest, getSub, now, normalizeName } from './utils.js';
import type { NewPantryItem } from './types.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const sub = getSub(event);
  if (!sub) return badRequest('Missing user sub (auth or x-user-sub header)');

  if (!event.body) return badRequest('Body required');
  const payload = JSON.parse(event.body);
  const items: NewPantryItem[] = payload.items;
  const idempotencyKey: string | undefined = payload.idempotencyKey;
  if (!Array.isArray(items) || items.length === 0) return badRequest('items[] is required');
  if (items.length > 100) return badRequest('Max 100 items per request');

  // Idempotencia simple: si mandan idempotencyKey, respondemos lo almacenado si existe
  if (idempotencyKey) {
    const ide = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${sub}`, SK: `IDEMPOTENCY#${idempotencyKey}` },
    }));
    if (ide.Item?.response) {
      return created(ide.Item.response);
    }
  }

  const nowMs = now();
  const puts: any[] = [];
  const responseItems: any[] = [];
  for (const it of items) {
    if (!it.name || typeof it.name !== 'string') return badRequest('name is required');
    if (typeof it.quantity !== 'number' || it.quantity < 0) return badRequest('quantity must be >= 0');
    if (!it.unit || typeof it.unit !== 'string') return badRequest('unit is required');

    const id = ulid();
    const nameNorm = normalizeName(it.name);
    const item = {
      PK: `USER#${sub}`,
      SK: `PANTRY#${id}`,
      entity: 'PANTRY_ITEM',
      id,
      userSub: sub,
      name: it.name.trim(),
      name_normalized: nameNorm,
      quantity: it.quantity,
      unit: it.unit,
      category: it.category ?? 'otros',
      perishable: !!it.perishable,
      notes: it.notes,
      createdAt: nowMs,
      updatedAt: nowMs,
      version: 1,
      // GSIs
      GSI1PK: `USER#${sub}`,
      GSI1SK: nameNorm,
      GSI2PK: `USER#${sub}#CAT#${it.category ?? 'otros'}`,
      GSI2SK: nowMs
    };
    responseItems.push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      perishable: item.perishable,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      version: item.version,
    });
    puts.push({ PutRequest: { Item: item } });
  }

  // BatchWrite (manejo simple, sin reintentos por UnprocessedItems para v0)
  await ddb.send(new BatchWriteCommand({
    RequestItems: { [TABLE_NAME]: puts }
  }));

  const response = { items: responseItems };
  if (idempotencyKey) {
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${sub}`,
        SK: `IDEMPOTENCY#${idempotencyKey}`,
        createdAt: nowMs,
        response,
      },
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
    }).catch(() => undefined));
  }

  return created(response);
};