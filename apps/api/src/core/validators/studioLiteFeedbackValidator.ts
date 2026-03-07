import schema from "../../schemas/studioLiteFeedback.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const studioLiteFeedbackValidator = createAjvValidator(schema);