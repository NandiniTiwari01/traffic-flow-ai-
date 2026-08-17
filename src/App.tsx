import React, { useState } from 'react';
import { TrafficProvider, useTraffic } from './context/TrafficContext';
import { Sidebar, PageTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { LiveTrafficMap } from './pages/LiveTrafficMap';
import { AIPrediction } from './pages/AIPrediction';
import { Simulation } from './pages/Simulation';
import { Analytics } from './pages/Analytics';
import { VideoDetection } from './pages/VideoDetection';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>('dashboard');
  const { 
    alerts, 
    recommendations, 
    simulationControls, 
    toggleSimulation, 
    resetSimulation, 
    acceptAllRecommendations,
    junctions,
    setSelectedJunction,
  } = useTraffic();

  const pendingRecommendations = recommendations.filter(r => r.status === 'PENDING');
  const activeAlertsCount = alerts.filter(a => !a.dismissed).length;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeAlertsCount={activeAlertsCount}
        pendingRecommendationsCount={pendingRecommendations.length}
        isSimulating={simulationControls.isRunning}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          isRunning={simulationControls.isRunning}
          onToggleSimulation={toggleSimulation}
          onResetSimulation={resetSimulation}
          onAcceptAllRecommendations={acceptAllRecommendations}
          pendingCount={pendingRecommendations.length}
          activeAlertsCount={activeAlertsCount}
          onOpenAlerts={() => setActiveTab('dashboard')}
          junctions={junctions}
          onSelectJunction={(j) => {
            setSelectedJunction(j);
            setActiveTab('map');
          }}
          weather={simulationControls.weather}
        />

        {/* Dynamic Page Views Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard
                onNavigateToMap={() => setActiveTab('map')}
                onNavigateToSimulation={() => setActiveTab('simulation')}
                onNavigateToPredictions={() => setActiveTab('predictions')}
              />
            )}

            {activeTab === 'map' && <LiveTrafficMap />}

            {activeTab === 'predictions' && <AIPrediction />}

            {activeTab === 'simulation' && <Simulation />}

            {activeTab === 'video' && <VideoDetection />}

            {activeTab === 'analytics' && <Analytics />}
          </div>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <TrafficProvider>
      <AppContent />
    </TrafficProvider>
  );
}

export default App;
