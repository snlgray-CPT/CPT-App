import { useState } from 'react';
import { SessionProvider } from './contexts/SessionContext';
import { SessionGate } from './components/SessionGate';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { StagingGrid } from './components/StagingGrid';
import { Dashboard } from './components/Dashboard';
import type { ExtractedVolunteer } from './services/gemini';
import { FileSpreadsheet } from 'lucide-react';

function AppContent() {
  const [stagedVolunteers, setStagedVolunteers] = useState<ExtractedVolunteer[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  const handleVolunteersExtracted = (vols: ExtractedVolunteer[]) => {
    setStagedVolunteers(vols);
    setShowUploadPanel(false);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleClearStaging = () => {
    setStagedVolunteers([]);
  };

  const handleConfirmStaging = () => {
    setStagedVolunteers([]);
    handleRefresh();
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Banner with Title and Add options */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-sand-50 border border-sand-200 p-5 rounded-lg shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-forest-800 font-mono tracking-tight uppercase">
              Volunteer Registry & Evaluations
            </h2>
            <p className="text-xs text-sand-600 font-sans mt-0.5">
              Review rosters, assign convention departments, and enter volunteer ratings.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadPanel(!showUploadPanel)}
              className="btn-secondary"
            >
              <FileSpreadsheet className="w-4 h-4 text-forest-600" />
              {showUploadPanel ? 'Close Import Tool' : 'Bulk Ingest / Upload'}
            </button>
          </div>
        </div>

        {/* Gemini Upload and Processing section */}
        {showUploadPanel && (
          <UploadSection 
            onVolunteersExtracted={handleVolunteersExtracted}
            onRefreshData={handleRefresh}
          />
        )}

        {/* Review & Confirm staging grid */}
        {stagedVolunteers.length > 0 && (
          <StagingGrid 
            extractedData={stagedVolunteers}
            onClear={handleClearStaging}
            onConfirm={handleConfirmStaging}
          />
        )}

        {/* Dashboard Grid & List */}
        <Dashboard key={refreshKey} />

      </main>

      <footer className="bg-sand-50 border-t border-sand-200 py-6 font-mono text-[10px] text-sand-500 text-center">
        <div>CPT CO-ORDINATION ENGINE — SECURE REGIONAL DATA SYSTEM</div>
        <div className="mt-1 opacity-75">All data transfers encrypted. Service worker caching active.</div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <SessionProvider>
      <SessionGate>
        <AppContent />
      </SessionGate>
    </SessionProvider>
  );
}

export default App;
