import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(request: Request) {
  try {
    // 👈 核心修改1：接收一个包含多张图片的数组
    const { images } = await request.json();
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    if (!CLAUDE_API_KEY) {
      return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "请至少上传一张图片" }, { status: 400 });
    }

    const SYSTEM_PROMPT = `你是一位深谙教育心理学、温柔且极具专业深度的全科资深名师。你的任务是分析学生上传的多张手写作业图片，把它们视为同一份作业的多个页面，并输出高度结构化的纯 JSON 批改报告。

【核心批改原则与执行指令】
1. 防漏题强制清点：在开始批改前，请先全局扫描所有图片，准确识别共包含几道独立的题目，确保逐一核对，绝不漏题。
2. 上下文 OCR 智能纠错：结合小学常识和上下文进行推断，包容并智能纠正手写误差。
3. 数学原则：对于算对的计算题，直接判定为 correct，给出鼓励；遇到答案错误或复杂应用题才指出具体哪一步出错。
4. 语文/英语点评：语气温柔鼓励，必须明确指出 1-2 个具体的学科知识点。
5. 五维雷达图打分：综合所有图片中的作业表现，打出0到100的真实整数分。

【JSON 输出极其严格的语法约束（生死攸关）】
必须且只能输出合法的 JSON 字符串。
1. 绝对不允许输出多余的解释文字或 Markdown 标记。
2. 【禁止使用英文双引号】：内部生成字符串时，绝对不能使用英文双引号（"），强制使用中文双引号（“”）或单引号（'）。
3. 【禁止物理换行】：字符串内部绝对不能打出真实的回车/物理换行。所有的换行必须使用转义字符 \\n 或 \\n\\n。
4. 确保所有括号完美闭合。

请严格按照以下格式输出：
{
  "summary": { "total_score": 85, "total_detected_questions": 10, "correct_count": 8, "wrong_count": 2 },
  "correction_details": [ { "id": 1, "question_text": "简要题干", "status": "correct或wrong或partial", "student_answer": "学生原答案", "process_analysis": "解析..." } ],
  "teacher_comment": "【闪光点发现】...\\n\\n【专属提升秘籍】...\\n\\n【老师的期待】...",
  "radar_analysis": { "计算与基础": 80, "逻辑思维": 70, "知识掌握": 90, "应用能力": 60, "书写规范": 85 }
}`;

    // 👈 核心修改2：把多张图片动态组装成 Claude 需要的格式
    const contentBlocks: any[] = images.map((img: any) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mimeType || 'image/jpeg', data: img.data }
    }));
    // 最后加上我们的名师指令
    contentBlocks.push({ type: 'text', text: SYSTEM_PROMPT });

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
        messages: [{ role: 'user', content: contentBlocks }]
      })
    });

    if (!anthropicRes.ok) {
        const errorData = await anthropicRes.text();
        console.error("Anthropic API Error:", errorData);
        return NextResponse.json({ error: "大模型处理失败" }, { status: 502 });
    }

    const aiData = await anthropicRes.json();
    const rawText = aiData.content[0].text;

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("AI没有返回包含 {} 的数据");
    }
    
    const cleanJsonString = rawText.substring(firstBrace, lastBrace + 1);
    const resultJson = JSON.parse(cleanJsonString);

    return NextResponse.json(resultJson);

  } catch (error) {
    console.error("服务端严重错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
