import schema from "../../schemas/lite.thread.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const liteThreadValidator = createAjvValidator(schema);