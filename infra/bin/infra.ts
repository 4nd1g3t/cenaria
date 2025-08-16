#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PantryStack } from '../lib/pantry-stack';

const app = new cdk.App();
const stage = app.node.tryGetContext('stage') ?? 'dev';

new PantryStack(app, `CenariaPantryStack-${stage}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-2',
  },
});
