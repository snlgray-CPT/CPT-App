import React, { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import type { ExtractedVolunteer } from '../services/gemini';
import type { Congregation, Volunteer, Evaluation } from '../types/database';
import { db } from '../services/db';
import { AlertTriangle, Check, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StagingGridProps {
  extractedData: ExtractedVolunteer[];
  onClear: () => void;
  onConfirm: () => void;
}

export const StagingGrid: React.FC<StagingGridProps> = ({ extractedData, onClear, onConfirm }) => {
  const { activeSession } = useSession();
  const [gridData, setGridData] = useState<ExtractedVolunteer[]>([]);
  const [matchedCongs, setMatchedCongs] = useState<Congregation[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ExtractedVolunteer | null>(null);

  useEffect(() => {
    setGridData(extractedData);
    if (activeSession) {
      db.getCongregations(`${activeSession.year}-${activeSession.identifier}`).then((list) => {
        setMatchedCongs(list);
      });
    }
  }, [extractedData, activeSession]);

  const handleDeleteRow = (index: number) => {
    setGridData(gridData.filter((_, idx) => idx !== index));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...gridData[index] });
  };

  const handleSaveEdit = (index: number) => {
    if (!editForm) return;
    const updated = [...gridData];
    updated[index] = editForm;
    setGridData(updated);
    setEditingIndex(null);
    setEditForm(null);
  };

  const getCongregationMatch = (congName: string, congNumber: string) => {
    if (congNumber) {
      const match = matchedCongs.find(c => c.number === congNumber);
      if (match) return match;
    }
    return matchedCongs.find(c => c.name.toLowerCase().includes(congName.toLowerCase()) || congName.toLowerCase().includes(c.name.toLowerCase()));
  };

  const handleSaveToDatabase = async () => {
    if (!activeSession) return;
    
    try {
      const sessionKey = `${activeSession.year}-${activeSession.identifier}`;
      const uniqueCongMap = new Map<string, string>();
      
      // Load current matching congregations
      let currentCongs = await db.getCongregations(sessionKey);
      currentCongs.forEach(c => uniqueCongMap.set(c.number || c.name.toLowerCase(), c.id));

      // 1. Identify missing congregations and create them on the fly
      const newCongregationsToCreate: Omit<Congregation, 'id'>[] = [];
      
      gridData.forEach(item => {
        const match = getCongregationMatch(item.congregationName, item.congregationNumber);
        if (!match) {
          const key = item.congregationNumber || item.congregationName.toLowerCase();
          if (!uniqueCongMap.has(key)) {
            newCongregationsToCreate.push({
              name: item.congregationName || 'Extracted Cong',
              number: item.congregationNumber || Math.floor(10000 + Math.random() * 90000).toString(),
              assigned_convention_id: sessionKey
            });
            uniqueCongMap.set(key, 'pending');
          }
        }
      });

      if (newCongregationsToCreate.length > 0) {
        await db.upsertCongregations(newCongregationsToCreate);
        currentCongs = await db.getCongregations(sessionKey);
      }

      // 2. Map volunteers & insert them
      const volunteersToInsert: Omit<Volunteer, 'id'>[] = [];
      const evaluationsToInsert: (Omit<Evaluation, 'id'> & { volunteerEmail: string })[] = [];

      gridData.forEach(item => {
        const match = getCongregationMatch(item.congregationName, item.congregationNumber) || 
                      currentCongs.find(c => c.number === item.congregationNumber || c.name.toLowerCase() === item.congregationName.toLowerCase());
        
        if (match) {
          volunteersToInsert.push({
            name: item.name,
            age: item.age || 0,
            jwpub_email: item.email || `${item.name.toLowerCase().replace(/\s+/g, '.')}@jwpub.org`,
            home_congregation_id: match.id,
            is_committee_assistant: false
          });

          evaluationsToInsert.push({
            volunteerEmail: item.email || `${item.name.toLowerCase().replace(/\s+/g, '.')}@jwpub.org`,
            volunteer_id: '',
            user_id: 'system.importer@jwpub.org',
            rating: item.rating || 'A', // Extracted rating from Spanish file
            year: activeSession.year,
            convention_identifier: activeSession.identifier,
            location: activeSession.location,
            department: item.department || 'Attendants', // Extracted department
            assignment: item.assignment || 'Assistant',  // Extracted assignment
            comments: item.comments || 'Imported via CPT file parser'
          });
        }
      });

      // Commit volunteers
      await db.upsertVolunteers(volunteersToInsert);

      // Fetch newly added volunteers to bind evaluations correctly
      const refreshedVols = await db.getVolunteers(sessionKey);
      
      const evalsCommits: Omit<Evaluation, 'id'>[] = [];
      evaluationsToInsert.forEach(evalRecord => {
        const vMatch = refreshedVols.find(v => v.jwpub_email.toLowerCase() === evalRecord.volunteerEmail.toLowerCase());
        if (vMatch) {
          evalsCommits.push({
            volunteer_id: vMatch.id,
            user_id: evalRecord.user_id,
            rating: evalRecord.rating,
            year: evalRecord.year,
            convention_identifier: evalRecord.convention_identifier,
            location: evalRecord.location,
            department: evalRecord.department,
            assignment: evalRecord.assignment,
            comments: evalRecord.comments
          });
        }
      });

      for (const ev of evalsCommits) {
        await db.saveEvaluation(ev);
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      onConfirm();
    } catch (err) {
      console.error(err);
      alert('Could not save database transaction');
    }
  };

  if (gridData.length === 0) return null;

  return (
    <div className="bg-sand-50 border border-sand-200 rounded-lg p-5 font-sans shadow-sm mb-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4 border-b border-sand-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-forest-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-forest-600" />
            Review & Confirm Translated Volunteers
          </h3>
          <p className="text-xs text-sand-600 mt-0.5">
            Volunteers and comments translated from Spanish to English. Verify active departments, ratings, and assignments before committing.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClear} className="btn-secondary text-xs">
            Cancel
          </button>
          <button onClick={handleSaveToDatabase} className="btn-primary text-xs">
            <Check className="w-4 h-4" /> Save to Supabase
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-sand-200 rounded">
        <table className="min-w-full divide-y divide-sand-200 font-mono text-xs">
          <thead className="bg-sand-100">
            <tr>
              <th className="px-3 py-3 text-left font-bold text-sand-700">Name</th>
              <th className="px-3 py-3 text-left font-bold text-sand-700">Age</th>
              <th className="px-3 py-3 text-left font-bold text-sand-700">Email</th>
              <th className="px-3 py-3 text-left font-bold text-sand-700">Congregation</th>
              <th className="px-3 py-3 text-left font-bold text-sand-700">Department / Assignment</th>
              <th className="px-3 py-3 text-center font-bold text-sand-700">Rating</th>
              <th className="px-3 py-3 text-left font-bold text-sand-700">Comments (Translated)</th>
              <th className="px-3 py-3 text-center font-bold text-sand-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-sand-200">
            {gridData.map((item, index) => {
              const matchedCong = getCongregationMatch(item.congregationName, item.congregationNumber);
              const isEditing = editingIndex === index;

              return (
                <tr key={index} className="hover:bg-cream-50 transition-colors">
                  <td className="px-3 py-3 font-sans font-semibold text-sand-900">
                    {isEditing ? (
                      <input
                        type="text"
                        className="atlas-input w-full font-sans text-xs"
                        value={editForm?.name || ''}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    ) : item.name}
                  </td>
                  <td className="px-3 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        className="atlas-input w-16 text-xs"
                        value={editForm?.age || 0}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, age: Number(e.target.value) } : null)}
                      />
                    ) : (item.age || '—')}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px]">
                    {isEditing ? (
                      <input
                        type="email"
                        className="atlas-input w-full text-xs"
                        value={editForm?.email || ''}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)}
                      />
                    ) : item.email}
                  </td>
                  <td className="px-3 py-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <select
                          className="atlas-input w-full text-[11px] py-1 px-1.5 font-sans mb-1 border border-sand-300 rounded"
                          value={
                            matchedCongs.some(c => c.name.toLowerCase() === (editForm?.congregationName || '').toLowerCase() || c.number === editForm?.congregationNumber)
                              ? matchedCongs.find(c => c.name.toLowerCase() === (editForm?.congregationName || '').toLowerCase() || c.number === editForm?.congregationNumber)?.id
                              : 'custom'
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setEditForm(prev => prev ? { ...prev, congregationName: '', congregationNumber: '' } : null);
                            } else {
                              const found = matchedCongs.find(c => c.id === val);
                              if (found) {
                                setEditForm(prev => prev ? { ...prev, congregationName: found.name, congregationNumber: found.number } : null);
                              }
                            }
                          }}
                        >
                          <option value="custom">-- Custom / New Cong --</option>
                          {matchedCongs.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.number})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Name"
                          className="atlas-input w-full text-xs"
                          value={editForm?.congregationName || ''}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, congregationName: e.target.value } : null)}
                        />
                        <input
                          type="text"
                          placeholder="No."
                          className="atlas-input w-full text-[10px]"
                          value={editForm?.congregationNumber || ''}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, congregationNumber: e.target.value } : null)}
                        />
                      </div>
                    ) : (
                      <div className="font-sans">
                        <div className="font-semibold text-sand-800">{item.congregationName}</div>
                        <div className="text-[9px] text-sand-500 font-mono">#{item.congregationNumber || 'N/A'}</div>
                        {!matchedCong && (
                          <span className="bg-amber-100 text-amber-800 px-1 py-0.2 rounded text-[8px] font-mono flex items-center gap-0.5 w-max mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> New
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder="Department"
                          className="atlas-input w-full text-xs"
                          value={editForm?.department || ''}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, department: e.target.value } : null)}
                        />
                        <input
                          type="text"
                          placeholder="Assignment"
                          className="atlas-input w-full text-xs"
                          value={editForm?.assignment || ''}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, assignment: e.target.value } : null)}
                        />
                      </div>
                    ) : (
                      <div className="font-sans">
                        <div className="font-semibold text-forest-700">{item.department || 'Attendants'}</div>
                        <div className="text-[10px] text-sand-500">{item.assignment || 'Assistant'}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {isEditing ? (
                      <select
                        className="atlas-input w-16 text-xs font-bold"
                        value={editForm?.rating || 'A'}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, rating: e.target.value as any } : null)}
                      >
                        {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-block bg-forest-600 text-cream-50 px-1.5 py-0.5 rounded font-bold">
                        {item.rating || 'A'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-sans text-[11px] text-sand-600 max-w-xs whitespace-normal break-words" title={item.comments}>
                    {isEditing ? (
                      <textarea
                        className="atlas-input w-full text-xs font-sans"
                        rows={2}
                        value={editForm?.comments || ''}
                        onChange={(e) => setEditForm(prev => prev ? { ...prev, comments: e.target.value } : null)}
                      />
                    ) : (item.comments || '—')}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="px-1.5 py-0.5 rounded text-forest-700 bg-forest-50 hover:bg-forest-100 font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingIndex(null); setEditForm(null); }}
                          className="px-1.5 py-0.5 rounded text-sand-700 bg-sand-100 hover:bg-sand-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="p-1 rounded text-sand-600 hover:text-forest-700 hover:bg-cream-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(index)}
                          className="p-1 rounded text-red-600 hover:text-red-950 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
