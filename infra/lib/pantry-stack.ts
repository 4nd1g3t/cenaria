import {
  RestApi, LambdaIntegration, Cors, MethodOptions,
  CognitoUserPoolsAuthorizer, AuthorizationType
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

// ...

const stage = this.node.tryGetContext('stage') ?? 'dev';

// (A) Importar User Pool (elige una opción)

// Opción A1: desde SSM
const userPoolIdParam = StringParameter.fromStringParameterAttributes(this, 'UserPoolIdParam', {
  parameterName: `/cenaria/${stage}/cognito/user-pool-id`,
});
const userPool = UserPool.fromUserPoolId(this, 'UserPool', userPoolIdParam.stringValue);

// Opción A2: si prefieres pasar por contexto (cdk.json o -c userPoolId=...)
/*
const userPoolId = this.node.tryGetContext('userPoolId'); // e.g. us-east-2_AbCdEf123
const userPool = UserPool.fromUserPoolId(this, 'UserPool', userPoolId);
*/

// API Gateway (ya creado en el paso anterior)
const api = new RestApi(this, 'CenariaApi', {
  restApiName: `cenaria-api-${stage}`,
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: ['*'],
  },
  deployOptions: { stageName: stage },
});

// Authorizer de Cognito
const authorizer = new CognitoUserPoolsAuthorizer(this, 'CenariaAuthorizer', {
  cognitoUserPools: [userPool],
});
authorizer._attachToApi(api); // necesario para RestApi clásico

const v1 = api.root.addResource('v1');
const pantry = v1.addResource('pantry');

// Todas las rutas de pantry requieren JWT
const authed: MethodOptions = {
  authorizationType: AuthorizationType.COGNITO,
  authorizer,
};

pantry.addMethod('GET', new LambdaIntegration(pantryGet), authed);
pantry.addMethod('POST', new LambdaIntegration(pantryPost), authed);

new cdk.CfnOutput(this, 'ApiUrl', { value: api.url ?? '' });
