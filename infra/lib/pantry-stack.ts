// infra/lib/pantry-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';

import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';

import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';

import * as path from 'path';

import {
  RestApi,
  LambdaIntegration,
  Cors,
  MethodOptions,
  CognitoUserPoolsAuthorizer,
  AuthorizationType,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';

export class PantryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = this.node.tryGetContext('stage') ?? 'dev';

    // =========================
    // DynamoDB: tabla e índices
    // =========================
    const table = new Table(this, 'MainTable', {
      tableName: `cenaria-main-${stage}`,
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: stage !== 'dev',
      },
      removalPolicy: stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // GSI1: búsqueda por nombre normalizado (prefix)
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // GSI2: filtrado por categoría; SK es string (timestamp ms como string)
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // Parámetros SSM con nombre/ARN de la tabla
    new StringParameter(this, 'MainTableNameParam', {
      parameterName: `/cenaria/${stage}/dynamodb/main-table-name`,
      stringValue: table.tableName,
    });

    new StringParameter(this, 'MainTableArnParam', {
      parameterName: `/cenaria/${stage}/dynamodb/main-table-arn`,
      stringValue: table.tableArn,
    });

    // =========================
    // Lambdas (NodejsFunction)
    // =========================
    const commonFnProps = {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.X86_64, // evita Docker
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
        // NODE_ENV: stage === 'prod' ? 'production' : 'development',
      },
      bundling: {
        // Usa esbuild local; no seteamos externalModules para evitar el readonly[]
        minify: true,
        sourceMap: true,
      },
    };

    const pantryGet = new NodejsFunction(this, 'PantryGetFn', {
      entry: path.join(__dirname, '..', 'services', 'pantry', 'src', 'pantry-get.ts'),
      ...commonFnProps,
    });

    const pantryPost = new NodejsFunction(this, 'PantryPostFn', {
      entry: path.join(__dirname, '..', 'services', 'pantry', 'src', 'pantry-post.ts'),
      ...commonFnProps,
    });

    const pantryGetById = new NodejsFunction(this, 'PantryGetByIdFn', {
      entry: path.join(__dirname, '..', 'services', 'pantry', 'src', 'pantry-get-by-id.ts'),
      ...commonFnProps,
    });

    table.grantReadData(pantryGet);
    table.grantReadData(pantryGetById);
    table.grantReadWriteData(pantryPost);

    // =========================
    // API Gateway (REST)
    // =========================
    const api = new RestApi(this, 'CenariaApi', {
      restApiName: `cenaria-api-${stage}`,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
      deployOptions: { stageName: stage },
    });

    const v1 = api.root.addResource('v1');
    const pantry = v1.addResource('pantry');

    // =========================
    // Cognito Authorizer (via SSM)
    // =========================
    // Lee el User Pool Id desde SSM: /cenaria/<stage>/cognito/user-pool-id
    const userPoolIdParam = StringParameter.fromStringParameterAttributes(this, 'UserPoolIdParam', {
      parameterName: `/cenaria/${stage}/cognito/user-pool-id`,
    });
    const userPool = UserPool.fromUserPoolId(this, 'UserPool', userPoolIdParam.stringValue);

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'CenariaAuthorizer', {
      cognitoUserPools: [userPool],
    });
    // Requerido para RestApi clásico
    authorizer._attachToApi(api);

    // Todas las rutas de pantry requieren JWT
    const authed: MethodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    };

    pantry.addMethod('GET', new LambdaIntegration(pantryGet), authed);
    pantry.addMethod('POST', new LambdaIntegration(pantryPost), authed);

    const pantryId = pantry.addResource('{id}');
    pantryId.addMethod('GET', new LambdaIntegration(pantryGetById), authed);

    // =========================
    // Salidas
    // =========================
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url ?? '' });
  }
}
