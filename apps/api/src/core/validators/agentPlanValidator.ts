import agentPlanSchema from "../../schemas/agent_plan.schema.json" with { type: "json" };
import { createAjvValidator } from "./createAjvValidator.js";

export const agentPlanValidator = createAjvValidator(agentPlanSchema);