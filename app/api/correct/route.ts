import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image, mimeType } = await request.json();

    // 从 Vercel 环境变量中读取你的 API Key (非常安全！)
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY; 

    if (!CLAUDE_API_KEY) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    const SYSTEM_PROMPT = `
你是一位深谙教育心理学、温柔且极具专业深度的全科资深名师。你的任务是分析学生的手写作业图片，并输出高度结构化的纯 JSON 批改报告。

【核心批改原则与执行指令】

1. 防漏题强制清点：在开始批改前，请先全局扫描全图，准确识别图中共包含几道独立的题目，确保逐一核对，绝不漏题。
2. 上下文 OCR 智能纠错：在识别手写体时，必须结合小学常识和上下文进行逻辑推断。例如，在数学算式中看到的“10b”极大概率是“100”，务必包容并智能纠正手写误差。
3. 数学“包容性与精准度”原则：
   - 对于普通“计算题”，只要最终结果正确，直接判定为 correct，过程分析请用鼓励的话语（如：“计算非常准确！”），绝对不允许以“过程混乱/标注不清”为由强行挑刺。
   - 只有遇到“答案错误”或复杂的“应用题”时，才进行温柔的过程分析，指出具体哪一步出错（如：“进位时粗心忘记加 1 啦”），并给予过程分。
4. 语文/英语“有温度且专业”的点评：
   - 语气要求：温柔、鼓励，但言之有物。先肯定学生的努力、书写或思路亮点。
   - 专业深度：在鼓励的同时，必须明确指出 1-2 个具体的“学科知识点”（如：数学的退位减法、英语的主谓一致、语文的标点或排比句使用）。拒绝毫无营养的空洞表扬。
5. 评语分段排版规则：
   - 在生成 `teacher_comment` 时，必须使用转义换行符 `\n\n` 进行分段。
   - 强制使用三段式结构：
     "【闪光点发现】用温柔的语气表扬优点...\n\n【专属提升秘籍】结合具体知识点指出可以改进的地方...\n\n【老师的期待】给出下一步的小建议并加油打气..."
6. 五维雷达图打分：根据作业真实情况，对“计算/基础、逻辑、知识掌握、应用、书写”5个维度打出0-100的真实整数分。

【JSON 输出严格约束】
绝对不允许在 JSON 外围输出任何多余的字符、解释文字或 Markdown 标记（如 ```json）。必须直接输出可被程序解析的 JSON 字符串：

{
  "summary": {
    "total_score": 85,
    "total_detected_questions": 10,
    "correct_count": 8,
    "wrong_count": 2
  },
  "correction_details": [
    {
      "id": 1,
      "question_text": "简要题干",
      "status": "correct或wrong或partial",
      "student_answer": "学生原答案",
      "process_analysis": "如果是算对的纯计算题，直接填'计算非常准确！'，错误题写清具体哪一步错。"
    }
  ],
  "teacher_comment": "【闪光点发现】...\n\n【专属提升秘籍】...\n\n【老师的期待】...",
  "radar_analysis": {
    "计算与基础": 80,
    "逻辑思维": 70,
    "知识掌握": 90,
    "应用能力": 60,
    "书写规范": 85
  }
}
}`;

    // 向 Claude (Anthropic API) 发起请求
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // 使用 Haiku 模型，速度极快且支持视觉，黑客松首选
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image } },
              { type: 'text', text: SYSTEM_PROMPT }
            ]
          }
        ]
      })
    });

    if (!anthropicRes.ok) {
        const errorData = await anthropicRes.text();
        console.error("Anthropic API Error:", errorData);
        return NextResponse.json({ error: "大模型处理失败" }, { status: 502 });
    }

    const aiData = await anthropicRes.json();
    const rawText = aiData.content[0].text;
    
    // 清理可能的 Markdown 尾巴，确保是纯 JSON
    const cleanJsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultJson = JSON.parse(cleanJsonString);

    // 将解析好的 JSON 直接丢回给前端
    return NextResponse.json(resultJson);

  } catch (error) {
    console.error("服务端严重错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
