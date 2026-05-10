'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AISettings, UploadedImage, GradingResult, CorrectionDetail } from '@/types';
import { processAndCompressImages } from '@/lib/image-processor';
import { SettingsModal } from '@/components/SettingsModal';
import { GradingHUD } from '@/components/GradingHUD';

export default function Home() {
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<CorrectionDetail | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AISettings>({ provider: 'anthropic', model: 'claude-opus-4-7', apiKey: '' });
  
  // 👈 新增：历史记录状态
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // 读取设置
    const savedSettings = localStorage.getItem('ai_settings');
    if (savedSettings) try { setSettings(JSON.parse(savedSettings)); } catch(e){}

    // 👈 新增：初始化时读取历史记录
    const savedHistory = localStorage.getItem('ai_homework_history');
    if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch(e){}
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setIsLoading(true);
    const newImages = await processAndCompressImages(files);
    // 👈 修改：使用追加模式，支持多次上传多张图
    setSelectedImages(prev => [...prev, ...newImages]); 
    setIsLoading(false);
    setResult(null);
    setActiveHotspot(null);
  };

  // 移除某张图片
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startCorrection = async () => {
    if (!settings.apiKey) return setShowSettings(true);
    if (selectedImages.length === 0) return alert('请先上传作业！');

    setIsLoading(true);
    setResult(null);
    setActiveHotspot(null);

    try {
      const response = await fetch('/api/correct', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: selectedImages, ...settings })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setResult(data);

      // 👈 核心修复：将新批改的结果追加保存到本地历史记录中，供 Dashboard 读取
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        score: data.summary?.total_score || 0,
        cost: data.billing?.costUsd || 0,
        data: data 
      };
      
      const updatedHistory = [newHistoryItem, ...history].slice(0, 50); // 最多保留50条记录
      setHistory(updatedHistory);
      localStorage.setItem('ai_homework_history', JSON.stringify(updatedHistory));

    } catch (error: any) {
      alert('批改失败：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-gray-100 flex flex-col">
      {/* 头部导航 */}
      <header className="bg-[#0f172a] border-b border-gray-800 shadow-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#005CB9] text-white p-1.5 rounded-lg font-black text-xl leading-none">π</div>
            <h1 className="text-xl font-bold tracking-wide">希沃智教 <span className="font-light text-[#38bdf8]">Workspace</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm bg-[#005CB9]/20 hover:bg-[#005CB9]/40 text-[#38bdf8] px-4 py-2 rounded-full border border-[#005CB9]/50 transition-colors font-medium">
              📊 进入学情看板
            </Link>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-full border border-gray-700 transition-colors">
              ⚙️ 生态配置
            </button>
          </div>
        </div>
      </header>

      {/* 设置弹窗组件 */}
      {showSettings && (
        <SettingsModal settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} />
      )}

      {/* 核心工作区 */}
      <main className="flex-grow flex p-6 gap-6 max-w-[1600px] w-full mx-auto relative h-[calc(100vh-64px)] overflow-hidden">
        
        {/* 左侧：画卷展示区 (Visual Grounding Area) */}
        <section className="flex-[2] bg-[#0f172a] border border-gray-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0f172a]/80 backdrop-blur z-10 flex-shrink-0">
            <div className="flex items-center gap-4">
              {/* 👈 修改：确保 input 带有 multiple 属性支持多选 */}
              <label className="cursor-pointer bg-[#005CB9] hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-medium text-sm shadow-lg transition-colors">
                + 载入多页原稿
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
              <span className="text-gray-500 text-sm">已选择 {selectedImages.length} 张图片</span>
            </div>
            {selectedImages.length > 0 && !isLoading && !result && (
               <button onClick={startCorrection} className="bg-[#38bdf8] hover:bg-sky-400 text-[#020617] px-6 py-2 rounded-lg font-bold text-sm shadow-lg transition-transform active:scale-95">
                 启动 AI 空间扫描
               </button>
            )}
          </div>

          <div className="flex-grow overflow-auto p-6 flex flex-col items-center bg-gray-950/50 relative custom-scrollbar">
            {selectedImages.length === 0 && !isLoading && (
              <div className="text-gray-600 text-center m-auto">
                 <p className="text-4xl mb-4">📄</p>
                 <p>载入学生作业以开启沉浸批阅</p>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#38bdf8]/30 border-t-[#38bdf8] rounded-full animate-spin mb-4"></div>
                <div className="text-[#38bdf8] font-medium tracking-widest animate-pulse">正在提取空间物理坐标与薄弱点...</div>
              </div>
            )}

            {selectedImages.length > 0 && (
              <div className="w-full flex flex-col items-center gap-6">
                
                {/* 👈 新增：多图预览缩略图网格 */}
                <div className="w-full bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                  <h3 className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">作业序列 (共 {selectedImages.length} 页)</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative flex-shrink-0 w-20 h-28 rounded-md overflow-hidden border border-gray-700 group">
                        <img src={img.preview} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" alt={`缩略图 ${idx+1}`} />
                        <button 
                          onClick={() => removeImage(idx)} 
                          className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >✕</button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-center text-gray-300 py-0.5">P{idx+1}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 核心画布：目前默认在第一张图上渲染 HUD 锚点 */}
                <div className="relative shadow-2xl rounded-lg overflow-hidden group border border-gray-800/50">
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-md z-10">HUD 映射层 - 页码 1</div>
                  <img src={selectedImages[0].preview} alt="作业原稿" className="max-w-full max-h-[60vh] object-contain block" />
                  
                  {/* 渲染 AI 返回的空间坐标锚点 */}
                  {result?.correction_details?.map((detail, idx) => {
                    if (!detail.bounding_box) return null;
                    const [y, x, h, w] = detail.bounding_box;
                    const isError = detail.type === 'error';
                    const isHighlight = detail.type === 'highlight';
                    const colorCode = isError ? '239, 68, 68' : (isHighlight ? '34, 197, 94' : '245, 158, 11');
                    const isActive = activeHotspot?.id === detail.id;

                    return (
                      <div 
                        key={idx}
                        onMouseEnter={() => setActiveHotspot(detail)}
                        onMouseLeave={() => setActiveHotspot(null)}
                        className="absolute border-[3px] rounded cursor-pointer transition-all duration-300 ease-out"
                        style={{
                          top: `${y}%`, left: `${x}%`, height: `${h}%`, width: `${w}%`,
                          borderColor: `rgb(${colorCode})`,
                          backgroundColor: isActive ? `rgba(${colorCode}, 0.2)` : 'transparent',
                          boxShadow: isActive ? `0 0 20px rgba(${colorCode}, 0.6)` : `0 0 10px rgba(${colorCode}, 0.2)`,
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                          zIndex: isActive ? 10 : 1
                        }}
                      >
                        <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg" style={{ backgroundColor: `rgb(${colorCode})` }}>
                          {isError ? '!' : (isHighlight ? '★' : '?')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 右侧组件：抽出为单独文件管理 */}
        <GradingHUD result={result} activeHotspot={activeHotspot} />
      </main>
      
      {/* 滚动条美化 */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
}
