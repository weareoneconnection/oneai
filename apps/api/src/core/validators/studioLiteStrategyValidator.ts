import schema from "../../schemas/studioLiteStrategy.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const studioLiteStrategyValidator = createAjvValidator(schema);