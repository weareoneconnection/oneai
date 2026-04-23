export function checkMarketAnalysisConstraints(data: any) {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return {
      ok: false,
      errors: ["data must be an object"],
    };
  }

  if (!data.marketState) {
    errors.push("marketState required");
  }

  if (!data.summary || typeof data.summary !== "string" || data.summary.length < 5) {
    errors.push("summary too short");
  }

  if (typeof data?.marketState?.confidence !== "number") {
    errors.push("marketState.confidence must be number");
  } else if (data.marketState.confidence < 0 || data.marketState.confidence > 1) {
    errors.push("marketState.confidence must be 0-1");
  }

  if (!data.setup) {
    errors.push("setup required");
  }

  if (typeof data?.setup?.confidence !== "number") {
    errors.push("setup.confidence must be number");
  } else if (data.setup.confidence < 0 || data.setup.confidence > 1) {
    errors.push("setup.confidence must be 0-1");
  }

  if (!Array.isArray(data?.levels?.support)) {
    errors.push("support must be an array");
  }

  if (!Array.isArray(data?.levels?.resistance)) {
    errors.push("resistance must be an array");
  }

  if (
    data?.levels?.triggerZone !== undefined &&
    !Array.isArray(data.levels.triggerZone)
  ) {
    errors.push("triggerZone must be an array");
  }

  if (
    data?.signals !== undefined &&
    (typeof data.signals !== "object" || Array.isArray(data.signals))
  ) {
    errors.push("signals must be an object");
  }

  if (
    data?.signals?.momentum !== undefined &&
    !["bullish", "bearish", "fading", "mixed"].includes(data.signals.momentum)
  ) {
    errors.push("signals.momentum invalid");
  }

  if (
    data?.signals?.volumeCondition !== undefined &&
    !["supportive", "weak", "elevated", "abnormal"].includes(
      data.signals.volumeCondition
    )
  ) {
    errors.push("signals.volumeCondition invalid");
  }

  if (
    data?.signals?.riskCondition !== undefined &&
    !["low", "moderate", "high"].includes(data.signals.riskCondition)
  ) {
    errors.push("signals.riskCondition invalid");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}