// components/SettingsModal.tsx
import React from 'react';
import { AISettings } from '@/types';

interface SettingsModalProps {
  settings: AISettings;
  setSettings: (settings: AISettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, setSettings, onClose }: SettingsModalProps) {
  const handleSave = () => {
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-bold text-white mb-6">数字基座引擎接入</h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2">算力供应商</label>
            <select 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#38bdf8]"
              value={settings.provider} 
              onChange={(e) => setSettings({...settings, provider: e.target.value})}
            >
              <option value="anthropic">Anthropic (Claude 视觉增强)</option>
              <option value="google">Google (Gemini 视觉极速)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">开发者密钥 (API Key)</label>
            <input 
              type="password" 
              placeholder="sk-..." 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-[#38bdf8] font-mono text-sm"
              value={settings.apiKey} 
              onChange={(e) => setSettings({...settings, apiKey: e.target.value})} 
            />
          </div>
          <button 
            onClick={handleSave} 
            className="w-full bg-[#005CB9] hover:bg-blue-600 text-white font-bold p-3 rounded-lg mt-4 transition-all"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
