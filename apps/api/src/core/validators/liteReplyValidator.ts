import schema from "../../schemas/lite.reply.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const liteReplyValidator = createAjvValidator(schema);