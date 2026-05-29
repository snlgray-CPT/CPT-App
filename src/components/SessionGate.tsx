import React, { useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { Compass, BookOpen, Calendar, MapPin, Database, Server } from 'lucide-react';
import type { ConventionSession } from '../types/database';

export const SessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeSession, sessions, login, selectSession, createSession, supabaseConfigured } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Simulated auth
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [error, setError] = useState('');

  // Create session state
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newId, setNewId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setError('');
    setIsLoginLoading(true);
    try {
      await login(email);
    } catch (err) {
      setError('Failed to log in');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newLocation || !newDate) {
      setError('All fields are required to create a convention context.');
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
          <div className="bg-sand-50 py-8 px-4 border border-sand-200 shadow-lg rounded-xl sm:px-10">
            <form className="space-y-6" onSubmit={handleLogin}>
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

              {error && (
                <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm font-mono">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoginLoading}
                className="w-full btn-primary py-3 justify-center text-base"
              >
                {isLoginLoading ? 'Signing In...' : 'Access CPT'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 border-t border-sand-200 pt-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono bg-sand-200 text-sand-800">
                {supabaseConfigured ? <Database className="w-3 h-3 text-forest-600" /> : <Server className="w-3 h-3 text-amber-600" />}
                {supabaseConfigured ? 'Supabase Backend Connected' : 'Local Demo Sandboxed'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                    className="w-full atlas-input"
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
