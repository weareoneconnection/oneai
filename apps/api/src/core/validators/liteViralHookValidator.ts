import hookSchema from "../../schemas/liteViralHook.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const liteViralHookValidator = createAjvValidator(hookSchema);