import schema from "../../schemas/studioLiteDistribution.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const studioLiteDistributionValidator = createAjvValidator(schema);