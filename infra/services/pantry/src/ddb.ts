import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});

export const TABLE_NAME = process.env.TABLE_NAME!; // inyectado por CDK
export const GSI1 = 'GSI1';
export const GSI2 = 'GSI2';