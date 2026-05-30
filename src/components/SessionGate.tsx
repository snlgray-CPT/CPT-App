import React, { useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { Compass, Database, AlertCircle, WifiOff } from 'lucide-react';

export const SessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user, 
    login, 
    signUp, 
    supabaseConfigured, 
    isConnected,
    reloadConfig
  } = useSession();

  // Screen/Tab States
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [error, setError] = useState('');

  // Credentials config inputs for the Connection Block screen
  const [cfgUrl, setCfgUrl] = useState('');
  const [cfgKey, setCfgKey] = useState('');
  const [cfgGemini, setCfgGemini] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Email and Password are required.');
      return;
    }

    if (authTab === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setIsAuthLoading(true);
    try {
      if (authTab === 'login') {
        await login(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgUrl.trim() || !cfgKey.trim()) {
      setError('Supabase URL and Anon Key are required to build a connection.');
      return;
    }
    
    localStorage.setItem('ATLAS_SUPABASE_URL', cfgUrl.trim());
    localStorage.setItem('ATLAS_SUPABASE_ANON_KEY', cfgKey.trim());
    if (cfgGemini.trim()) {
      localStorage.setItem('ATLAS_GEMINI_KEY', cfgGemini.trim());
    }

    setError('');
    setIsConfiguring(true);
    setTimeout(() => {
      reloadConfig();
      setIsConfiguring(false);
    }, 1000);
  };



  // 1. Connection Error Shield Block (Triggered if not configured or offline)
  if (!supabaseConfigured || !isConnected) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto h-16 w-16 bg-red-800 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
            <WifiOff className="h-8 w-8 text-cream-100" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-forest-800 tracking-tight">
            Supabase Connection Required
          </h2>
          <p className="mt-2 text-center text-sm text-sand-600">
            CPT requires a live connection to a Supabase backend to handle accounts and volunteer data.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-sand-50 py-8 px-4 border border-sand-200 shadow-xl rounded-xl sm:px-10">
            <form className="space-y-4" onSubmit={handleSaveConfig}>
              
              <div className="flex items-start gap-3 bg-cream-200 border border-sand-300 p-3 rounded text-xs text-sand-800 font-mono leading-relaxed">
                <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  No environment variables found. Paste your project credentials below. They will be saved in your local browser storage.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://your-project.supabase.co"
                  className="w-full atlas-input font-mono"
                  value={cfgUrl}
                  onChange={(e) => setCfgUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOi..."
                  className="w-full atlas-input font-mono"
                  value={cfgKey}
                  onChange={(e) => setCfgKey(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                  Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  className="w-full atlas-input font-mono"
                  value={cfgGemini}
                  onChange={(e) => setCfgGemini(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-xs font-mono">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isConfiguring}
                className="w-full btn-primary py-3 justify-center text-base"
              >
                {isConfiguring ? 'Testing Credentials...' : 'Save Configuration & Connect'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authentication Login/Signup screens
  if (!user) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto h-16 w-16 bg-forest-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
            <Compass className="h-9 w-9 text-cream-100" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-forest-800 tracking-tight">
            CPT SYSTEM
          </h2>
          <p className="mt-2 text-center text-sm text-sand-600">
            Regional Convention Volunteer Evaluation & Management
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-sand-50 border border-sand-200 shadow-lg rounded-xl overflow-hidden">
            
            {/* Tabs */}
            <div className="flex border-b border-sand-200">
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setError(''); }}
                className={`w-1/2 py-3.5 text-center text-sm font-semibold transition-all ${
                  authTab === 'login' 
                    ? 'bg-cream-100 text-forest-800 border-b-2 border-forest-600' 
                    : 'text-sand-500 hover:text-sand-800 bg-sand-100'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('signup'); setError(''); }}
                className={`w-1/2 py-3.5 text-center text-sm font-semibold transition-all ${
                  authTab === 'signup' 
                    ? 'bg-cream-100 text-forest-800 border-b-2 border-forest-600' 
                    : 'text-sand-500 hover:text-sand-800 bg-sand-100'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-5 p-6 sm:p-8" onSubmit={handleAuthSubmit}>
              <div>
                <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                  JWPub Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@jwpub.org"
                  className="w-full atlas-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full atlas-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {authTab === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full atlas-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-xs font-mono">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full btn-primary py-3 justify-center text-base"
              >
                {isAuthLoading 
                  ? 'Authenticating...' 
                  : (authTab === 'login' ? 'Access CPT' : 'Create CPT Account')}
              </button>
            </form>

            <div className="px-6 pb-6 pt-2 text-center border-t border-sand-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono bg-forest-50 text-forest-800">
                <Database className="w-3 h-3 text-forest-600" />
                Supabase Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
