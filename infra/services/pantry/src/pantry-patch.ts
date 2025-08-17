import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME } from './ddb.js';
import { ok, badRequest, conflict, getSub, now, normalizeName } from './utils.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sub = getSub(event);
    if (!sub) return badRequest('Missing user sub');

    const id = event.pathParameters?.['id'];
    if (!id) return badRequest('Missing path param id');

    if (!event.body) return badRequest('Body required');
    const body = JSON.parse(event.body);

    const allow = ['name','quantity','unit','category','perishable','notes'] as const;
    const updates: Record<string, any> = {};
    for (const k of allow) {
      if (Object.prototype.hasOwnProperty.call(body, k)) updates[k] = body[k as typeof allow[number]];
    }
    if (Object.keys(updates).length === 0) return badRequest('No fields to update');

    // OCC opcional
    const ifMatchRaw = event.headers?.['if-match'] || event.headers?.['If-Match'];
    const expectedVersion = ifMatchRaw !== undefined ? parseInt(String(ifMatchRaw), 10) : undefined;
    if (ifMatchRaw !== undefined && !Number.isFinite(expectedVersion)) {
      return badRequest('If-Match must be an integer version');
    }

    // Construcción dinámica
    const names: Record<string, string> = {
      '#updatedAt': 'updatedAt',
      '#v': 'version',
    };
    const vals: Record<string, any> = {
      ':now': now(),
      ':one': 1,
    };
    const setParts: string[] = ['#updatedAt = :now', '#v = #v + :one'];
    const removeParts: string[] = [];

    // name -> también GSI1
    if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
      if (typeof updates.name !== 'string' || !updates.name.trim()) return badRequest('name must be non-empty string');
      const nm = updates.name.trim();
      const nmNorm = normalizeName(nm);
      names['#n'] = 'name';
      names['#nn'] = 'name_normalized';
      names['#g1pk'] = 'GSI1PK';
      names['#g1sk'] = 'GSI1SK';
      vals[':name'] = nm;
      vals[':norm'] = nmNorm;
      vals[':g1pkv'] = `USER#${sub}`;
      setParts.push('#n = :name', '#nn = :norm', '#g1pk = :g1pkv', '#g1sk = :norm');
    }

    // quantity
    if (Object.prototype.hasOwnProperty.call(updates, 'quantity')) {
      if (typeof updates.quantity !== 'number' || updates.quantity < 0) return badRequest('quantity must be >= 0');
      names['#q'] = 'quantity';
      vals[':q'] = updates.quantity;
      setParts.push('#q = :q');
    }

    // unit
    if (Object.prototype.hasOwnProperty.call(updates, 'unit')) {
      if (typeof updates.unit !== 'string' || !updates.unit) return badRequest('unit must be string');
      names['#u'] = 'unit';
      vals[':unit'] = updates.unit;
      setParts.push('#u = :unit');
    }

    // category -> también GSI2
    if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
      if (typeof updates.category !== 'string' || !updates.category) return badRequest('category must be string');
      names['#cat'] = 'category';
      names['#g2pk'] = 'GSI2PK';
      names['#g2sk'] = 'GSI2SK';
      vals[':cat'] = updates.category;
      vals[':g2pkv'] = `USER#${sub}#CAT#${updates.category}`;
      vals[':g2skv'] = String(vals[':now']);
      setParts.push('#cat = :cat', '#g2pk = :g2pkv', '#g2sk = :g2skv');
    }

    // perishable
    if (Object.prototype.hasOwnProperty.call(updates, 'perishable')) {
      names['#per'] = 'perishable';
      vals[':per'] = !!updates.perishable;
      setParts.push('#per = :per');
    }

    // notes (string => set; null => remove)
    if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
      names['#notes'] = 'notes';
      if (updates.notes === null) {
        removeParts.push('#notes');
      } else if (typeof updates.notes === 'string') {
        vals[':notes'] = updates.notes;
        setParts.push('#notes = :notes');
      } else {
        return badRequest('notes must be string or null');
      }
    }

    const UpdateExpression =
      `SET ${setParts.join(', ')}${removeParts.length ? ` REMOVE ${removeParts.join(', ')}` : ''}`;

    if (expectedVersion !== undefined) vals[':expected'] = expectedVersion;

    const params: any = {
      TableName: TABLE_NAME,
      Key: { PK: `USER#${sub}`, SK: `PANTRY#${id}` },
      UpdateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: vals,
      ReturnValues: 'ALL_NEW',
    };
    if (expectedVersion !== undefined) {
      params.ConditionExpression = '#v = :expected';
    }

    const res = await ddb.send(new UpdateCommand(params));
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
    console.error('PANTRY_PATCH_ERROR', { message: err?.message, stack: err?.stack });
    if (err?.name === 'ConditionalCheckFailedException') {
      return conflict('Version mismatch (OCC). Refresh item and retry.');
    }
    return { statusCode: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Internal error' }) };
  }
};
