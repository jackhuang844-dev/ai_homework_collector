import { NextResponse } from 'next/server';

export const maxDuration = 60;

const PRICING = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
};

export async function POST(request: Request) {
  try {
    const { images, provider, model, apiKey } = await request.json();

    if (!apiKey) return NextResponse.json({ error: "请配置 API Key" }, { status: 400 });
    if (!images || images.length === 0) return NextResponse.json({ error: "请上传图片" }, { status: 400 });

    // 👈 核心修改：明确要求大模型在 summary 中输出 weak_points 数组
    const SYSTEM_PROMPT = `你是一位深谙教育心理学的全科资深名师。请分析学生的手写作业图片，并输出纯 JSON 报告。

【核心空间感知指令】(Visual Grounding)
你必须将图片视为一个 100x100 的坐标系（左上角为 [0,0]，右下角为 [100,100]）。对于你发现的每一个错误、闪光点或知识点，你必须估算它在图片上的相对位置，并返回一个数组：[Y轴百分比, X轴百分比, 高度百分比, 宽度百分比]。例如 [30, 45, 10, 20]。

【知识点标签提取】
你必须总结出该学生在此次作业中暴露出的 1-3 个核心知识点薄弱项，作为简短的标签（如："分数的通分"、"时态一致性"、"辅助线构造"）放入 summary 的 weak_points 数组中。

【JSON 严格格式要求】
必须输出合法 JSON，禁止使用英文双引号（除键名和标准字符串包裹外，内部引用一律用单引号），禁止物理换行（用 \\n 转义）。

请严格按照以下结构输出：
{
  "summary": { 
    "total_score": 85, 
    "correct_count": 8, 
    "wrong_count": 2, 
    "total_detected_questions": 10,
    "weak_points": ["薄弱知识点1", "薄弱知识点2"] 
  },
  "correction_details": [
    {
      "id": 1,
      "type": "error", 
      "question_text": "简要题干/原句",
      "process_analysis": "名师解析...",
      "bounding_box": [30, 15, 8, 40] 
    }
  ],
  "teacher_comment": "整体三段式评语，请用 \\n\\n 分段",
  "radar_analysis": { "计算与基础": 80, "逻辑思维": 70, "知识掌握": 90, "应用能力": 60, "书写规范": 85 }
}`;

    let rawText = '';
    let inputTokens = 0, outputTokens = 0;

    if (provider === 'anthropic') {
      const contentBlocks: any[] = images.map((img: any) => ({
        type: 'image', source: { type: 'base64', media_type: img.mimeType || 'image/jpeg', data: img.data }
      }));
      contentBlocks.push({ type: 'text', text: SYSTEM_PROMPT });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: model || 'claude-opus-4-7', max_tokens: 4000, messages: [{ role: 'user', content: contentBlocks }] })
      });
      if (!res.ok) throw new Error(`Claude API 错误: ${await res.text()}`);
      
      const aiData = await res.json();
      rawText = aiData.content[0].text;
      inputTokens = aiData.usage.input_tokens; outputTokens = aiData.usage.output_tokens;
    } else if (provider === 'google') {
      const parts: any[] = images.map((img: any) => ({ inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.data } }));
      parts.push({ text: SYSTEM_PROMPT });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } })
      });
      if (!res.ok) throw new Error(`Gemini API 错误: ${await res.text()}`);
      
      const aiData = await res.json();
      rawText = aiData.candidates[0].content.parts[0].text;
      inputTokens = aiData.usageMetadata?.promptTokenCount || 0; outputTokens = aiData.usageMetadata?.candidatesTokenCount || 0;
    }

    const pricingConfig = PRICING[model as keyof typeof PRICING] || { input: 0, output: 0 };
    const cost = ((inputTokens / 1000000) * pricingConfig.input) + ((outputTokens / 1000000) * pricingConfig.output);

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) throw new Error("AI未返回合法JSON");
    
    const resultJson = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
    resultJson.billing = { model, inputTokens, outputTokens, costUsd: cost.toFixed(4) };

    return NextResponse.json(resultJson);

  } catch (error: any) {
    console.error("服务端错误:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
