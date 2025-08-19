import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import * as service from "./menu-service";
import type {
  GenerateMenuRequest,
  ReplaceRecipeRequest,
  PrepareMenuRequest,
} from "./menu-model";

function getUserSub(event: APIGatewayProxyEventV2WithJWTAuthorizer): string | undefined {
  const sub = event.requestContext.authorizer.jwt.claims.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : undefined;
}

// POST /v1/menu
export const createMenu = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const userSub = getUserSub(event);
  if (!userSub) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  const body = (event.body ? JSON.parse(event.body) : {}) as GenerateMenuRequest;
  const menu = await service.generateMenu(userSub, body);
  return { statusCode: 200, body: JSON.stringify({ menu }) };
};

// GET /v1/menu/{id}
export const getMenuById = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const userSub = getUserSub(event);
  if (!userSub) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  const id = event.pathParameters?.id ?? "";
  const menu = await service.getMenuById(userSub, id);
  return { statusCode: 200, body: JSON.stringify({ menu }) };
};

// PATCH /v1/menu/{id}
export const replaceRecipe = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const userSub = getUserSub(event);
  if (!userSub) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  const id = event.pathParameters?.id ?? "";
  const ifMatchHeader = event.headers?.["if-match"] ?? event.headers?.["If-Match"];
  const expectedVersion =
    typeof ifMatchHeader === "string" && ifMatchHeader.trim() !== "" ? Number(ifMatchHeader) : undefined;
  const body = (event.body ? JSON.parse(event.body) : {}) as ReplaceRecipeRequest;
  const menu = await service.replaceRecipe(userSub, id, body, expectedVersion);
  return { statusCode: 200, body: JSON.stringify({ menu }) };
};

// POST /v1/menu/{id}/finalize
export const finalizeMenu = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const userSub = getUserSub(event);
  if (!userSub) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  const id = event.pathParameters?.id ?? "";
  const ifMatchHeader = event.headers?.["if-match"] ?? event.headers?.["If-Match"];
  const expectedVersion =
    typeof ifMatchHeader === "string" && ifMatchHeader.trim() !== "" ? Number(ifMatchHeader) : undefined;
  const menu = await service.finalizeMenu(userSub, id, expectedVersion);
  return { statusCode: 200, body: JSON.stringify({ menu }) };
};

// POST /v1/menu/{id}/prepare
export const prepareMenu = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const userSub = getUserSub(event);
  if (!userSub) return { statusCode: 401, body: JSON.stringify({ message: "Unauthorized" }) };
  const id = event.pathParameters?.id ?? "";
  const body = (event.body ? JSON.parse(event.body) : {}) as PrepareMenuRequest;
  const resp = await service.prepareMenu(userSub, id, body);
  return { statusCode: 200, body: JSON.stringify(resp) };
};
