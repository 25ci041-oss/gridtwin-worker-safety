import React, { useState, useEffect } from 'react';
import { useGridStore } from '../../store/useGridStore';
import {
  Zap,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  User,
  Bell,
  ChevronDown
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    hardwareDevice,
    physicalSyncEnabled,
    setPhysicalSync,
  } = useGridStore();

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { hour12: true });
  const dateStr = time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="bg-[#070d1e] border-b border-slate-800/80 text-white px-6 py-3.5 flex items-center justify-between gap-4 select-none z-30 shadow-md">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white leading-tight">
              GRIDTWIN
            </h1>
            <p className="text-xs text-slate-400 font-medium leading-none mt-0.5">
              Distribution Digital Twin Lab
            </p>
          </div>
        </div>

        {/* System Online Pill Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-inner">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Online</span>
        </div>
      </div>

      {/* Center: Live Digital Clock */}
      <div className="flex items-center gap-2.5 text-slate-300 font-mono">
        <Clock className="w-5 h-5 text-cyan-400" />
        <div className="flex flex-col text-left leading-tight">
          <span className="text-sm font-bold text-white tracking-wide">{timeStr}</span>
          <span className="text-xs text-slate-400 font-medium">{dateStr}</span>
        </div>
      </div>

      {/* Right: ESP32 Hardware Status, Notifications, and Profile */}
      <div className="flex items-center gap-3.5">
        {/* ESP32 Wifi Pill */}
        <button
          onClick={() => setPhysicalSync(!physicalSyncEnabled)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono font-bold transition-all hover:border-cyan-500/50 shadow-sm"
          title="Toggle Physical Hardware Sync"
        >
          {hardwareDevice.status === 'ONLINE' ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-slate-200">
            ESP32 ({hardwareDevice.roundtrip_latency_ms || 18}ms)
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              hardwareDevice.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
            }`}
          />
        </button>

        {/* Notification Bell Button */}
        <button
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* User Profile Avatar with Name */}
        <div className="flex items-center gap-2.5 pl-1.5 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-bold text-white hidden md:inline tracking-wide">Madhu</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
};

