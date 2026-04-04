import xPublisherSchema from "../../schemas/x-publisher.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const xPublisherValidator = createAjvValidator(xPublisherSchema);