import xEngageSchema from "../../schemas/x-engage.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const xEngageValidator = createAjvValidator(xEngageSchema);