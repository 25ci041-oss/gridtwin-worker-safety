import React, { useEffect, useState } from 'react';
import { useGridStore } from './store/useGridStore';
import { Header } from './components/dashboard/Header';
import { KPIBar } from './components/dashboard/KPIBar';
import { LeftSidebar } from './components/dashboard/LeftSidebar';
import { GridCanvas } from './components/3d/GridCanvas';
import { SingleLineDiagram } from './components/dashboard/SingleLineDiagram';
import { DashboardOperationsCenter } from './components/dashboard/DashboardOperationsCenter';
import { SwitchControlPanel } from './components/dashboard/SwitchControlPanel';
import { MetricsChart } from './components/dashboard/MetricsChart';
import { EventLogFeed } from './components/dashboard/EventLogFeed';
import { HardwareBridgePanel } from './components/dashboard/HardwareBridgePanel';
import { ScenarioLabPanel } from './components/dashboard/ScenarioLabPanel';
import { ElementInspectorModal } from './components/dashboard/ElementInspectorModal';

export function App() {
  const { activeTab, syncWithBackendData } = useGridStore();
  const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: true }));

  // Polling / WebSocket effect to connect with FastAPI backend if running
  useEffect(() => {
    let isSubscribed = true;

    const checkBackend = async () => {
      try {
        const res = await fetch('/api/dashboard/summary');
        if (res.ok && isSubscribed) {
          const data = await res.json();
          syncWithBackendData(data);
          setLastUpdatedTime(new Date().toLocaleTimeString('en-US', { hour12: true }));
        }
      } catch {
        // Standalone simulation mode active
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [syncWithBackendData]);

  return (
    <div className="h-screen bg-[#060a16] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* 1. SCADA Global Top Header */}
      <Header />

      {/* 2. Main Workspace: Left Sidebar on left, then KPI Bar + Full Width Center Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <LeftSidebar />

        {/* Center Section: KPI Bar (Home Only) + Main Center Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top 6-Card KPI Bar - ONLY shown on Home page */}
          {(activeTab === 'dashboard' || (activeTab as any) === 'home') && <KPIBar />}

          {/* Central Dynamic Content Viewport - Full Width, Spacious, No Right Sidebar */}
          <main className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-[#080e21]">
            {/* A. DASHBOARD VIEW ("Home"): 2D Schematic + Center Operations Center */}
            {(activeTab === 'dashboard' || (activeTab as any) === 'home') && (
              <div className="flex flex-col gap-5">
                {/* 2D Schematic Grid View */}
                <SingleLineDiagram />

                {/* Operations Center: Grid Operation, Live Readings, Tower Status, Quick Actions, How It Works */}
                <DashboardOperationsCenter />
              </div>
            )}

            {/* B. 3D GRID VIEW: Full-Screen 3D Grid Model */}
            {activeTab === '3d-twin' && (
              <div className="w-full h-full flex-1">
                {/* 3D Canvas Viewport expanded to full height without KPI bar */}
                <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative h-[calc(100vh-105px)] bg-slate-950">
                  <GridCanvas />
                </div>
              </div>
            )}

            {/* C. GRID OVERVIEW (SLD Standalone View) */}
            {activeTab === 'sld' && (
              <div className="flex flex-col gap-5">
                <SingleLineDiagram />
                <SwitchControlPanel />
              </div>
            )}

            {/* D. MONITORING & ANALYTICS */}
            {(activeTab === 'analytics' || (activeTab as any) === 'monitoring') && (
              <div className="flex flex-col gap-5">
                <MetricsChart />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <SwitchControlPanel />
                  <EventLogFeed />
                </div>
              </div>
            )}

            {/* E. DEVICES & HARDWARE BRIDGE */}
            {(activeTab === 'hardware' || (activeTab as any) === 'devices') && (
              <div className="flex flex-col gap-5">
                <HardwareBridgePanel />
              </div>
            )}

            {/* F. ALERTS */}
            {(activeTab as any) === 'alerts' && (
              <div className="flex flex-col gap-5">
                <EventLogFeed />
                <SwitchControlPanel />
              </div>
            )}

            {/* G. SETTINGS & SCENARIO LAB */}
            {(activeTab === 'scenarios' || (activeTab as any) === 'settings') && (
              <div className="flex flex-col gap-5">
                <ScenarioLabPanel />
                <SwitchControlPanel />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Element Inspector Modal */}
      <ElementInspectorModal />
    </div>
  );
}

export default App;

