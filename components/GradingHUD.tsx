// components/GradingHUD.tsx
import React from 'react';
import { GradingResult, CorrectionDetail } from '@/types';

interface GradingHUDProps {
  result: GradingResult | null;
  activeHotspot: CorrectionDetail | null;
}

export function GradingHUD({ result, activeHotspot }: GradingHUDProps) {
  return (
    // 👈 锁1：外层添加 h-full min-h-0，强制面板不能撑爆屏幕高度
    <section className="flex-[1] flex flex-col gap-6 w-full max-w-md h-full min-h-0">
      
      {/* 分数与账单看板 */}
      {/* 👈 锁2：添加 flex-shrink-0，防止评语太多时，把上方的计费信息挤压变形 */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-gray-700 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#005CB9] rounded-full blur-[80px] opacity-40"></div>
        <h2 className="text-gray-400 font-medium mb-1 tracking-wider text-sm uppercase">总评得分</h2>
        <div className="flex items-end gap-2 mb-4">
          <span className="text-6xl font-black text-white font-['Urbanist']">{result?.summary?.total_score || '-'}</span>
          <span className="text-xl text-gray-500 mb-1">/100</span>
        </div>
        
        {result?.billing && (
          <div className="bg-black/40 rounded-lg p-3 text-xs font-mono text-gray-400 border border-gray-800 overflow-hidden">
            <div className="flex justify-between mb-1">
              <span>消耗算力:</span> 
              <span className="text-[#38bdf8] truncate ml-2">{result.billing.inputTokens} In / {result.billing.outputTokens} Out</span>
            </div>
            <div className="flex justify-between">
              <span>预估成本:</span> 
              <span className="text-emerald-400">${result.billing.costUsd}</span>
            </div>
          </div>
        )}
      </div>

      {/* 动态 HUD 反馈区 */}
      {/* 👈 锁3：给动态反馈区添加 min-h-0，彻底激活内部的 overflow-y-auto 滚动条 */}
      <div className="flex-grow bg-[#0f172a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative min-h-0">
        <div className="h-12 bg-gray-900/50 border-b border-gray-800 flex items-center px-4 flex-shrink-0">
          <span className="text-sm font-bold text-gray-300">🔍 HUD 智能透视镜</span>
        </div>
        
        {/* 这个区域现在可以完美滚动了！ */}
        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
          {activeHotspot ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 border
                ${activeHotspot.type === 'error' ? 'bg-red-900/30 text-red-400 border-red-800/50' : 
                 (activeHotspot.type === 'highlight' ? 'bg-green-900/30 text-green-400 border-green-800/50' : 
                 'bg-amber-900/30 text-amber-400 border-amber-800/50')}`}>
                {activeHotspot.type === 'error' ? '❌ 逻辑谬误侦测' : (activeHotspot.type === 'highlight' ? '✨ 优质表达捕获' : '💡 优化建议')}
              </div>
              <h3 className="text-lg font-bold text-white mb-2 bg-gray-800/50 p-3 rounded-lg border-l-4 border-[#38bdf8]">
                "{activeHotspot.question_text}"
              </h3>
              <p className="text-gray-300 leading-relaxed mt-4 bg-black/20 p-4 rounded-xl border border-gray-800/50 shadow-inner">
                {activeHotspot.process_analysis}
              </p>
            </div>
          ) : result?.teacher_comment ? (
            <div className="space-y-5 animate-in fade-in duration-500">
              <p className="text-xs text-gray-500 text-center mb-6">👆 将鼠标悬停在左侧画卷的光圈上查看详情</p>
              {result.teacher_comment.split(/(?=【)/).filter((p: string) => p.trim()).map((para: string, idx: number) => {
                let clean = para.replace(/\\n/g, '\n').trim();
                const match = clean.match(/^(【[^】]+】)([\s\S]*)/);
                let title = '', content = clean, colorClass = "text-gray-200";
                if (match) { title = match[1].replace(/【|】/g, ''); content = match[2].trim(); }
                if (title.includes('闪光')) colorClass = "text-emerald-400";
                else if (title.includes('提升') || title.includes('秘籍')) colorClass = "text-amber-400";
                else if (title.includes('期待')) colorClass = "text-[#38bdf8]";

                return (
                  <div key={idx} className="bg-gray-800/30 border border-gray-700/50 p-4 rounded-xl">
                    {title && <h4 className={`font-bold mb-2 text-sm ${colorClass}`}>{title}</h4>}
                    <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <p className="text-4xl mb-3 opacity-20">📡</p>
              <p className="text-sm">雷达静默中</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
