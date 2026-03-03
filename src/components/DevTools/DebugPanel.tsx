// ============================================
// Debug Panel - Development-only debugging UI
// Shows logs, state, and performance metrics
// ============================================

import { useState, useEffect, useRef } from 'react';
import { logger, type LogEntry } from '@/lib/logger';
import { getOfflineState, getSyncStatus } from '@/lib/offline';

export function DebugPanel() {
  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'state' | 'performance'>('logs');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to logs
  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs(prev => [...prev.slice(-99), entry]);
    });
    
    // Get initial logs
    setLogs(logger.getLogs().slice(-100));
    
    return unsubscribe;
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const clearLogs = () => {
    logger.clear();
    setLogs([]);
  };

  const exportLogs = () => {
    const blob = new Blob([logger.export()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dockerclaw-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[9999] bg-gray-900/90 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors font-mono text-sm"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] w-96 h-[600px] bg-gray-900/95 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-white font-semibold">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['logs', 'state', 'performance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-white bg-gray-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'logs' && (
          <div className="h-full flex flex-col">
            {/* Log actions */}
            <div className="flex gap-2 p-2 border-b border-gray-700">
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
              >
                Clear
              </button>
              <button
                onClick={exportLogs}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700"
              >
                Export
              </button>
            </div>
            
            {/* Log list */}
            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="break-words">
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`ml-2 font-bold ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="ml-2 text-gray-300">
                    [{log.component}]
                  </span>
                  <span className="ml-2 text-gray-200">
                    {log.message}
                  </span>
                  {log.data && (
                    <pre className="mt-1 ml-4 text-gray-500 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {activeTab === 'state' && (
          <div className="p-4 space-y-4 text-sm">
            <div>
              <h4 className="text-white font-semibold mb-2">Network</h4>
              <div className="bg-gray-800 p-3 rounded space-y-1">
                {Object.entries(getOfflineState()).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-gray-200">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-2">Sync</h4>
              <div className="bg-gray-800 p-3 rounded space-y-1">
                {Object.entries(getSyncStatus()).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-gray-200">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="p-4 text-sm">
            <div className="bg-gray-800 p-4 rounded">
              <h4 className="text-white font-semibold mb-3">Recent Errors</h4>
              {logger.getRecentErrors(5).length === 0 ? (
                <p className="text-gray-400">No recent errors</p>
              ) : (
                <div className="space-y-2">
                  {logger.getRecentErrors(5).map((log) => (
                    <div key={log.id} className="bg-red-900/30 p-2 rounded text-red-200">
                      <div className="font-semibold">{log.component}</div>
                      <div className="text-sm">{log.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
