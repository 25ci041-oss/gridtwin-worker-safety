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
  X
} from 'lucide-react';

export const LeftSidebar: React.FC = () => {
  const { activeTab, setActiveTab, isMobileNavOpen, setMobileNavOpen } = useGridStore();

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

  const handleNavClick = (id: string) => {
    if (id === '3d-twin') {
      setActiveTab('3d-twin');
    } else if (id === 'sld') {
      setActiveTab('sld');
    } else if (id === 'dashboard') {
      setActiveTab('dashboard');
    } else {
      setActiveTab(id as any);
    }
    setMobileNavOpen(false);
  };

  const renderNavContent = () => (
    <>
      <div className="flex flex-col gap-1.5 sm:gap-2">
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
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-bold transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/70'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-3.5">
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'
                  }`}
                />
                <span className="tracking-wide text-sm sm:text-base font-bold">{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Bottom Widgets */}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        {/* System Running Pill */}
        <div className="bg-[#0b132b]/90 border border-slate-800/90 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-white tracking-wide">System Running</span>
            </div>
            <span className="text-xs text-slate-300 font-semibold block mt-1">
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
    </>
  );

  return (
    <>
      {/* 1. Desktop & Laptop Sidebar (Fixed side navigation on lg screens) */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#070d1e] border-r border-slate-800/80 flex-col justify-between py-5 px-3.5 select-none overflow-y-auto">
        {renderNavContent()}
      </aside>

      {/* 2. Mobile & Tablet Slide-Over Drawer Navigation */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />

          {/* Drawer container */}
          <aside className="relative w-72 max-w-[85vw] bg-[#070d1e] border-r border-slate-800 flex flex-col justify-between p-4 sm:p-5 select-none z-10 shadow-2xl overflow-y-auto h-full">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="font-black text-sm tracking-wider text-white">NAVIGATION</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close Navigation Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
};
