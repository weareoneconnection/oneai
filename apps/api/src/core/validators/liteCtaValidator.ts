import schema from "../../schemas/lite.cta.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const liteCtaValidator = createAjvValidator(schema);