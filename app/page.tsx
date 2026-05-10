'use client';

import React, { useState, useEffect } from 'react';

// 定义图片类型
interface UploadedImage {
  data: string;
  mimeType: string;
  preview: string;
}

export default function Home() {
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // 控制台设置状态
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'anthropic', // 默认用 Claude
    model: 'claude-opus-4-7',
    apiKey: ''
  });

  // 初始化读取本地缓存
  useEffect(() => {
    const savedHistory = localStorage.getItem('ai_homework_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
    const savedSettings = localStorage.getItem('ai_settings');
    if (savedSettings) {
      try { setSettings(JSON.parse(savedSettings)); } catch (e) {}
    }
  }, []);

  const saveSettings = (newSettings: any) => {
    setSettings(newSettings);
    localStorage.setItem('ai_settings', JSON.stringify(newSettings));
  };

  // 带有前端 Canvas 智能压缩功能的多图上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsLoading(true); // 提示正在处理图片压缩

    const newImages = await Promise.all(files.map(file => {
      return new Promise<UploadedImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_DIMENSION = 1500; // 限制最大边长，完美绕过 Vercel 4.5MB 限制

            if (width > height && width > MAX_DIMENSION) {
              height *= MAX_DIMENSION / width;
              width = MAX_DIMENSION;
            } else if (height > MAX_DIMENSION) {
              width *= MAX_DIMENSION / height;
              height = MAX_DIMENSION;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            // 压缩为 jpeg，画质 0.7
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const data = compressedDataUrl.split(',')[1];
            
            resolve({ 
              data, 
              mimeType: 'image/jpeg', 
              preview: compressedDataUrl 
            });
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }));
    
    setSelectedImages(prev => [...prev, ...newImages]);
    setIsLoading(false);
    setResult(null);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startCorrection = async () => {
    if (!settings.apiKey) {
      alert('请先点击右上角【模型设置】填写您的 API Key！');
      setShowSettings(true);
      return;
    }
    if (selectedImages.length === 0) {
      alert('请先上传至少一张作业图片！');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const payloadImages = selectedImages.map(img => ({ data: img.data, mimeType: img.mimeType }));
      
      const response = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: payloadImages,
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '请求失败');

      setResult(data);

      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        score: data.summary?.total_score || 0,
        cost: data.billing?.costUsd || 0,
        data: data
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('ai_homework_history', JSON.stringify(updatedHistory));

    } catch (error: any) {
      alert('批改失败：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const viewHistory = (historyItem: any) => {
    setResult(historyItem.data);
    setSelectedImages([]); // 查看历史时不显示当前选中的图片
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">AI</div>
            <h1 className="text-xl font-semibold text-gray-800">智能作业批改</h1>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full font-medium transition-colors"
          >
            ⚙️ 模型设置
          </button>
        </div>
      </header>

      {/* BYOK 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">后台引擎设置</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择服务商</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settings.provider}
                  onChange={(e) => saveSettings({...settings, provider: e.target.value, model: e.target.value === 'anthropic' ? 'claude-opus-4-7' : 'gemini-1.5-pro'})}
                >
                  <option value="anthropic">Anthropic (Claude 家族)</option>
                  <option value="google">Google (Gemini 家族)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择具体模型</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settings.model}
                  onChange={(e) => saveSettings({...settings, model: e.target.value})}
                >
                  {settings.provider === 'anthropic' ? (
                    <>
                      <option value="claude-opus-4-7">Claude Opus 4.7 (旗舰/最强)</option>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (快速/高性价比)</option>
                    </>
                  ) : (
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (全能旗舰)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">您的 API Key <span className="text-red-500">*</span></label>
                <input 
                  type="password"
                  placeholder="sk-..."
                  className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                  value={settings.apiKey}
                  onChange={(e) => saveSettings({...settings, apiKey: e.target.value})}
                />
                <p className="text-xs text-gray-400 mt-2">密钥仅保存在您的浏览器本地，绝不上传至任何数据库。</p>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-lg mt-4 transition-colors"
              >
                保存并关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* 左侧上传区 */}
        <section className="flex-1 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">提交作业 (支持多页)</h2>
              <span className="text-sm text-gray-400">已选 {selectedImages.length} 张</span>
            </div>
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                <p className="text-sm text-gray-500"><span className="font-semibold">点击添加图片</span> (支持多选且自动压缩)</p>
              </div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>

            {selectedImages.length > 0 && (
              <div className="mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {selectedImages.map((img, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm aspect-[3/4]">
                      <img src={img.preview} alt={`作业 ${index + 1}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">第 {index + 1} 页</div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={startCorrection}
                  disabled={isLoading}
                  className={`w-full py-4 rounded-xl font-medium text-white transition-all text-lg shadow-md
                    ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'}`}
                >
                  {isLoading ? 'AI 正在深度阅卷中...' : `开始批改 (${selectedImages.length}张)`}
                </button>
              </div>
            )}
          </div>

          {/* 本地历史记录 */}
          {history.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">批改历史 (本地存储)</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {history.map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => viewHistory(item)}
                    className="flex-shrink-0 bg-gray-50 border border-gray-200 hover:border-blue-400 p-3 rounded-xl text-left transition-colors min-w-[140px]"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-2xl font-bold text-blue-600 mb-1">{item.score} <span className="text-sm font-normal text-gray-500">分</span></div>
                      {item.cost > 0 && <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">${item.cost}</span>}
                    </div>
                    <div className="text-xs text-gray-400">{item.date.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 右侧展示区 */}
        <section className="flex-1 lg:max-w-xl flex flex-col gap-6">
          
          {isLoading && (
            <div className="bg-white h-full min-h-[500px] rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">专家正在阅卷</h3>
              <p className="text-gray-400 text-center animate-pulse">正在提取核心知识点，生成综合评估报告...</p>
            </div>
          )}

          {!isLoading && result && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* 分数头部 */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white relative">
                
                {/* 实时账单 */}
                {result.billing && (
                   <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-mono border border-white/20 flex items-center gap-2 shadow-sm">
                     <span className="text-green-300 opacity-90">Tokens: {result.billing.inputTokens}+{result.billing.outputTokens}</span>
                     <span className="text-amber-300 font-bold border-l border-white/30 pl-2">💰 ${result.billing.costUsd}</span>
                   </div>
                )}

                <div className="mt-2">
                  <h2 className="text-3xl font-bold mb-1">综合批改报告</h2>
                  <p className="text-blue-100 opacity-90">共发现 {result.summary?.total_detected_questions || 0} 题 | 答对 {result.summary?.correct_count || 0} 题</p>
                </div>
                <div className="mt-5 text-left bg-white/20 backdrop-blur-md rounded-2xl p-4 inline-block border border-white/30 shadow-inner">
                  <span className="text-5xl font-extrabold mr-2 tracking-tight">{result.summary?.total_score || 0}</span>
                  <span className="text-sm opacity-90 font-medium">分 / 100</span>
                </div>
              </div>

              <div className="p-6 space-y-8">
                
                {/* 智能排版的三段式评语卡片 */}
                {result.teacher_comment && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg text-sm">💡</span> 
                      名师综合诊断
                    </h3>
                    <div className="space-y-4">
                      {result.teacher_comment
                        .split(/(?=【(?:闪光|专属|提升|老师|期待|名师).*?】)/)
                        .filter((para: string) => para.trim())
                        .map((para: string, idx: number) => {
                        let cleanPara = para.replace(/\\n/g, '\n').trim();
                        let title = '';
                        let content = cleanPara;
                        
                        const match = cleanPara.match(/^(【[^】]+】)([\s\S]*)/);
                        if (match) {
                          title = match[1].replace(/【|】/g, ''); 
                          content = match[2].trim();
                        }

                        let bgColor = "bg-gray-50 border border-gray-100";
                        let titleColor = "text-gray-800";
                        let icon = "📌";
                        
                        if (title.includes('闪光') || title.includes('优点')) {
                          bgColor = "bg-green-50/70 border border-green-200";
                          titleColor = "text-green-800";
                          icon = "✨";
                        } else if (title.includes('提升') || title.includes('秘籍') || title.includes('不足')) {
                          bgColor = "bg-amber-50/70 border border-amber-200";
                          titleColor = "text-amber-800";
                          icon = "🔍";
                        } else if (title.includes('期待') || title.includes('建议')) {
                          bgColor = "bg-blue-50/70 border border-blue-200";
                          titleColor = "text-blue-800";
                          icon = "🚀";
                        }

                        return (
                          <div key={idx} className={`p-6 rounded-xl shadow-sm transition-all hover:shadow-md ${bgColor}`}>
                             {title && (
                               <h4 className={`font-bold mb-4 flex items-center gap-2 text-lg border-b pb-2 border-current opacity-80 ${titleColor}`}>
                                 <span>{icon}</span> {title}
                               </h4>
                             )}
                             <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-justify">
                               {content}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 错题细节追踪 */}
                {result.correction_details && result.correction_details.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-red-100 text-red-500 p-1.5 rounded-lg text-sm">📝</span> 细节追踪
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {result.correction_details.map((q: any, i: number) => (
                        <div key={i} className={`p-4 rounded-xl border ${q.status === 'wrong' ? 'bg-red-50/50 border-red-100' : (q.status === 'partial' ? 'bg-amber-50/50 border-amber-100' : 'bg-green-50/50 border-green-100')}`}>
                           <div className="flex justify-between mb-2 items-center">
                             <span className="font-medium text-gray-800 bg-white px-2 py-1 rounded shadow-sm text-sm">题目 {q.id || i+1}</span>
                             <span className={`text-sm font-bold px-2 py-1 rounded-full ${q.status === 'wrong' ? 'bg-red-100 text-red-600' : (q.status === 'partial' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-700')}`}>
                               {q.status === 'wrong' ? '❌ 错误' : (q.status === 'partial' ? '⚠️ 部分正确' : '✅ 正确')}
                             </span>
                           </div>
                           <p className="text-sm text-gray-600 mt-3 leading-relaxed bg-white/50 p-3 rounded-lg"><span className="font-semibold text-gray-700">解析指引：</span>{q.process_analysis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {!isLoading && !result && (
            <div className="bg-white h-full min-h-[400px] rounded-2xl shadow-sm border border-gray-100 border-dashed flex flex-col items-center justify-center p-8 text-gray-400 transition-all hover:bg-gray-50">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <p className="font-medium text-gray-500">等待提交作业...</p>
              <p className="text-sm mt-2 text-gray-400 max-w-xs text-center leading-relaxed">支持一次性上传多页试卷，系统将自动压缩图像并进行全局综合批改</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
