import schema from "../../schemas/lite.launch.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const liteLaunchValidator = createAjvValidator(schema);