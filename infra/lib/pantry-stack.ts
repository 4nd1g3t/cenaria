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
import { RestApi, LambdaIntegration, Cors, MethodOptions } from 'aws-cdk-lib/aws-apigateway';

export class PantryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = this.node.tryGetContext('stage') ?? 'dev';

    // DynamoDB table (si ya existe en tu archivo, reutiliza esa sección)
    const table = new Table(this, 'MainTable', {
      tableName: `cenaria-main-${stage}`,
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: stage !== 'dev' },
      removalPolicy: stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // Parámetros SSM
    new StringParameter(this, 'MainTableNameParam', {
      parameterName: `/cenaria/${stage}/dynamodb/main-table-name`,
      stringValue: table.tableName,
    });
    new StringParameter(this, 'MainTableArnParam', {
      parameterName: `/cenaria/${stage}/dynamodb/main-table-arn`,
      stringValue: table.tableArn,
    });

    // Lambdas
    const commonFnProps = {
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        externalModules: [], // empaqueta todo
        minify: true,
        sourceMap: true,
      },
    } as const;

    const pantryGet = new NodejsFunction(this, 'PantryGetFn', {
      entry: path.join(__dirname, '../../services/pantry/src/pantry-get.ts'),
      ...commonFnProps,
    });
    const pantryPost = new NodejsFunction(this, 'PantryPostFn', {
      entry: path.join(__dirname, '../../services/pantry/src/pantry-post.ts'),
      ...commonFnProps,
    });

    table.grantReadData(pantryGet);
    table.grantReadWriteData(pantryPost);

    // API Gateway
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

    const methodOpts: MethodOptions = {
      authorizationType: undefined, // Paso 3: conectar authorizer Cognito
    };

    pantry.addMethod('GET', new LambdaIntegration(pantryGet), methodOpts);
    pantry.addMethod('POST', new LambdaIntegration(pantryPost), methodOpts);

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url ?? '' });
  }
}