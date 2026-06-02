import { handleLearningBackendProxyRequest } from "../../../src/features/learning/server/learning-backend-proxy.ts";

type PagesFunctionContext = {
  env?: {
    LEARNING_BACKEND_URL?: string;
    LEARNING_BACKEND_PROXY_SECRET?: string;
  };
  params?: {
    path?: string | string[];
  };
  request: Request;
};

export function onRequest(context: PagesFunctionContext) {
  return handleLearningBackendProxyRequest(context);
}
