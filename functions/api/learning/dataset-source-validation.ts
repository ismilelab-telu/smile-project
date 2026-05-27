import { handleDatasetSourcePageValidationRequest } from "../../../src/features/learning/server/dataset-source-page-validation.ts";

type PagesFunctionContext = {
  request: Request;
};

export function onRequest(context: PagesFunctionContext) {
  return handleDatasetSourcePageValidationRequest(context.request);
}
