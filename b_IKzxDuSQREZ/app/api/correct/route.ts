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
你是一个顶级的全科AI教师和教育数据分析师。你的任务是仔细观察并分析用户上传的手写作业图片（可能是数学、语文或英语），并输出高度结构化的批改报告。
1. 判断学科类型并批改。对于数学，若答案错但步骤部分正确，必须给予“过程分”并在 process_analysis 中说明。
2. 数据统计。
3. 撰写 80-120 字极具个性化的评语。
4. 对5个能力维度（计算/基础、逻辑、知识掌握、应用、书写）打分（0-100整数）。

你必须严格只输出以下 JSON 格式数据，绝对不要在外面加任何代码块(如\`\`\`json)或文字：
{
  "summary": {"total_score": 85, "correct_count": 5, "wrong_count": 1, "unmarked_count": 0},
  "correction_details": [
    {"id": 1, "question_text": "简要题干", "status": "correct或wrong或partial", "student_answer": "学生原答案", "process_analysis": "诊断分析或过程分理由"}
  ],
  "teacher_comment": "...",
  "radar_analysis": {"计算/基础规范": 80, "逻辑思维": 70, "知识掌握": 90, "应用能力": 60, "书写规范": 85}
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
        model: 'claude-3-haiku-20240307', // 使用 Haiku 模型，速度极快且支持视觉，黑客松首选
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