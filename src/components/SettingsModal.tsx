import React, { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import { X, Key, Database, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { reloadConfig, supabaseConfigured } = useSession();
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSupabaseUrl(localStorage.getItem('ATLAS_SUPABASE_URL') || '');
      setSupabaseAnonKey(localStorage.getItem('ATLAS_SUPABASE_ANON_KEY') || '');
      setGeminiKey(localStorage.getItem('ATLAS_GEMINI_KEY') || '');
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
      localStorage.setItem('ATLAS_SUPABASE_URL', supabaseUrl.trim());
      localStorage.setItem('ATLAS_SUPABASE_ANON_KEY', supabaseAnonKey.trim());
    } else {
      localStorage.removeItem('ATLAS_SUPABASE_URL');
      localStorage.removeItem('ATLAS_SUPABASE_ANON_KEY');
    }

    if (geminiKey.trim()) {
      localStorage.setItem('ATLAS_GEMINI_KEY', geminiKey.trim());
    } else {
      localStorage.removeItem('ATLAS_GEMINI_KEY');
    }

    reloadConfig();
    setSavedStatus(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#1B4332', '#386B47', '#DEC9A3']
    });

    setTimeout(() => {
      setSavedStatus(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    localStorage.removeItem('ATLAS_SUPABASE_URL');
    localStorage.removeItem('ATLAS_SUPABASE_ANON_KEY');
    localStorage.removeItem('ATLAS_GEMINI_KEY');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setGeminiKey('');
    reloadConfig();
    
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
      <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-cream-100 border border-sand-300 rounded-xl shadow-2xl p-6 overflow-hidden">
        
        <div className="flex justify-between items-center pb-4 border-b border-sand-200">
          <h3 className="text-lg font-bold text-forest-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-forest-600" />
            CPT Core Configuration
          </h3>
          <button onClick={onClose} className="text-sand-500 hover:text-sand-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedStatus ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-forest-600 animate-bounce" />
            <h4 className="mt-4 text-lg font-bold text-forest-800">Configurations Saved</h4>
            <p className="text-sand-600 text-sm mt-1">Reloading system environment variables...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 mt-4">
            
            <div className="bg-sand-50 border border-sand-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-forest-600" />
                <h4 className="text-xs font-bold font-mono text-sand-800 uppercase tracking-wide">
                  Supabase Integration
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-sand-600 uppercase tracking-widest font-mono mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyz.supabase.co"
                    className="w-full atlas-input font-mono"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-sand-600 uppercase tracking-widest font-mono mb-1">
                    Supabase Anon Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    className="w-full atlas-input font-mono"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-mono text-sand-600">
                <span>Active Backend:</span>
                <span className={`font-bold ${supabaseConfigured ? 'text-forest-600' : 'text-amber-600'}`}>
                  {supabaseConfigured ? 'Supabase Database' : 'Mock Local Sandbox'}
                </span>
              </div>
            </div>

            <div className="bg-sand-50 border border-sand-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-forest-600" />
                <h4 className="text-xs font-bold font-mono text-sand-800 uppercase tracking-wide">
                  Gemini API Gateway
                </h4>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-sand-600 uppercase tracking-widest font-mono mb-1">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    className="w-full atlas-input pl-9 font-mono"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                  <Key className="w-4 h-4 text-sand-400 absolute left-3 top-3" />
                </div>
                <p className="text-[10px] text-sand-500 mt-1.5 leading-relaxed">
                  Required to parse letters, recommendation PDFs, and Excel rosters in real-time. If not provided, a realistic mock extractor runs locally to demonstrate functionality.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-sand-200">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-700 hover:text-red-900 font-mono font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Clear Local Config
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
