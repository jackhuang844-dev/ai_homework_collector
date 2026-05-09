'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // 1. 初始化时从本地读取历史记录 (真实的本地记忆)
  useEffect(() => {
    const savedHistory = localStorage.getItem('ai_homework_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('读取历史记录失败', e);
      }
    }
  }, []);

  // 2. 处理图片上传与预览
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 生成预览 URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // 转换为 Base64 供 AI 读取
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // 提取 base64 的数据部分 (去掉 data:image/jpeg;base64, 前缀)
      const base64Data = base64String.split(',')[1];
      setBase64Image(base64Data);
    };
    reader.readAsDataURL(file);
    
    // 清空上次结果
    setResult(null);
  };

  // 3. 发送给 AI 进行批改
  const startCorrection = async () => {
    if (!base64Image) {
      alert('请先上传一张作业图片！');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          mimeType: 'image/jpeg'
        })
      });

      if (!response.ok) {
        throw new Error('网络请求失败，请检查控制台或 API 配置。');
      }

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      setResult(data);

      // 保存到本地历史记录
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        score: data.summary?.total_score || 0,
        data: data
      };
      const updatedHistory = [newHistoryItem, ...history].slice(0, 10); // 最多存10条
      setHistory(updatedHistory);
      localStorage.setItem('ai_homework_history', JSON.stringify(updatedHistory));

    } catch (error: any) {
      console.error(error);
      alert('批改失败：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 查看历史记录
  const viewHistory = (historyItem: any) => {
    setResult(historyItem.data);
    setImagePreview(null); // 历史记录暂不保存大图片，只看报告
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">AI</div>
            <h1 className="text-xl font-semibold text-gray-800">智能作业批改系统</h1>
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Powered by Claude Opus 4.7
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* 左侧：工作区 (上传 & 预览) */}
        <section className="flex-1 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">提交作业</h2>
            
            {/* 极简上传框 */}
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">点击上传</span> 或拖拽图片至此</p>
                <p className="text-xs text-gray-400">支持 JPG, PNG 格式</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {/* 图片预览与操作 */}
            {imagePreview && (
              <div className="mt-6">
                <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={imagePreview} alt="作业预览" className="w-full object-contain max-h-[400px] bg-gray-100" />
                </div>
                <button 
                  onClick={startCorrection}
                  disabled={isLoading}
                  className={`mt-4 w-full py-4 rounded-xl font-medium text-white transition-all text-lg shadow-md
                    ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'}`}
                >
                  {isLoading ? 'AI 正在深度思考中...' : '开始极速批改'}
                </button>
              </div>
            )}
          </div>

          {/* 真实的本地历史记录 */}
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

        {/* 右侧：报告展示区 */}
        <section className="flex-1 lg:max-w-xl flex flex-col gap-6">
          
          {/* 加载动画 */}
          {isLoading && (
            <div className="bg-white h-full min-h-[500px] rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-6"></div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">专家正在阅卷</h3>
              <p className="text-gray-400 text-center animate-pulse">正在提取核心知识点，生成多维雷达图...</p>
            </div>
          )}

          {/* 批改报告面板 */}
          {!isLoading && result && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* 分数头部 */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-1">批改报告</h2>
                  <p className="text-blue-100 opacity-90">共发现 {result.summary?.total_detected_questions || 0} 题 | 答对 {result.summary?.correct_count || 0} 题</p>
                </div>
                <div className="text-center bg-white/20 backdrop-blur-md rounded-2xl p-4 min-w-[100px] border border-white/30">
                  <span className="block text-4xl font-extrabold">{result.summary?.total_score || 0}</span>
                  <span className="text-xs opacity-90">总分 100</span>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* 三段式名师定制评语 */}
                {result.teacher_comment && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-600 p-1 rounded">💡</span> 名师诊断
                    </h3>
                    <div className="space-y-3">
                      {result.teacher_comment.split('\\n\\n').map((para: string, idx: number) => {
                        // 清理可能残留的普通 \n
                        const cleanPara = para.replace(/\\n/g, '').trim();
                        if (!cleanPara) return null;
                        
                        // 让带【】的标题高亮显示
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

                {/* 错题详情卡片 */}
                {result.correction_details && result.correction_details.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-red-100 text-red-500 p-1 rounded">📝</span> 细节诊断
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

          {/* 默认空状态 */}
          {!isLoading && !result && (
            <div className="bg-white h-full min-h-[400px] rounded-2xl shadow-sm border border-gray-100 border-dashed flex flex-col items-center justify-center p-8 text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <p>等待提交作业...</p>
              <p className="text-sm mt-2">上传图片后，报告将在此呈现</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
