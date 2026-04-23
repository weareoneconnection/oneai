export function checkMarketIntelligenceConstraints(data: any) {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("data must be an object");
    return { ok: false, errors };
  }

  if (!data.regime) {
    errors.push("regime required");
  }

  if (!data.bias) {
    errors.push("bias required");
  }

  if (typeof data.confidence !== "number" || Number.isNaN(data.confidence)) {
    errors.push("confidence must be a number");
  } else if (data.confidence < 0 || data.confidence > 100) {
    errors.push("confidence must be 0-100");
  }

  if (
    data.volatility !== undefined &&
    !["low", "normal", "high"].includes(data.volatility)
  ) {
    errors.push("volatility must be low | normal | high");
  }

  if (
    data.liquidity !== undefined &&
    !["thin", "normal", "deep"].includes(data.liquidity)
  ) {
    errors.push("liquidity must be thin | normal | deep");
  }

  if (!data.summary || typeof data.summary !== "string" || data.summary.length < 5) {
    errors.push("summary required");
  }

  return { ok: errors.length === 0, errors };
}