import React, { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import type { Volunteer, Evaluation } from '../types/database';
import { RATING_SORT_ORDER } from '../types/database';
import { db } from '../services/db';
import { Search, ChevronDown, ChevronUp, Plus, Edit2, Trash2, Shield, Filter } from 'lucide-react';
import { EvaluationForm } from './EvaluationForm';

export const Dashboard: React.FC = () => {
  const { activeSession } = useSession();
  
  // Data State
  const [volunteers, setVolunteers] = useState<(Volunteer & { congregation?: any; evaluations?: Evaluation[] })[]>([]);
  const [congregations, setCongregations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<string>('all');
  const [selectedCongregationFilter, setSelectedCongregationFilter] = useState<string>('all');
  const [assistantFilter, setAssistantFilter] = useState(false);
  const [expandedVolunteers, setExpandedVolunteers] = useState<Record<string, boolean>>({});

  // Sort State
  const [sortField, setSortField] = useState<'name' | 'age' | 'rating'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal States
  const [selectedVolunteer, setSelectedVolunteer] = useState<(Volunteer & { evaluations?: Evaluation[] }) | null>(null);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Quick Stats
  const [stats, setStats] = useState({ totalVolunteers: 0, totalEvaluations: 0, assistantsCount: 0 });

  const loadData = async () => {
    if (!activeSession) return;
    try {
      setLoading(true);
      const sessionKey = `${activeSession.year}-${activeSession.identifier}`;
      
      // Fetch volunteers and congregations in parallel
      const [volsList, congsList] = await Promise.all([
        db.getVolunteers(sessionKey),
        db.getCongregations(sessionKey)
      ]);
      
      setVolunteers(volsList);
      setCongregations(congsList);

      // Compute quick stats
      const totalVols = volsList.length;
      let totalEvals = 0;
      let assistants = 0;
      volsList.forEach(v => {
        totalEvals += (v.evaluations?.length || 0);
        if (v.is_committee_assistant) assistants++;
      });
      setStats({ totalVolunteers: totalVols, totalEvaluations: totalEvals, assistantsCount: assistants });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSession]);

  const toggleExpand = (id: string) => {
    setExpandedVolunteers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to fetch the primary (highest sorting) evaluation
  const getPrimaryEvaluation = (evals: Evaluation[] = []): Evaluation | undefined => {
    if (evals.length === 0) return undefined;
    // Sort evaluations so the highest rating (smallest number in sorting map) is first
    return [...evals].sort((a, b) => {
      const orderA = RATING_SORT_ORDER[a.rating] ?? 99;
      const orderB = RATING_SORT_ORDER[b.rating] ?? 99;
      return orderA - orderB;
    })[0];
  };

  // Sort and Filter logic
  const filteredVolunteers = volunteers.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (v.congregation?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.jwpub_email.toLowerCase().includes(searchQuery.toLowerCase());

    const primaryEval = getPrimaryEvaluation(v.evaluations);
    const matchesRating = selectedRatingFilter === 'all' || 
      (primaryEval && primaryEval.rating === selectedRatingFilter);

    const matchesCongregation = selectedCongregationFilter === 'all' ||
      v.home_congregation_id === selectedCongregationFilter;

    const matchesAssistant = !assistantFilter || v.is_committee_assistant;

    return matchesSearch && matchesRating && matchesCongregation && matchesAssistant;
  });

  const sortedVolunteers = [...filteredVolunteers].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'name') {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
    } else if (sortField === 'age') {
      valA = a.age;
      valB = b.age;
    } else if (sortField === 'rating') {
      const evalA = getPrimaryEvaluation(a.evaluations);
      const evalB = getPrimaryEvaluation(b.evaluations);
      valA = evalA ? RATING_SORT_ORDER[evalA.rating] : 99;
      valB = evalB ? RATING_SORT_ORDER[evalB.rating] : 99;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'name' | 'age' | 'rating') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleEditEvaluation = (vol: Volunteer & { evaluations?: Evaluation[] }, ev: Evaluation) => {
    setSelectedVolunteer(vol);
    setEditingEvaluation(ev);
    setIsFormOpen(true);
  };

  const handleCreateEvaluation = (vol: Volunteer & { evaluations?: Evaluation[] }) => {
    setSelectedVolunteer(vol);
    setEditingEvaluation(null);
    setIsFormOpen(true);
  };

  const handleDeleteEvaluation = async (evId: string) => {
    if (confirm('Are you sure you want to delete this evaluation permanently?')) {
      await db.deleteEvaluation(evId);
      loadData();
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Search and Filters panel */}
      <div className="bg-sand-50 border border-sand-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <form onSubmit={(e) => e.preventDefault()} className="flex w-full md:w-auto gap-2 items-center">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search volunteers by name or congregation..."
              className="w-full atlas-input pl-10 py-2.5 font-sans"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-4 h-4 text-sand-400 absolute left-3 top-3.5" />
          </div>
          <button
            type="submit"
            className="bg-forest-600 hover:bg-forest-700 text-cream-50 px-4 py-2.5 rounded text-sm font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-sand-500" />
            <span className="text-xs font-mono font-bold text-sand-600 uppercase">Congregation:</span>
            <select
              className="atlas-input py-1 text-xs max-w-[160px]"
              value={selectedCongregationFilter}
              onChange={(e) => setSelectedCongregationFilter(e.target.value)}
            >
              <option value="all">All Congregations</option>
              {congregations.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.number})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-sand-500" />
            <span className="text-xs font-mono font-bold text-sand-600 uppercase">Rating:</span>
            <select
              className="atlas-input py-1 text-xs"
              value={selectedRatingFilter}
              onChange={(e) => setSelectedRatingFilter(e.target.value)}
            >
              <option value="all">All Ratings</option>
              {Object.keys(RATING_SORT_ORDER).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-sand-300 rounded hover:bg-cream-50 select-none">
            <input
              type="checkbox"
              className="focus:ring-forest-500 h-3.5 w-3.5 text-forest-600 border-sand-300 rounded cursor-pointer"
              checked={assistantFilter}
              onChange={(e) => setAssistantFilter(e.target.checked)}
            />
            <span className="text-xs font-semibold text-sand-700">Committee Assistants</span>
          </label>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-sand-50 border border-sand-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] font-bold font-mono text-sand-500 uppercase tracking-widest">Roster Volunteers</div>
          <div className="text-2xl font-bold font-mono text-forest-800 mt-1">{stats.totalVolunteers}</div>
        </div>
        <div className="bg-sand-50 border border-sand-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] font-bold font-mono text-sand-500 uppercase tracking-widest">Registered Evals</div>
          <div className="text-2xl font-bold font-mono text-forest-800 mt-1">{stats.totalEvaluations}</div>
        </div>
        <div className="bg-sand-50 border border-sand-200 rounded-lg p-3.5 shadow-sm">
          <div className="text-[10px] font-bold font-mono text-sand-500 uppercase tracking-widest">Committee Assistants</div>
          <div className="text-2xl font-bold font-mono text-forest-800 mt-1">{stats.assistantsCount}</div>
        </div>
      </div>

      {/* Volunteers Table */}
      <div className="bg-white border border-sand-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sand-500 font-mono">
              Loading convention volunteer records...
            </div>
          ) : sortedVolunteers.length === 0 ? (
            <div className="p-12 text-center text-sand-500 font-mono">
              No volunteers match the current search filters.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-sand-200">
              <thead className="bg-sand-50 font-mono text-xs text-sand-700 uppercase">
                <tr>
                  <th className="w-10"></th>
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-3.5 text-left font-bold tracking-wider cursor-pointer hover:bg-sand-100 transition-colors"
                  >
                    Name {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th 
                    onClick={() => handleSort('age')}
                    className="px-6 py-3.5 text-center font-bold tracking-wider cursor-pointer hover:bg-sand-100 transition-colors"
                  >
                    Age {sortField === 'age' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-3.5 text-left font-bold tracking-wider">Congregation</th>
                  <th 
                    onClick={() => handleSort('rating')}
                    className="px-6 py-3.5 text-center font-bold tracking-wider cursor-pointer hover:bg-sand-100 transition-colors"
                  >
                    Best Rating {sortField === 'rating' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-3.5 text-left font-bold tracking-wider">Active Dept & Post</th>
                  <th className="px-6 py-3.5 text-center font-bold tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200 font-sans text-sm text-sand-800">
                {sortedVolunteers.map((vol) => {
                  const primaryEval = getPrimaryEvaluation(vol.evaluations);
                  const isExpanded = !!expandedVolunteers[vol.id];
                  
                  return (
                    <React.Fragment key={vol.id}>
                      <tr className="hover:bg-cream-50 transition-colors group">
                        <td className="pl-4 py-4 text-center">
                          <button onClick={() => toggleExpand(vol.id)} className="text-sand-400 hover:text-forest-700">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 font-semibold text-forest-800 flex items-center gap-2">
                          {vol.name}
                          {vol.is_committee_assistant && (
                            <span title="Committee Assistant" className="bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5 border border-forest-200">
                              <Shield className="w-3 h-3" /> Assistant
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center table-data">{vol.age}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-sand-700">{vol.congregation?.name || 'Unlinked'}</div>
                          <div className="text-[10px] text-sand-500 font-mono">#{vol.congregation?.number || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {primaryEval ? (
                            <span className="inline-flex items-center justify-center font-mono font-bold text-xs bg-forest-600 text-cream-50 px-2 py-0.5 rounded-full">
                              {primaryEval.rating}
                            </span>
                          ) : (
                            <span className="text-sand-400 font-mono text-xs">Unrated</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {primaryEval ? (
                            <div>
                              <div className="font-medium text-sand-800">{primaryEval.department}</div>
                              <div className="text-xs text-sand-500">{primaryEval.assignment}</div>
                            </div>
                          ) : (
                            <span className="text-sand-400 italic text-xs">No active assignment</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleCreateEvaluation(vol)}
                            className="bg-forest-600 hover:bg-forest-700 text-cream-50 px-2.5 py-1.5 rounded text-xs font-semibold inline-flex items-center gap-1 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Rate
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Historical Evaluations */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-sand-50 border-t border-b border-sand-200 px-8 py-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold font-mono text-sand-600 uppercase tracking-widest">
                                  Evaluation Logs for {vol.name}
                                </h4>
                                <span className="text-[10px] font-mono text-sand-500">{vol.jwpub_email}</span>
                              </div>

                              {(!vol.evaluations || vol.evaluations.length === 0) ? (
                                <p className="text-xs text-sand-500 italic py-2">
                                  No historical evaluations recorded for this volunteer.
                                </p>
                              ) : (
                                <div className="space-y-2.5">
                                  {vol.evaluations.map((ev) => (
                                    <div key={ev.id} className="bg-white border border-sand-200 rounded p-3 flex justify-between items-start gap-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-xs bg-sand-200 px-1.5 py-0.5 rounded text-sand-800">
                                            {ev.rating}
                                          </span>
                                          <span className="font-bold text-xs text-forest-800 font-mono">
                                            {ev.year} - {ev.convention_identifier}
                                          </span>
                                          <span className="text-xs text-sand-400">•</span>
                                          <span className="text-xs text-sand-600 font-semibold">{ev.department} ({ev.assignment})</span>
                                        </div>
                                        <p className="text-xs text-sand-600 leading-relaxed font-sans">{ev.comments}</p>
                                        <div className="text-[10px] text-sand-400 font-mono">Evaluated by: {ev.user_id}</div>
                                      </div>
                                      
                                      <div className="flex gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => handleEditEvaluation(vol, ev)}
                                          className="p-1 text-sand-500 hover:text-forest-700 transition-colors"
                                          title="Edit evaluation"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteEvaluation(ev.id)}
                                          className="p-1 text-sand-500 hover:text-red-700 transition-colors"
                                          title="Delete evaluation"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      {isFormOpen && selectedVolunteer && (
        <EvaluationForm
          volunteer={selectedVolunteer}
          editingEvaluation={editingEvaluation}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedVolunteer(null);
            setEditingEvaluation(null);
          }}
          onSaved={() => {
            setIsFormOpen(false);
            setSelectedVolunteer(null);
            setEditingEvaluation(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
