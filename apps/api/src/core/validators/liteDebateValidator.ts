import schema from "../../schemas/lite.debate.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const liteDebateValidator = createAjvValidator(schema);