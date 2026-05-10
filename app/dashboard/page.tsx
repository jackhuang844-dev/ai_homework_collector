'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// 👈 新增引入路由模块
import { useRouter } from 'next/navigation';

interface WeakPointStats {
  label: string;
  rate: number;
  count: number;
  color: string;
}

export default function Dashboard() {
  const router = useRouter(); // 👈 实例化路由
  const [history, setHistory] = useState<any[]>([]);
  const [weakPoints, setWeakPoints] = useState<WeakPointStats[]>([]);
  const [metrics, setMetrics] = useState({
    avgScore: 0,
    totalGraded: 0,
    highestScore: 0,
    totalCost: 0
  });

  useEffect(() => {
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

          const pointsTally: Record<string, number> = {};
          parsedHistory.forEach((item: any) => {
            const points = item.data?.summary?.weak_points || [];
            points.forEach((pt: string) => {
              pointsTally[pt] = (pointsTally[pt] || 0) + 1;
            });
          });

          const colors = [
            'from-red-600 to-red-400',
            'from-amber-600 to-amber-400',
            'from-[#005CB9] to-[#38bdf8]',
            'from-emerald-600 to-emerald-400'
          ];
          
          const aggregatedPoints = Object.entries(pointsTally)
            .map(([label, count], index) => ({
              label,
              count,
              rate: Math.min(100, Math.round((count / parsedHistory.length) * 100)),
              color: colors[index % colors.length]
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4); 

          setWeakPoints(aggregatedPoints);
        }
      } catch (e) {
        console.error("解析历史数据失败", e);
      }
    }
  }, []);

  // 👈 新增：核心“时光机”触发器
  const handleViewHistory = (id: number) => {
    // 写入目标作业 ID
    sessionStorage.setItem('view_history_id', id.toString());
    // 立刻穿梭回工作台
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-gray-100 flex flex-col">
      <header className="bg-[#0f172a] border-b border-gray-800 shadow-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#005CB9] text-white p-1.5 rounded-lg font-black text-xl leading-none">π</div>
            <h1 className="text-xl font-bold tracking-wide">希沃智教 <span className="font-light text-[#38bdf8]">Dashboard</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[#38bdf8] hover:text-white transition-colors bg-[#005CB9]/20 px-4 py-2 rounded-full border border-[#005CB9]/50">
              🔙 返回工作台
            </Link>
            <div className="flex items-center gap-2 text-sm bg-gray-800 text-gray-300 px-4 py-2 rounded-full border border-gray-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              数据已与基座同步
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow p-8 max-w-[1600px] w-full mx-auto space-y-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-2 bg-[#0f172a] border border-gray-800 rounded-2xl p-8 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <i className="fa-solid fa-chart-bar text-[#38bdf8]"></i> 班级高频薄弱知识点追踪
              </h2>
              <span className="text-xs text-[#38bdf8] bg-[#005CB9]/20 px-3 py-1 rounded-full border border-[#005CB9]/50 animate-pulse">
                实时计算中
              </span>
            </div>

            <div className="space-y-6 flex-grow flex flex-col justify-center">
              {weakPoints.length > 0 ? (
                weakPoints.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-48 text-sm text-gray-300 text-right truncate font-medium" title={item.label}>
                      {item.label}
                    </div>
                    <div className="flex-grow h-4 bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 ease-out`} 
                        style={{ width: `${item.rate}%` }}
                      ></div>
                    </div>
                    <div className="w-16 text-sm font-bold text-white text-right">{item.rate}% <span className="text-[10px] text-gray-500 font-normal">({item.count}次)</span></div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-600 flex flex-col items-center">
                  <span className="text-4xl mb-4">📊</span>
                  <p>系统需要更多新版批改数据来生成分析</p>
                  <p className="text-xs mt-2">请返回工作台，至少批改一份新作业</p>
                </div>
              )}
            </div>

            {weakPoints.length > 0 && (
              <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl">
                <p className="text-sm text-blue-200">
                  <span className="font-bold text-[#38bdf8]">💡 希沃 AI 教学建议：</span> 
                  基于对最新 {metrics.totalGraded} 份作业的深度扫描，发现班级在【{weakPoints[0].label}】上出错频率最高（共计{weakPoints[0].count}次）。建议将此知识点纳入明日课堂专项复习计划。
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-8 shadow-lg flex flex-col max-h-[500px]">
            <h2 className="text-xl font-bold text-white mb-6">批阅流水线记录</h2>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {history.length > 0 ? history.map((item, idx) => (
                // 👈 核心修改：给历史记录卡片绑定 onClick 事件
                <div 
                  key={idx} 
                  onClick={() => handleViewHistory(item.id)}
                  className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:bg-gray-800 transition-colors cursor-pointer group"
                  title="点击回溯此份作业"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold text-lg group-hover:text-[#38bdf8] transition-colors">{item.score} <span className="text-xs font-normal text-gray-500">分</span></span>
                      {item.score < 60 && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-900/50">重点关注</span>}
                    </div>
                    <p className="text-xs text-gray-500">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-400 bg-gray-950 px-2 py-1 rounded-md border border-gray-800 font-mono">
                      ${parseFloat(item.cost).toFixed(4)}
                    </div>
                    <span className="text-gray-600 group-hover:text-[#38bdf8] transition-colors">▶</span>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-600 mt-10">暂无批改记录</div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
}
