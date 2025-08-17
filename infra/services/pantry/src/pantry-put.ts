import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from './ddb.js';
import { ok, badRequest, conflict, getSub, now, normalizeName } from './utils.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const sub = getSub(event);
  if (!sub) return badRequest('Missing user sub');

  const id = event.pathParameters?.['id'];
  if (!id) return badRequest('Missing path param id');

  const ifMatchRaw = event.headers?.['if-match'] || event.headers?.['If-Match'];
  const expectedVersion = parseInt(String(ifMatchRaw ?? ''), 10);
  if (!Number.isFinite(expectedVersion)) {
    return badRequest('If-Match header with integer version is required');
  }

  if (!event.body) return badRequest('Body required');
  const body = JSON.parse(event.body);

  const name: string = body.name;
  const quantity: number = body.quantity;
  const unit: string = body.unit;
  const category: string = body.category ?? 'otros';
  const perishable: boolean = !!body.perishable;
  const notes: string | undefined = body.notes;

  if (!name || typeof name !== 'string') return badRequest('name is required');
  if (typeof quantity !== 'number' || quantity < 0) return badRequest('quantity must be >= 0');
  if (!unit || typeof unit !== 'string') return badRequest('unit is required');

  const nowMs = now();
  const nameNorm = normalizeName(name);

  const names: Record<string, string> = {
    '#n': 'name',
    '#q': 'quantity',
    '#u': 'unit',
    '#cat': 'category',
    '#per': 'perishable',
    '#notes': 'notes',
    '#updatedAt': 'updatedAt',
    '#v': 'version',
    '#nn': 'name_normalized',
    '#g1pk': 'GSI1PK',
    '#g1sk': 'GSI1SK',
    '#g2pk': 'GSI2PK',
    '#g2sk': 'GSI2SK',
  };

  const vals: Record<string, any> = {
    ':name': name.trim(),
    ':q': quantity,
    ':unit': unit,
    ':cat': category,
    ':per': perishable,
    ':notes': notes,
    ':now': nowMs,
    ':one': 1,
    ':expected': expectedVersion,
    ':norm': nameNorm,
    ':g1pkv': `USER#${sub}`,
    ':g2pkv': `USER#${sub}#CAT#${category}`,
    ':g2skv': String(nowMs),
  };

  const setParts = [
    '#n = :name',
    '#q = :q',
    '#u = :unit',
    '#cat = :cat',
    '#per = :per',
    '#updatedAt = :now',
    '#v = #v + :one',
    '#nn = :norm',
    '#g1pk = :g1pkv',
    '#g1sk = :norm',
    '#g2pk = :g2pkv',
    '#g2sk = :g2skv',
  ];
  const removeParts: string[] = [];
  if (typeof notes === 'string') {
    // ya está en setParts
  } else {
    // si no enviaron notes, la quitamos
    removeParts.push('#notes');
  }

  const UpdateExpression =
    `SET ${setParts.join(', ')}`
    + (typeof notes === 'string' ? ', #notes = :notes' : '')
    + (removeParts.length ? ` REMOVE ${removeParts.join(', ')}` : '');

  try {
    const res = await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${sub}`, SK: `PANTRY#${id}` },
      ConditionExpression: '#v = :expected',
      UpdateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    }));

    const it: any = res.Attributes;
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
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      return conflict('Version mismatch (OCC). Refresh item and retry.');
    }
    throw err;
  }
};
