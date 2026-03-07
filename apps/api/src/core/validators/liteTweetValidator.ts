import schema from "../../schemas/lite.tweet.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const liteTweetValidator = createAjvValidator(schema);