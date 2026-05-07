"use client"

import { useState, useRef } from "react"
import { 
  Bell, 
  Settings, 
  ChevronDown, 
  Upload, 
  CloudUpload, 
  Info, 
  FileText, 
  CheckCircle2, 
  XCircle,
  Download,
  PlayCircle,
  Loader2
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from "recharts"

// ================= Mock 数据区 (保持左侧栏好看) =================
const correctionHistory = [
  { id: 1, subject: "数学", name: "王小明", grade: "三年级(1)班", time: "2024-05-20 14:30", score: 95, scoreColor: "#52c41a" },
  { id: 2, subject: "语文", name: "李思思", grade: "三年级(1)班", time: "2024-05-20 14:25", score: 78, scoreColor: "#faad14" },
  { id: 3, subject: "英语", name: "张子涵", grade: "三年级(1)班", time: "2024-05-20 14:20", score: 88, scoreColor: "#1677ff" },
]

function SubjectIcon({ subject }: { subject: string }) {
  const bgColors: Record<string, string> = { "数学": "bg-[#1677ff]", "语文": "bg-[#52c41a]", "英语": "bg-[#722ed1]" }
  const icons: Record<string, string> = { "数学": "π", "语文": "文", "英语": "En" }
  return (
    <div className={`w-10 h-10 rounded-lg ${bgColors[subject] || "bg-gray-400"} flex items-center justify-center text-white font-bold text-sm`}>
      {icons[subject] || subject[0]}
    </div>
  )
}

function CircularProgress({ score, total }: { score: number; total: number }) {
  const percentage = (score / total) * 100
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  return (
    <div className="relative w-[140px] h-[140px]">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="#f0f0f0" strokeWidth="10" fill="none" />
        <circle cx="70" cy="70" r={radius} stroke="#52c41a" strokeWidth="10" fill="none" strokeDasharray={`${(percentage/100) * circumference} ${circumference}`} strokeDashoffset="0" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-gray-800">{score}</span>
        <span className="text-sm text-gray-500">分</span>
        <span className="text-xs text-gray-400">总分 {total}</span>
      </div>
    </div>
  )
}

// ================= 主应用组件 =================
export default function Dashboard() {
  const [selectedSubject, setSelectedSubject] = useState("math")
  const [selectedGrade, setSelectedGrade] = useState("primary-1-3")
  
  // 🔥 新增：用于 AI 逻辑的状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null); // 存放 AI 返回的 JSON 数据
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAiReport(null); // 清除旧报告
    }
  };

  // 核心！向 AI 发送请求
  const handleStartGrading = async () => {
    if (!selectedFile) {
        alert("请先上传作业图片！");
        return;
    }

    setIsLoading(true);

    try {
        // 将文件转为 Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        });
        reader.readAsDataURL(selectedFile);
        const base64Data = await base64Promise;

        // 请求本地后端 API (Next.js route)
        const response = await fetch('/api/correct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                image: base64Data, 
                mimeType: selectedFile.type,
                subject: selectedSubject // 可以把选中的科目传过去辅助AI
            })
        });

        if (!response.ok) throw new Error("API 请求失败");

        const data = await response.json();
        setAiReport(data); // 🔥 把拿到的 JSON 存进状态，右侧面板会自动刷新！

    } catch (error) {
        console.error("批改失败:", error);
        alert("网络请求失败，请检查控制台或 API Key 配置。");
    } finally {
        setIsLoading(false);
    }
  };

  // 整理雷达图数据格式（把对象的 key-value 转成 Recharts 要求的数组）
  const getRadarData = () => {
      if(!aiReport || !aiReport.radar_analysis) return [];
      return Object.entries(aiReport.radar_analysis).map(([key, value]) => ({
          subject: key,
          value: value,
          fullMark: 100
      }));
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="h-16 bg-[#1677ff] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#1677ff] font-bold text-sm">AI</span>
          </div>
          <h1 className="text-white text-lg font-medium">AI智能作业批改</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 ml-2">
            <Avatar className="w-9 h-9">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=teacher" />
              <AvatarFallback>张</AvatarFallback>
            </Avatar>
            <div className="text-white text-sm">
              <div className="font-medium">你的名字 (独立开发者)</div>
              <div className="text-white/70 text-xs">CVTE 黑客松</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar (保持不变) */}
        <aside className="w-[300px] bg-white border-r border-gray-100 flex flex-col">
           <div className="p-4 border-b border-gray-100">
             <h2 className="text-base font-semibold text-gray-800">批改历史 (Mock)</h2>
           </div>
           <ScrollArea className="flex-1 p-3">
              {correctionHistory.map((item) => (
                <div key={item.id} className="p-3 mb-2 bg-white border border-gray-100 rounded-lg">
                  <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">{item.name}</span>
                      <span style={{ color: item.scoreColor }} className="font-bold">{item.score}分</span>
                  </div>
                </div>
              ))}
           </ScrollArea>
        </aside>

        {/* Center - Main Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 学科选择 Tab */}
          <div className="bg-white border-b border-gray-100 px-6 pt-4">
            <div className="flex gap-8">
              {[ {id: "math", name: "数学", icon: "π", color: "#1677ff"}, {id: "chinese", name: "语文", icon: "文", color: "#52c41a"}, {id: "english", name: "英语", icon: "En", color: "#722ed1"}].map(sub => (
                   <button 
                   key={sub.id}
                   onClick={() => setSelectedSubject(sub.id)}
                   className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${selectedSubject === sub.id ? `border-[${sub.color}] text-[${sub.color}]` : "border-transparent text-gray-500"}`}
                 >
                   <span className="font-medium">{sub.name}</span>
                 </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          <div className="flex-1 p-6 overflow-auto">
            {/* 隐藏的真实 Input */}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#1677ff]/40 rounded-xl bg-[#f6faff] hover:border-[#1677ff] transition-colors h-[340px] flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
            >
              {previewUrl ? (
                // 如果有图片，全屏显示预览
                <img src={previewUrl} alt="Preview" className="h-full object-contain p-2" />
              ) : (
                 // 否则显示上传提示
                <>
                  <div className="w-20 h-20 mb-4 text-[#1677ff] flex items-center justify-center">
                    <CloudUpload className="w-16 h-16" strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-700 text-base mb-2">点击此处上传手写作业图片</p>
                  <Button className="bg-[#1677ff] hover:bg-[#4096ff] text-white px-8 mt-4">上传作业</Button>
                </>
              )}
            </div>

            {/* Start Button */}
            <div className="mt-6">
              <Button 
                onClick={handleStartGrading}
                disabled={isLoading || !selectedFile}
                className="w-full h-12 bg-[#1677ff] hover:bg-[#4096ff] text-white text-base font-medium rounded-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> AI 正在深度分析中...</>
                ) : (
                  <><PlayCircle className="w-5 h-5 mr-2" /> 开始极速批改</>
                )}
              </Button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Report (如果 aiReport 有数据才渲染真实数据，否则显示骨架或空白) */}
        <aside className="w-[320px] bg-white border-l border-gray-100 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">AI 批改报告</h2>
              </div>

              {!aiReport ? (
                 <div className="text-center text-gray-400 mt-20">等待提交作业...</div>
              ) : (
                <>
                  {/* Score Circle */}
                  <div className="flex items-center gap-6 mb-6">
                    <CircularProgress score={aiReport.summary.total_score} total={100} />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#52c41a]" />
                        <span className="text-xs text-gray-600">对 {aiReport.summary.correct_count}题</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff4d4f]" />
                        <span className="text-xs text-gray-600">错 {aiReport.summary.wrong_count}题</span>
                      </div>
                    </div>
                  </div>

                  {/* Question Details */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">详情分析</h3>
                    <div className="space-y-3">
                      {aiReport.correction_details.map((q: any) => (
                        <div key={q.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <span className="text-sm font-medium text-gray-800">{q.question_text}</span>
                            {q.status === 'correct' ? <CheckCircle2 className="w-4 h-4 text-[#52c41a]" /> : <XCircle className="w-4 h-4 text-[#ff4d4f]" />}
                          </div>
                          <div className="text-xs text-gray-500 mb-1">作答: {q.student_answer}</div>
                          {q.status !== 'correct' && (
                             <div className="text-xs text-[#d48806] bg-[#fffbe6] p-1.5 rounded mt-1">
                               💡 诊断: {q.process_analysis}
                             </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teacher Comments */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold text-gray-800 mb-3">AI 定制评语</h3>
                    <div className="bg-[#fffbe6] border border-[#ffe58f] rounded-lg p-4">
                      <p className="text-sm text-[#ad6800] leading-relaxed">
                        {aiReport.teacher_comment}
                      </p>
                    </div>
                  </div>

                  {/* Capability Radar Chart */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 mb-3">多维能力图谱</h3>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={getRadarData()}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                          <Radar name="能力值" dataKey="value" stroke="#1677ff" fill="#1677ff" fillOpacity={0.3} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  )
}