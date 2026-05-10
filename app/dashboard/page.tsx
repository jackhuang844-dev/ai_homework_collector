'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [history, setHistory] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    avgScore: 0,
    totalGraded: 0,
    highestScore: 0,
    totalCost: 0
  });

  useEffect(() => {
    // 挂载时读取本地批改历史作为班级数据库
    const saved = localStorage.getItem('ai_homework_history');
    if (saved) {
      try {
        const parsedHistory = JSON.parse(saved);
        setHistory(parsedHistory);
        
        if (parsedHistory.length > 0) {
          const totalScore = parsedHistory.reduce((acc: number, curr: any) => acc + curr.score, 0);
          const maxScore = Math.max(...parsedHistory.map((h: any) => h.score));
          const totalCost = parsedHistory.reduce((acc: number, curr: any) => acc + (parseFloat(curr.cost) || 0), 0);
          
          setMetrics({
            avgScore: Math.round(totalScore / parsedHistory.length),
            totalGraded: parsedHistory.length,
            highestScore: maxScore,
            totalCost: totalCost
          });
        }
      } catch (e) {
        console.error("解析历史数据失败", e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-gray-100 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-[#0f172a] border-b border-gray-800 shadow-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#005CB9] text-white p-1.5 rounded-lg font-black text-xl leading-none">π</div>
            <h1 className="text-xl font-bold tracking-wide">希沃智教 <span className="font-light text-[#38bdf8]">Dashboard</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              返回批阅工作台
            </Link>
            <div className="flex items-center gap-2 text-sm bg-gray-800 text-gray-300 px-4 py-2 rounded-full border border-gray-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              数据已与基座同步
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-8 max-w-[1600px] w-full mx-auto space-y-8">
        
        {/* 顶部核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#38bdf8] rounded-full blur-[50px] opacity-20"></div>
            <p className="text-gray-400 text-sm font-medium mb-2">班级平均分</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">{metrics.avgScore}</span>
              <span className="text-gray-500">/ 100</span>
            </div>
          </div>
          
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500 rounded-full blur-[50px] opacity-20"></div>
            <p className="text-gray-400 text-sm font-medium mb-2">最高分</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">{metrics.highestScore}</span>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500 rounded-full blur-[50px] opacity-20"></div>
            <p className="text-gray-400 text-sm font-medium mb-2">累计批阅作业</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">{metrics.totalGraded}</span>
              <span className="text-gray-500">份</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#005CB9]/20 to-[#0f172a] border border-[#005CB9]/30 rounded-2xl p-6 shadow-lg">
            <p className="text-[#38bdf8] text-sm font-medium mb-2">AI 算力成本统计</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">${metrics.totalCost.toFixed(4)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">折合每份仅需 ${(metrics.totalCost / (metrics.totalGraded || 1)).toFixed(4)}</p>
          </div>
        </div>

        {/* 核心看板区 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左侧：高频薄弱知识点分析 */}
          <div className="col-span-2 bg-[#0f172a] border border-gray-800 rounded-2xl p-8 shadow-lg">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <i className="fa-solid fa-chart-bar text-[#38bdf8]"></i> 高频薄弱知识点追踪
              </h2>
              <span className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                AI 自动从 {metrics.totalGraded} 份样本中提取
              </span>
            </div>

            {/* 模拟的薄弱点横向条形图 */}
            <div className="space-y-6">
              {[
                { label: '立体几何辅助线构建', rate: 75, color: 'from-red-600 to-red-400' },
                { label: '完形填空上下文逻辑', rate: 60, color: 'from-amber-600 to-amber-400' },
                { label: '文言文实词翻译', rate: 45, color: 'from-[#005CB9] to-[#38bdf8]' },
                { label: '圆锥曲线联立方程', rate: 30, color: 'from-emerald-600 to-emerald-400' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-48 text-sm text-gray-300 text-right truncate" title={item.label}>
                    {item.label}
                  </div>
                  <div className="flex-grow h-4 bg-gray-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 ease-out`} 
                      style={{ width: `${item.rate}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-sm font-bold text-white text-right">{item.rate}%</div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl">
              <p className="text-sm text-blue-200">
                <span className="font-bold text-[#38bdf8]">💡 希沃 AI 教学建议：</span> 
                发现班级在【立体几何辅助线构建】上存在普遍困难（错误率75%）。建议明天早读课重点复习相关定理，并针对此知识点进行专项测验。
              </p>
            </div>
          </div>

          {/* 右侧：近期作业流 */}
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-8 shadow-lg flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6">批阅流水线记录</h2>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {history.length > 0 ? history.map((item, idx) => (
                <div key={idx} className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:bg-gray-800 transition-colors cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold text-lg">{item.score} <span className="text-xs font-normal text-gray-500">分</span></span>
                      {item.score < 60 && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded">需关注</span>}
                    </div>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                  <div className="text-xs text-gray-400 bg-gray-950 px-2 py-1 rounded-md border border-gray-800">
                    ${parseFloat(item.cost).toFixed(4)}
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-600 mt-10">暂无批改记录</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
