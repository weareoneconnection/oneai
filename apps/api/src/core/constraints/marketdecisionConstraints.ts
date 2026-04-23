export function checkMarketDecisionConstraints(data: any) {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("data must be an object");
    return { ok: false, errors };
  }

  if (!data.action) {
    errors.push("action required");
  } else if (!["BUY", "SELL", "HOLD"].includes(data.action)) {
    errors.push("action must be BUY | SELL | HOLD");
  }

  if (typeof data.confidence !== "number" || Number.isNaN(data.confidence)) {
    errors.push("confidence must be a number");
  } else if (data.confidence < 0 || data.confidence > 100) {
    errors.push("confidence must be 0-100");
  }

  if (!data.reason || typeof data.reason !== "string" || data.reason.length < 5) {
    errors.push("reason required");
  }

  if (
    data.entry !== undefined &&
    (typeof data.entry !== "number" || !Number.isFinite(data.entry))
  ) {
    errors.push("entry must be a number");
  }

  if (
    data.stopLoss !== undefined &&
    (typeof data.stopLoss !== "number" || !Number.isFinite(data.stopLoss))
  ) {
    errors.push("stopLoss must be a number");
  }

  if (
    data.takeProfit !== undefined &&
    (typeof data.takeProfit !== "number" || !Number.isFinite(data.takeProfit))
  ) {
    errors.push("takeProfit must be a number");
  }

  if (
    data.summary !== undefined &&
    (typeof data.summary !== "string" || data.summary.length < 3)
  ) {
    errors.push("summary must be a string");
  }

  if (data.action === "HOLD") {
    if (data.entry !== undefined && data.entry !== 0) {
      errors.push("entry should be omitted or 0 for HOLD");
    }
    if (data.stopLoss !== undefined && data.stopLoss !== 0) {
      errors.push("stopLoss should be omitted or 0 for HOLD");
    }
    if (data.takeProfit !== undefined && data.takeProfit !== 0) {
      errors.push("takeProfit should be omitted or 0 for HOLD");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}