import { estimateMealItems } from "./health-core.js";

const DEFAULT_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";

export async function createMealAnalysis(payload) {
  const description = String(payload.description || "").trim();
  const imageDataUrl = String(payload.imageDataUrl || "");
  const profile = payload.profile && typeof payload.profile === "object" ? payload.profile : {};
  const fallback = estimateMealItems(description);

  if (!process.env.OPENAI_API_KEY) {
    return {
      mode: "fallback",
      items: fallback.items,
      totalCalories: fallback.totalCalories,
      message: "未检测到 OPENAI_API_KEY，已使用本地估算。",
      confidence: 0.42,
    };
  }

  const prompt = buildMealPrompt({ description, profile });
  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        ...(imageDataUrl
          ? [
              {
                type: "input_image",
                image_url: imageDataUrl,
                detail: "high",
              },
            ]
          : []),
      ],
    },
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input,
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const text = String(json.output_text || "");
  const parsed = parseMealJson(text);

  if (!parsed) {
    return {
      mode: "fallback",
      items: fallback.items,
      totalCalories: fallback.totalCalories,
      message: "AI 返回格式异常，已自动回退到本地估算。",
      confidence: 0.36,
    };
  }

  return sanitizeMealAnalysis(parsed, fallback);
}

export function buildMealPrompt({ description, profile }) {
  return [
    "你是一个严谨的饮食记录助手。",
    "请结合图片和文字描述，估算这一餐包含的食物、份量和热量。",
    "返回严格 JSON，不要返回 Markdown，不要解释。",
    'JSON 结构：{"items":[{"name":"食物名","amount":"估算份量","estimatedCalories":123}],"totalCalories":456,"message":"一句简短说明","confidence":0.78}',
    `用户补充描述：${description || "无"}`,
    `用户目标体重：${profile.goalWeightKg || "未知"} kg`,
    `用户身高：${profile.heightCm || "未知"} cm`,
  ].join("\n");
}

export function parseMealJson(text) {
  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export function extractJsonObject(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fenced) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return trimmed.slice(start, end + 1);
}

function sanitizeMealAnalysis(parsed, fallback) {
  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map((item) => ({
          name: String(item.name || "").trim(),
          amount: String(item.amount || "1 份").trim(),
          estimatedCalories: Number(item.estimatedCalories) || 0,
        }))
        .filter((item) => item.name && item.estimatedCalories > 0)
    : [];

  if (!items.length) {
    return {
      mode: "fallback",
      items: fallback.items,
      totalCalories: fallback.totalCalories,
      message: "AI 没有识别出有效食物项，已回退到本地估算。",
      confidence: 0.35,
    };
  }

  const totalCalories =
    Number(parsed.totalCalories) ||
    items.reduce((sum, item) => sum + item.estimatedCalories, 0);

  return {
    mode: "ai",
    items,
    totalCalories: Math.round(totalCalories),
    message: String(parsed.message || "已根据图片和描述完成估算。").trim(),
    confidence: normalizeConfidence(parsed.confidence),
  };
}

function normalizeConfidence(value) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 0.72;
  }

  if (numeric < 0) {
    return 0;
  }

  if (numeric > 1) {
    return 1;
  }

  return numeric;
}
