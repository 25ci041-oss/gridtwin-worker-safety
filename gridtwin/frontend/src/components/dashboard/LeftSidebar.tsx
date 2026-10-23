import React from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Home,
  Box,
  Layers,
  Activity,
  Cpu,
  Bell,
  BarChart3,
  Settings,
  Zap,
  GitFork,
} from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useGridStore();

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, badge: null },
    { id: '3d-twin', label: '3D Lab', icon: Box, badge: null },
    { id: 'sld', label: '2D Lab', icon: Layers, badge: null },
    { id: 'overview', label: 'Grid Overview', icon: GitFork, badge: null },
    { id: 'monitoring', label: 'Monitoring', icon: Activity, badge: null },
    { id: 'hardware', label: 'Devices', icon: Cpu, badge: null },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: '2' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#070d1e] border-r border-slate-800/80 flex flex-col justify-between py-5 px-3.5 select-none">
      <div className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.id === 'dashboard' && (activeTab === 'dashboard' || (activeTab as any) === 'home')) ||
            (item.id === '3d-twin' && activeTab === '3d-twin') ||
            (item.id === 'sld' && activeTab === 'sld') ||
            (item.id === 'overview' && (activeTab as any) === 'overview') ||
            (item.id === 'monitoring' && (activeTab as any) === 'monitoring') ||
            (item.id === 'hardware' && activeTab === 'hardware') ||
            (item.id === 'analytics' && activeTab === 'analytics') ||
            (item.id === 'alerts' && (activeTab as any) === 'alerts') ||
            (item.id === 'settings' && (activeTab as any) === 'settings');

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === '3d-twin') {
                  setActiveTab('3d-twin');
                } else if (item.id === 'sld') {
                  setActiveTab('sld');
                } else if (item.id === 'dashboard') {
                  setActiveTab('dashboard');
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/70'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'
                  }`}
                />
                <span className="tracking-wide text-sm">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Bottom Widgets matching Screenshot */}
      <div className="mt-auto flex flex-col gap-2.5 pt-4">
        {/* Project Card */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 tracking-wide">Project</span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            Distribution Digital Twin Lab
          </p>
          <span className="text-[11px] text-slate-500 font-mono block mt-1">
            v1.0.0
          </span>
        </div>

        {/* System Running Pill */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wide">System Running</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              ESP32 Connected
            </span>
          </div>
          <div className="flex items-end gap-1 h-3.5">
            <span className="w-1 bg-emerald-400 h-2 rounded-sm" />
            <span className="w-1 bg-emerald-400 h-3 rounded-sm" />
            <span className="w-1 bg-emerald-400 h-4 rounded-sm" />
          </div>
        </div>
      </div>
    </aside>
  );
};
