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

  useEffect(() => {
    const savedHistory = localStorage.getItem('ai_homework_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  // 👈 核心修改1：支持多文件读取和预览生成
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 并发读取所有选中的图片
    const newImages = await Promise.all(files.map(file => {
      return new Promise<UploadedImage>((resolve) => {
        const previewUrl = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const data = base64String.split(',')[1];
          resolve({ data, mimeType: file.type || 'image/jpeg', preview: previewUrl });
        };
        reader.readAsDataURL(file);
      });
    }));
    
    setSelectedImages(prev => [...prev, ...newImages]);
    setResult(null);
  };

  // 删除单张图片
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // 👈 核心修改2：打包发送多张图片数组
  const startCorrection = async () => {
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
        body: JSON.stringify({ images: payloadImages })
      });

      if (!response.ok) throw new Error('网络请求失败，请检查控制台或 API 配置。');
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResult(data);

      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        score: data.summary?.total_score || 0,
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
            <h1 className="text-xl font-semibold text-gray-800">智能作业批改系统</h1>
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Powered by Claude Opus 4.7</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        <section className="flex-1 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">提交作业 (支持多页)</h2>
              <span className="text-sm text-gray-400">已选 {selectedImages.length} 张</span>
            </div>
            
            {/* 👈 核心修改3：多文件上传的 Input */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                <p className="text-sm text-gray-500"><span className="font-semibold">点击添加图片</span> (可多选)</p>
              </div>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>

            {/* 多图预览网格 */}
            {selectedImages.length > 0 && (
              <div className="mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {selectedImages.map((img, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm aspect-[3/4]">
                      <img src={img.preview} alt={`作业 ${index + 1}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-80 hover:opacity-100 shadow-md transition-opacity"
                        title="移除图片"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">
                        第 {index + 1} 页
                      </div>
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

          {history.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">批改历史 (本地存储)</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {history.map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => viewHistory(item)}
                    className="flex-shrink-0 bg-gray-50 border border-gray-200 hover:border-blue-400 p-3 rounded-xl text-left transition-colors min-w-[140px]"
                  >
                    <div className="text-2xl font-bold text-blue-600 mb-1">{item.score} <span className="text-sm font-normal text-gray-500">分</span></div>
                    <div className="text-xs text-gray-400">{item.date.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="flex-1 lg:max-w-xl flex flex-col gap-6">
          {isLoading && (
            <div className="bg-white h-full min-h-[500px] rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">专家正在阅卷</h3>
              <p className="text-gray-400 text-center animate-pulse">正在提取多页知识点，进行综合诊断...</p>
            </div>
          )}

          {!isLoading && result && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-1">综合批改报告</h2>
                  <p className="text-blue-100 opacity-90">共发现 {result.summary?.total_detected_questions || 0} 题 | 答对 {result.summary?.correct_count || 0} 题</p>
                </div>
                <div className="text-center bg-white/20 backdrop-blur-md rounded-2xl p-4 min-w-[100px] border border-white/30">
                  <span className="block text-4xl font-extrabold">{result.summary?.total_score || 0}</span>
                  <span className="text-xs opacity-90">总分 100</span>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {result.teacher_comment && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-600 p-1 rounded">💡</span> 名师综合诊断
                    </h3>
                    <div className="space-y-3">
                      {result.teacher_comment.split('\\n\\n').map((para: string, idx: number) => {
                        const cleanPara = para.replace(/\\n/g, '').trim();
                        if (!cleanPara) return null;
                        const isTitle = cleanPara.startsWith('【');
                        return (
                          <div key={idx} className={`p-4 rounded-xl ${isTitle ? 'bg-blue-50/50 text-blue-900 border border-blue-100' : 'bg-gray-50 text-gray-700 leading-relaxed'}`}>
                             {cleanPara}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {result.correction_details && result.correction_details.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-red-100 text-red-500 p-1 rounded">📝</span> 细节追踪
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {result.correction_details.map((q: any, i: number) => (
                        <div key={i} className={`p-4 rounded-xl border ${q.status === 'wrong' ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
                           <div className="flex justify-between mb-2">
                             <span className="font-medium text-gray-800">题目 {q.id || i+1}</span>
                             <span className={`text-sm font-bold ${q.status === 'wrong' ? 'text-red-500' : 'text-green-600'}`}>
                               {q.status === 'wrong' ? '错误' : (q.status === 'partial' ? '部分正确' : '正确')}
                             </span>
                           </div>
                           <p className="text-sm text-gray-600 mt-2"><span className="font-semibold text-gray-700">解析：</span>{q.process_analysis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoading && !result && (
            <div className="bg-white h-full min-h-[400px] rounded-2xl shadow-sm border border-gray-100 border-dashed flex flex-col items-center justify-center p-8 text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <p>等待提交作业...</p>
              <p className="text-sm mt-2">支持一次性上传多页试卷进行综合批改</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
