import React, { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import { db } from '../services/db';
import type { ConventionSession } from '../types/database';
import { GlobalSearch } from './GlobalSearch';
import { ConventionDetail } from './ConventionDetail';
import { ConventionForm } from './ConventionForm';
import { Plus, BookOpen, Calendar, MapPin, Search, Star, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { sessions, refreshSessions } = useSession();
  
  // Navigation & View states
  const [selectedConvention, setSelectedConvention] = useState<ConventionSession | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Stats
  const [globalStats, setGlobalStats] = useState({ conventionsCount: 0, volunteersCount: 0, evaluationsCount: 0 });

  const loadStats = async () => {
    try {
      const [vols, evals] = await Promise.all([
        db.getAllVolunteers(),
        db.getAllEvaluations()
      ]);
      setGlobalStats({
        conventionsCount: sessions.length,
        volunteersCount: vols.length,
        evaluationsCount: evals.length
      });
    } catch (err) {
      console.error('Error loading global statistics:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, [sessions]);

  const handleConventionSaved = () => {
    setIsCreateModalOpen(false);
    refreshSessions();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
      
      {/* Sidebar - Convention List */}
      <div className="lg:col-span-1 space-y-4">
        
        {/* Quick Stats Panel */}
        <div className="bg-sand-50 border border-sand-200 rounded-lg p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-sand-500 uppercase tracking-widest font-mono border-b border-sand-200 pb-1.5">
            System Overview
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-sand-700">
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-forest-600" /> Conventions:</span>
              <span className="font-mono text-forest-800">{globalStats.conventionsCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold text-sand-700">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-forest-600" /> Volunteers:</span>
              <span className="font-mono text-forest-800">{globalStats.volunteersCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-semibold text-sand-700">
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-forest-600" /> Evaluations:</span>
              <span className="font-mono text-forest-800">{globalStats.evaluationsCount}</span>
            </div>
          </div>
        </div>

        {/* Conventions Navigation */}
        <div className="bg-sand-50 border border-sand-200 rounded-lg p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-sand-200 pb-2">
            <h3 className="text-xs font-bold text-sand-600 uppercase tracking-widest font-mono">
              Conventions
            </h3>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-forest-600 hover:bg-forest-700 text-cream-50 p-1.5 rounded transition-all flex items-center justify-center"
              title="Add Convention Session"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {/* Global Search Button (Reset View) */}
            <button
              onClick={() => setSelectedConvention(null)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-3 text-xs font-bold font-mono uppercase tracking-wider ${
                selectedConvention === null
                  ? 'bg-forest-600 text-cream-50 border-forest-700 shadow-md'
                  : 'bg-white border-sand-200 text-sand-700 hover:bg-cream-50 hover:border-forest-500'
              }`}
            >
              <Search className="w-4 h-4" />
              Global Search View
            </button>

            {/* Individual Sessions */}
            {sessions.map((sess) => {
              const isSelected = selectedConvention?.year === sess.year && selectedConvention?.identifier === sess.identifier;
              return (
                <button
                  key={`${sess.year}-${sess.identifier}`}
                  onClick={() => setSelectedConvention(sess)}
                  className={`w-full text-left p-3 border rounded-lg transition-all flex flex-col gap-1 shadow-sm ${
                    isSelected
                      ? 'bg-forest-50 border-forest-600 ring-1 ring-forest-600'
                      : 'bg-white border-sand-200 hover:border-forest-500 hover:bg-cream-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-forest-800">
                      {sess.year} - {sess.identifier}
                    </span>
                    <span className="text-[10px] text-sand-500 flex items-center gap-0.5 font-mono">
                      <Calendar className="w-3 h-3 text-sand-400" />
                      {sess.date}
                    </span>
                  </div>
                  <div className="text-[10px] text-sand-600 flex items-center gap-1 mt-0.5 font-sans">
                    <MapPin className="w-3 h-3 text-sand-400" />
                    {sess.location}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Main Panel - Global Search or Convention Details */}
      <div className="lg:col-span-3">
        {selectedConvention ? (
          <ConventionDetail 
            session={selectedConvention} 
            onBack={() => setSelectedConvention(null)}
          />
        ) : (
          <GlobalSearch />
        )}
      </div>

      {/* Create Convention Modal */}
      {isCreateModalOpen && (
        <ConventionForm 
          onClose={() => setIsCreateModalOpen(false)}
          onSaved={handleConventionSaved}
        />
      )}

    </div>
  );
};
