// apps/api/src/core/validators/createAjvValidator.ts
import Ajv2020Module from "ajv/dist/2020.js";
import * as AjvFormatsModule from "ajv-formats";

const Ajv2020Ctor: any = (Ajv2020Module as any).default ?? (Ajv2020Module as any);
const addFormats: any = (AjvFormatsModule as any).default ?? (AjvFormatsModule as any);

export function createAjvValidator(schema: any) {
  const ajv = new Ajv2020Ctor({
    allErrors: true,
    strict: false,
    validateFormats: true
  });

  // ✅ 支持 date-time / uri / email 等
  addFormats(ajv);

  const validateFn = ajv.compile(schema);

  return {
    validate(data: any) {
      const ok = validateFn(data) as boolean;
      return { ok, errors: validateFn.errors ?? null };
    }
  };
}