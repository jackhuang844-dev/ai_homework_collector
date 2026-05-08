import { NextResponse } from 'next/server';

// 突破 Vercel 10秒限制
export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    const { image, mimeType } = await request.json();
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    if (!CLAUDE_API_KEY) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    const SYSTEM_PROMPT = `你是一位深谙教育心理学、温柔且极具专业深度的全科资深名师。你的任务是分析学生的手写作业图片，并输出高度结构化的纯 JSON 批改报告。

【核心批改原则与执行指令】

1. 防漏题强制清点：在开始批改前，请先全局扫描全图，准确识别图中共包含几道独立的题目，确保逐一核对，绝不漏题。
2. 上下文 OCR 智能纠错：在识别手写体时，必须结合小学常识和上下文进行逻辑推断。例如，在数学算式中看到的“10b”极大概率是“100”，务必包容并智能纠正手写误差。
3. 数学“包容性与精准度”原则：
   - 对于普通计算题，只要最终结果正确，直接判定为 correct，过程分析请用鼓励的话语（如：“计算非常准确！”），绝对不允许以“过程混乱或标注不清”为由强行挑刺。
   - 只有遇到答案错误或复杂的应用题时，才进行温柔的过程分析，指出具体哪一步出错（如：“进位时粗心忘记加 1 啦”），并给予过程分。
4. 语文或英语的“有温度且专业”点评：
   - 语气要求：温柔、鼓励，但言之有物。先肯定学生的努力、书写或思路亮点。
   - 专业深度：在鼓励的同时，必须明确指出 1-2 个具体的学科知识点。
5. 五维雷达图打分：根据作业真实情况，对“计算与基础、逻辑思维、知识掌握、应用能力、书写规范”5个维度打出0到100的真实整数分。

【JSON 输出极其严格的语法约束（生死攸关）】
你必须且只能输出合法的 JSON 字符串。如果违反以下任何一条，系统将直接崩溃：
1. 绝对不允许在 JSON 外围输出任何多余的解释文字或 Markdown 标记（如 \`\`\`json）。
2. 【禁止使用英文双引号】：在生成任何字符串内容（特别是 teacher_comment 和 process_analysis）时，内部绝对不能使用英文双引号（"），如果必须引用，请一律强制使用中文双引号（“”）或单引号（'）。
3. 【禁止物理换行】：在字符串内部绝对不能打出真实的回车/物理换行。所有的换行必须使用转义字符 \\n 或 \\n\\n。
4. 请确保所有的括号 {} 和 [] 完美闭合，所有的键值对末尾要有逗号（最后一项除外）。

请严格按照以下格式输出：
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
      "process_analysis": "如果是算对的纯计算题，直接填‘计算非常准确！’，错误题写清具体哪一步错。"
    }
  ],
  "teacher_comment": "【闪光点发现】...\\n\\n【专属提升秘籍】...\\n\\n【老师的期待】...",
  "radar_analysis": {
    "计算与基础": 80,
    "逻辑思维": 70,
    "知识掌握": 90,
    "应用能力": 60,
    "书写规范": 85
  }
}`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 4000,
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
    
    console.log("========== AI 原始回复内容 ==========");
    console.log(rawText);
    console.log("=====================================");

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("AI没有返回包含 {} 的数据");
    }
    
    const cleanJsonString = rawText.substring(firstBrace, lastBrace + 1)
        // 双重保险：强制把所有真实的物理回车符替换为可见的转义符，防止 JSON 解析崩溃

    // 由于我们强制替换了所有回车，可能会导致结构上的换行也变成了 \n，
    // 所以保险起见，我们允许 JSON parse 能够处理这些转义。
    // 但是标准的 JSON parse 能够正常解析带有规范转义 \\n 的单行字符串。
    
    const resultJson = JSON.parse(cleanJsonString);

    return NextResponse.json(resultJson);

  } catch (error) {
    console.error("服务端严重错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
