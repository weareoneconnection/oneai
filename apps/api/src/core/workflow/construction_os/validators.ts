import Ajv2020Module from "ajv/dist/2020.js";
import * as AjvFormatsModule from "ajv-formats";
import moduleAnalysisSchema from "./schemas/module-analysis.schema.json" with { type: "json" };
import initialProjectAnalysisSchema from "./schemas/initial-project-analysis.schema.json" with { type: "json" };
import oneclawTaskSchema from "./schemas/oneclaw-task.schema.json" with { type: "json" };
import { createAjvValidator } from "../../validators/createAjvValidator.js";

const Ajv2020Ctor: any =
  (Ajv2020Module as any).default ?? (Ajv2020Module as any);
const addFormats: any =
  (AjvFormatsModule as any).default ?? (AjvFormatsModule as any);

function createValidatorWithRefs(schema: any, refs: any[]) {
  const ajv = new Ajv2020Ctor({
    allErrors: true,
    strict: false,
    validateFormats: true,
  });

  addFormats(ajv);
  for (const ref of refs) {
    ajv.addSchema(ref, ref.$id);
  }

  const validateFn = ajv.compile(schema);

  return {
    validate(data: any) {
      const ok = validateFn(data) as boolean;
      return { ok, errors: validateFn.errors ?? null };
    },
  };
}

export const constructionModuleAnalysisValidator =
  createAjvValidator(moduleAnalysisSchema);

export const constructionInitialProjectAnalysisValidator =
  createValidatorWithRefs(initialProjectAnalysisSchema, [moduleAnalysisSchema]);

export const constructionOneclawTaskValidator =
  createAjvValidator(oneclawTaskSchema);
