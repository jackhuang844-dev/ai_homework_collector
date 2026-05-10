import { NextResponse } from 'next/server';

export const maxDuration = 60;

// 内置模型定价表 (每 1,000,000 Token 的美元价格)
const PRICING = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
};

export async function POST(request: Request) {
  try {
    // 接收前端传来的自定义配置
    const { images, provider, model, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: "请在页面右上角设置 API Key" }, { status: 400 });
    }
    if (!images || images.length === 0) {
      return NextResponse.json({ error: "请至少上传一张图片" }, { status: 400 });
    }

const SYSTEM_PROMPT = `你是一位深谙教育心理学的全科资深名师。请分析学生的手写作业图片，并输出纯 JSON 报告。

【核心空间感知指令】(Visual Grounding)
你必须将图片视为一个 100x100 的坐标系（左上角为 [0,0]，右下角为 [100,100]）。对于你发现的每一个错误、闪光点或知识点，你必须估算它在图片上的相对位置，并返回一个数组：[Y轴百分比, X轴百分比, 高度百分比, 宽度百分比]。例如 [30, 45, 10, 20]。

【知识点标签提取】
你必须总结出该学生在此次作业中暴露出的 1-3 个核心知识点薄弱项，作为简短的标签（如："非谓语动词"、"通分"、"立体几何辅助线"）放入 weak_points 数组中。

【JSON 严格格式要求】
必须输出合法 JSON，禁止使用英文双引号（除键名和标准字符串包裹外，内部引用一律用单引号），禁止物理换行（用 \\n 转义）。

请严格按照以下结构输出：
{
  "summary": { "total_score": 85, "correct_count": 8, "wrong_count": 2, "weak_points": ["知识点标签1", "知识点标签2"] },
  "correction_details": [
    {
      "id": 1,
      "type": "error", // "error", "highlight", 或 "suggestion"
      "question_text": "简要题干/原句",
      "process_analysis": "名师解析...",
      "bounding_box": [30, 15, 8, 40] 
    }
  ],
  "teacher_comment": "整体三段式评语，请用 \\n\\n 分段",
  "radar_analysis": { "计算与基础": 80, "逻辑思维": 70, "知识掌握": 90, "应用能力": 60, "书写规范": 85 }
}`;
    let rawText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    // ==========================================
    // 引擎 A: Anthropic (Claude)
    // ==========================================
    if (provider === 'anthropic') {
      const contentBlocks: any[] = images.map((img: any) => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType || 'image/jpeg', data: img.data }
      }));
      contentBlocks.push({ type: 'text', text: SYSTEM_PROMPT });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-opus-4-7',
          max_tokens: 4000,
          messages: [{ role: 'user', content: contentBlocks }]
        })
      });

      if (!res.ok) throw new Error(`Claude API 错误: ${await res.text()}`);
      
      const aiData = await res.json();
      rawText = aiData.content[0].text;
      inputTokens = aiData.usage.input_tokens;
      outputTokens = aiData.usage.output_tokens;
    } 
    // ==========================================
    // 引擎 B: Google (Gemini)
    // ==========================================
    else if (provider === 'google') {
      const parts: any[] = images.map((img: any) => ({
        inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.data }
      }));
      parts.push({ text: SYSTEM_PROMPT });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { responseMimeType: "application/json" } // Gemini 原生支持强制 JSON
        })
      });

      if (!res.ok) throw new Error(`Gemini API 错误: ${await res.text()}`);
      
      const aiData = await res.json();
      rawText = aiData.candidates[0].content.parts[0].text;
      inputTokens = aiData.usageMetadata?.promptTokenCount || 0;
      outputTokens = aiData.usageMetadata?.candidatesTokenCount || 0;
    } else {
      throw new Error("不支持的 AI 提供商");
    }

    // ==========================================
    // 计费模块与 JSON 解析
    // ==========================================
    const pricingConfig = PRICING[model as keyof typeof PRICING] || { input: 0, output: 0 };
    const cost = ((inputTokens / 1000000) * pricingConfig.input) + ((outputTokens / 1000000) * pricingConfig.output);

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) throw new Error("AI未返回合法的JSON结构");
    
    const cleanJsonString = rawText.substring(firstBrace, lastBrace + 1);
    const resultJson = JSON.parse(cleanJsonString);

    // 把算好的账单强行塞进返回结果里
    resultJson.billing = {
      model: model,
      inputTokens,
      outputTokens,
      costUsd: cost.toFixed(4) // 保留4位小数
    };

    return NextResponse.json(resultJson);

  } catch (error: any) {
    console.error("服务端严重错误:", error);
    return NextResponse.json({ error: error.message || "服务器内部错误" }, { status: 500 });
  }
}
