import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";

import { runTask } from "../core/workflow/registry.js";
import { requireApiKey, type AuthedRequest } from "../core/security/auth.js";
import { rateLimitRedisTcp } from "../core/security/rateLimitRedis.js";
import { prisma } from "../config/prisma.js";

const router = Router();

/**
 * 启动级检查
 * 没配 OPENAI_API_KEY 就直接报出来，避免线上静默失败

const hasOpenAIKey =
  typeof process.env.OPENAI_API_KEY === "string" &&
  process.env.OPENAI_API_KEY.trim().length > 0;

if (!hasOpenAIKey) {
  console.error("[OneAI][router] OPENAI_API_KEY is missing at startup");
}

/**
 * 安全 stringify，避免循环引用导致 JSON.stringify 崩掉
 */
function safeJsonStringify(value: unknown): string {
  try {
    const seen = new WeakSet();

    return JSON.stringify(value, (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }

      if (val instanceof Error) {
        return {
          name: val.name,
          message: val.message,
          stack: val.stack
        };
      }

      return val;
    });
  } catch {
    return String(value);
  }
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeEstimatedCostUsd(result: any): number {
  const raw =
    result?.usage?.estimatedCostUsd ??
    result?.usage?.estimatedCostUSD ??
    result?.usageTotal?.estimatedCostUsd ??
    result?.usageTotal?.estimatedCostUSD ??
    0;

  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function getOrgId(r: AuthedRequest): string | null {
  return (r as any).auth?.orgId || (r as any).auth?.apiKey?.orgId || null;
}

function getApiKeyId(r: AuthedRequest): string | null {
  return (r as any).auth?.apiKeyId || (r as any).auth?.apiKey?.id || null;
}

function classifyError(err: unknown): {
  statusCode: number;
  publicMessage: string;
  code: string;
  details?: string;
  retryable: boolean;
} {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

  const lower = String(message).toLowerCase();

  if (
    lower.includes("openai_api_key") ||
    lower.includes("api key") ||
    lower.includes("missing api key") ||
    lower.includes("unauthorized")
  ) {
    return {
      statusCode: 503,
      publicMessage: "Upstream AI provider is not configured correctly",
      code: "UPSTREAM_CONFIG_ERROR",
      details: message,
      retryable: false
    };
  }

  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("compute time")
  ) {
    return {
      statusCode: 429,
      publicMessage: "AI provider is temporarily rate limited",
      code: "UPSTREAM_RATE_LIMITED",
      details: message,
      retryable: true
    };
  }

  if (
    lower.includes("timeout") ||
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("service unavailable") ||
    lower.includes("bad gateway")
  ) {
    return {
      statusCode: 503,
      publicMessage: "AI provider is temporarily unavailable",
      code: "UPSTREAM_UNAVAILABLE",
      details: message,
      retryable: true
    };
  }

  if (
    lower.includes("zod") ||
    lower.includes("validation") ||
    lower.includes("invalid input")
  ) {
    return {
      statusCode: 400,
      publicMessage: "Invalid request payload",
      code: "INVALID_REQUEST",
      details: message,
      retryable: false
    };
  }

  return {
    statusCode: 500,
    publicMessage: "Internal task failure",
    code: "INTERNAL_ERROR",
    details: message,
    retryable: false
  };
}

/**
 * 尽量不让数据库写入影响主链路
 */
async function persistRequestSafe(data: any) {
  try {
    await prisma.request.create({ data });
  } catch (err) {
    console.error("[OneAI][router] failed to persist request", err);
  }
}

/**
 * 1) 安全中间件
 */
router.use(requireApiKey);
router.use(
  rateLimitRedisTcp({
    windowMs: 60_000,
    maxPerKeyPerWindow: 30,
    maxPerIpPerWindow: 20
  })
);

/**
 * 2) 请求结构校验
 */
const requestSchema = z.object({
  type: z.string().min(1).max(120),
  input: z.unknown(),
  options: z
    .object({
      templateVersion: z.number().int().positive().optional(),
      maxAttempts: z.number().int().min(1).max(5).optional(),
      debug: z.boolean().optional()
    })
    .optional()
});

router.post("/", async (req, res) => {
  const startTime = Date.now();
  const r = req as AuthedRequest;

  const apiKey = String(req.header("x-api-key") || "");
  const ip = req.ip ?? "unknown";
  const apiKeyHash = apiKey ? sha256(apiKey) : null;

  try {
    /**
     * 3) 请求前兜底：如果上游 key 没配置，直接阻断
     */
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
      console.error("[OneAI][router] OPENAI_API_KEY missing at request time");

      return res.status(503).json({
        success: false,
        error: "OPENAI_API_KEY not configured",
        code: "UPSTREAM_CONFIG_ERROR",
        retryable: false
      });
    }

    const parsed = requestSchema.parse(req.body);

    /**
     * 4) debug 仅 admin 可用
     */
    if (parsed.options?.debug && !r.auth?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "debug requires admin api key",
        code: "DEBUG_FORBIDDEN"
      });
    }

    const orgId = getOrgId(r);
    const apiKeyId = getApiKeyId(r);
    const inputHash = sha256(safeJsonStringify(parsed.input));

    let result: any;

    try {
      result = await runTask(parsed.type, parsed.input, parsed.options);
    } catch (err) {
      const classified = classifyError(err);
      const latencyMs = Date.now() - startTime;

      await persistRequestSafe({
        ...(orgId
          ? {
              org: {
                connect: { id: orgId }
              }
            }
          : {}),
        ...(apiKeyId
          ? {
              apiKey: {
                connect: { id: apiKeyId }
              }
            }
          : {}),
        task: parsed.type,
        inputJson: parsed.input as any,
        success: false,
        attempts: 1,
        model: "unknown",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        latencyMs,
        error: safeJsonStringify({
          code: classified.code,
          message: classified.details ?? classified.publicMessage,
          apiKeyHash,
          ip,
          inputHash
        })
      } as any);

      return res.status(classified.statusCode).json({
        success: false,
        error: classified.publicMessage,
        code: classified.code,
        retryable: classified.retryable,
        details: classified.details
      });
    }

    const latencyMs = Date.now() - startTime;
    const estimatedCostUsd = normalizeEstimatedCostUsd(result);
    const usageModel = result?.usage?.model ?? result?.usageTotal?.model ?? "unknown";

    /**
     * 5) 工作流执行成功，但结构化失败
     */
    if (!result?.success) {
      await persistRequestSafe({
        ...(orgId
          ? {
              org: {
                connect: { id: orgId }
              }
            }
          : {}),
        ...(apiKeyId
          ? {
              apiKey: {
                connect: { id: apiKeyId }
              }
            }
          : {}),
        task: parsed.type,
        inputJson: parsed.input as any,
        success: false,
        attempts: Number(result?.attempts ?? 1),
        model: usageModel,
        promptTokens: Number(result?.usage?.promptTokens ?? 0),
        completionTokens: Number(result?.usage?.completionTokens ?? 0),
        totalTokens: Number(result?.usage?.totalTokens ?? 0),
        estimatedCostUsd,
        latencyMs,
        error: safeJsonStringify({
          error: result?.error ?? "Failed to produce valid structured output",
          apiKeyHash,
          ip,
          inputHash
        })
      } as any);

      return res.status(422).json({
        success: false,
        attempts: result?.attempts ?? 1,
        error: "Failed to produce valid structured output",
        code: "WORKFLOW_OUTPUT_INVALID",
        details: result?.error ?? null,
        usage: result?.usage ?? null,
        usageTotal: result?.usageTotal ?? null,
        ...(parsed.options?.debug ? { usageSteps: result?.usageSteps ?? null } : {})
      });
    }

    /**
     * 6) 成功落库
     */
    await persistRequestSafe({
      ...(orgId
        ? {
            org: {
              connect: { id: orgId }
            }
          }
        : {}),
      ...(apiKeyId
        ? {
            apiKey: {
              connect: { id: apiKeyId }
            }
          }
        : {}),
      task: parsed.type,
      inputJson: parsed.input as any,
      success: true,
      attempts: Number(result?.attempts ?? 1),
      model: usageModel,
      promptTokens: Number(result?.usage?.promptTokens ?? 0),
      completionTokens: Number(result?.usage?.completionTokens ?? 0),
      totalTokens: Number(result?.usage?.totalTokens ?? 0),
      estimatedCostUsd,
      latencyMs
    } as any);

    /**
     * 7) 返回响应
     */
    return res.json({
      success: true,
      attempts: result?.attempts ?? 1,
      usage: result?.usage ?? null,
      usageTotal: result?.usageTotal ?? null,
      ...(parsed.options?.debug ? { usageSteps: result?.usageSteps ?? null } : {}),
      data: result?.data ?? null,
      latencyMs
    });
  } catch (err) {
    const classified = classifyError(err);
    const latencyMs = Date.now() - startTime;

    console.error("[OneAI][router] request failed", err);

    return res.status(classified.statusCode).json({
      success: false,
      error: classified.publicMessage,
      code: classified.code,
      retryable: classified.retryable,
      details: classified.details,
      latencyMs
    });
  }
});

export default router;