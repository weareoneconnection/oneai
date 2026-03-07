import packSchema from "../../schemas/studio_lite_pack.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const studioLitePackValidator = createAjvValidator(packSchema);