import React, { useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { Compass, BookOpen, Calendar, MapPin, Database, AlertCircle, WifiOff } from 'lucide-react';
import type { ConventionSession } from '../types/database';

export const SessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user, 
    activeSession, 
    sessions, 
    login, 
    signUp, 
    selectSession, 
    createSession, 
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

  // Create session state
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newId, setNewId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');

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

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newLocation || !newDate) {
      setError('All fields are required to initialize a convention context.');
      return;
    }
    try {
      const sess: ConventionSession = {
        year: Number(newYear),
        identifier: newId.toUpperCase(),
        location: newLocation,
        date: newDate
      };
      await createSession(sess);
      setShowCreate(false);
      setError('');
    } catch (err) {
      setError('Could not create convention session.');
    }
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

  // 3. Active Convention context selector
  if (!activeSession) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-forest-800 tracking-tight">
              Select active convention context
            </h2>
            <p className="text-sand-600 mt-2">
              Select or initialize the convention session. All evaluations, congregation matching, and volunteer records will be filtered by this context.
            </p>
          </div>

          <div className="bg-sand-50 border border-sand-200 rounded-xl shadow-lg p-6 sm:p-8">
            {error && (
              <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm font-mono">
                {error}
              </div>
            )}

            {!showCreate ? (
              <div>
                <h3 className="text-xs font-semibold text-sand-600 uppercase tracking-widest font-mono mb-4">
                  Existing Conventions
                </h3>
                <div className="space-y-3 mb-6">
                  {sessions.length === 0 ? (
                    <div className="text-center py-6 text-sand-500 border border-dashed border-sand-300 rounded">
                      No conventions created yet. Get started by creating one.
                    </div>
                  ) : (
                    sessions.map((sess) => (
                      <button
                        key={`${sess.year}-${sess.identifier}`}
                        onClick={() => selectSession(sess)}
                        className="w-full text-left p-4 border border-sand-200 rounded-lg hover:border-forest-600 bg-white hover:bg-cream-50 transition-all flex justify-between items-center group shadow-sm hover:shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-forest-50 p-2.5 rounded-lg text-forest-600 group-hover:bg-forest-600 group-hover:text-cream-50 transition-colors">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-mono text-sm font-bold text-sand-800">
                              {sess.year} - {sess.identifier}
                            </div>
                            <div className="text-xs text-sand-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-sand-400" />
                              {sess.location}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-sand-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-sand-400" />
                            {sess.date}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-sand-200">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="btn-primary"
                  >
                    Create New Convention Context
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSession} className="space-y-4">
                <h3 className="text-xs font-semibold text-sand-600 uppercase tracking-widest font-mono mb-4">
                  New Convention Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                      Convention Year
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full atlas-input"
                      value={newYear}
                      onChange={(e) => setNewYear(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                      Identifier / Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CO-01"
                      className="w-full atlas-input"
                      value={newId}
                      onChange={(e) => setNewId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                    Location
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Assembly Hall or Arena Location"
                    className="w-full atlas-input font-sans"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sand-700 uppercase tracking-wider mb-1 font-mono">
                    Convention Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full atlas-input"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-sand-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setError('');
                    }}
                    className="btn-secondary"
                  >
                    Back to Selection
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Initialize Context
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
