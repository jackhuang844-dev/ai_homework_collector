// app/page.tsx 关键修改点

// 1. 在组件内部增加 history 状态 (约第17行)
const [history, setHistory] = useState<any[]>([]);

// 2. 在 useEffect 中初始化读取历史记录 (约第21行)
useEffect(() => {
  const saved = localStorage.getItem('ai_settings');
  if (saved) try { setSettings(JSON.parse(saved)); } catch(e){}
  
  // 👈 新增：读取历史记录
  const savedHistory = localStorage.getItem('ai_homework_history');
  if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch(e){}
}, []);

// 3. 在 startCorrection 函数中，成功获取 data 后增加保存逻辑 (约第62行)
const data = await response.json();
if (!response.ok) throw new Error(data.error);
setResult(data);

// 👈 新增：将本次结果持久化存储，供 Dashboard 读取
const newHistoryItem = {
  id: Date.now(),
  date: new Date().toLocaleString(),
  score: data.summary?.total_score || 0,
  cost: data.billing?.costUsd || 0,
  data: data // 包含完整的 JSON，包括 weak_points
};
const updatedHistory = [newHistoryItem, ...history].slice(0, 100); // 保留最近100条
setHistory(updatedHistory);
localStorage.setItem('ai_homework_history', JSON.stringify(updatedHistory));
