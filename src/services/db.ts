import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Congregation, Volunteer, Evaluation, ConventionSession } from '../types/database';

import { HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_ANON_KEY } from '../config';

// ----------------------------------------------------
// DB Provider & State Management
// ----------------------------------------------------

let supabase: SupabaseClient | null = null;

const getSupabaseKeys = () => {
  const url = HARDCODED_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('ATLAS_SUPABASE_URL');
  const key = HARDCODED_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('ATLAS_SUPABASE_ANON_KEY');
  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseKeys();
  return !!(url && key);
};

export const initSupabase = () => {
  try {
    const { url, key } = getSupabaseKeys();
    if (url && url.trim() && key && key.trim()) {
      supabase = createClient(url.trim(), key.trim());
    } else {
      supabase = null;
    }
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    supabase = null;
  }
};

// Initialize on import
initSupabase();

// ----------------------------------------------------
// Mock Data Seeds
// ----------------------------------------------------

const MOCK_CONVENTIONS: ConventionSession[] = [
  { year: 2026, identifier: "CO-01", location: "Assembly Hall - East Valley", date: "2026-06-12" },
  { year: 2026, identifier: "CO-02", location: "Convention Arena - North City", date: "2026-07-03" },
  { year: 2025, identifier: "CO-01", location: "Assembly Hall - East Valley", date: "2025-06-14" }
];

const MOCK_CONGREGATIONS: Congregation[] = [
  { id: "cong-1", name: "Oak Ridge", number: "10552", assigned_convention_id: "2026-CO-01" },
  { id: "cong-2", name: "Pine Valley", number: "18942", assigned_convention_id: "2026-CO-01" },
  { id: "cong-3", name: "River Bend", number: "21390", assigned_convention_id: "2026-CO-02" },
  { id: "cong-4", name: "Maple Heights", number: "11405", assigned_convention_id: "2026-CO-01" },
  { id: "cong-5", name: "Lakeside", number: "30221", assigned_convention_id: "2025-CO-01" }
];

const MOCK_VOLUNTEERS: Volunteer[] = [
  { id: "vol-1", name: "Samuel Vance", age: 24, jwpub_email: "s.vance@jwpub.org", home_congregation_id: "cong-1", is_committee_assistant: true },
  { id: "vol-2", name: "Marcus Miller", age: 31, jwpub_email: "m.miller@jwpub.org", home_congregation_id: "cong-1", is_committee_assistant: false },
  { id: "vol-3", name: "David Ross", age: 45, jwpub_email: "d.ross@jwpub.org", home_congregation_id: "cong-2", is_committee_assistant: false },
  { id: "vol-4", name: "Timothy Carter", age: 28, jwpub_email: "t.carter@jwpub.org", home_congregation_id: "cong-2", is_committee_assistant: true },
  { id: "vol-5", name: "Jonathan Webb", age: 52, jwpub_email: "j.webb@jwpub.org", home_congregation_id: "cong-3", is_committee_assistant: false },
  { id: "vol-6", name: "Philip Rogers", age: 19, jwpub_email: "p.rogers@jwpub.org", home_congregation_id: "cong-4", is_committee_assistant: false },
  { id: "vol-7", name: "Nathan Hughes", age: 60, jwpub_email: "n.hughes@jwpub.org", home_congregation_id: "cong-4", is_committee_assistant: false },
  { id: "vol-8", name: "Andrew Sterling", age: 33, jwpub_email: "a.sterling@jwpub.org", home_congregation_id: "cong-5", is_committee_assistant: false }
];

const MOCK_EVALUATIONS: Evaluation[] = [
  {
    id: "eval-1",
    volunteer_id: "vol-1",
    user_id: "evaluator@jwpub.org",
    rating: "A+",
    year: 2026,
    convention_identifier: "CO-01",
    location: "Assembly Hall - East Valley",
    department: "Attendants",
    assignment: "Main Entry Captain",
    comments: "Excellent leadership skills. Highly punctual, proactive in organizing security protocols, and handled busy crowds with remarkable poise."
  },
  {
    id: "eval-2",
    volunteer_id: "vol-2",
    user_id: "evaluator@jwpub.org",
    rating: "B+",
    year: 2026,
    convention_identifier: "CO-01",
    location: "Assembly Hall - East Valley",
    department: "Cleaning & Maintenance",
    assignment: "Section Leader",
    comments: "Hard worker. Communicates well but needs minor supervision when organizing team rotas."
  },
  {
    id: "eval-3",
    volunteer_id: "vol-3",
    user_id: "evaluator@jwpub.org",
    rating: "A",
    year: 2026,
    convention_identifier: "CO-01",
    location: "Assembly Hall - East Valley",
    department: "Audio / Video",
    assignment: "Sound Mixer Operator",
    comments: "Very detail-oriented and experienced audio engineer. Fixed the microphone feedback loop issues immediately. Recommended for future assistant roles."
  }
];

// Seed Helper
const initializeLocalStorage = () => {
  const seeded = localStorage.getItem('ATLAS_SEEDED');
  if (!seeded) {
    localStorage.setItem('ATLAS_SESSIONS', JSON.stringify(MOCK_CONVENTIONS));
    localStorage.setItem('ATLAS_CONGREGATIONS', JSON.stringify(MOCK_CONGREGATIONS));
    localStorage.setItem('ATLAS_VOLUNTEERS', JSON.stringify(MOCK_VOLUNTEERS));
    localStorage.setItem('ATLAS_EVALUATIONS', JSON.stringify(MOCK_EVALUATIONS));
    localStorage.setItem('ATLAS_SEEDED', 'true');
  }
};

initializeLocalStorage();

// ----------------------------------------------------
// Database Operations (Local & Supabase Delegated)
// ----------------------------------------------------

export const db = {
  // --- Clear all records ---
  async clearAllData(): Promise<void> {
    if (supabase) {
      // In Supabase mode, clearing would require cascading truncates. 
      // We protect remote DBs by only clearing local records here.
    }
    localStorage.setItem('ATLAS_CONGREGATIONS', JSON.stringify([]));
    localStorage.setItem('ATLAS_VOLUNTEERS', JSON.stringify([]));
    localStorage.setItem('ATLAS_EVALUATIONS', JSON.stringify([]));
    // Ensure we keep the seeded flag so it doesn't auto-repopulate on refresh
    localStorage.setItem('ATLAS_SEEDED', 'true');
  },
  // --- Sessions ---
  async getSessions(): Promise<ConventionSession[]> {
    if (supabase) {
      const { data, error } = await supabase.from('convention_sessions').select('*');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('ATLAS_SESSIONS') || '[]');
  },

  async addSession(session: ConventionSession): Promise<void> {
    if (supabase) {
      await supabase.from('convention_sessions').insert(session);
      return;
    }
    const sessions = await this.getSessions();
    if (!sessions.some(s => s.year === session.year && s.identifier === session.identifier)) {
      sessions.push(session);
      localStorage.setItem('ATLAS_SESSIONS', JSON.stringify(sessions));
    }
  },

  // --- Congregations ---
  async getCongregations(assignedConventionId: string): Promise<Congregation[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('congregations')
        .select('*')
        .eq('assigned_convention_id', assignedConventionId);
      if (!error && data) return data;
    }
    const congregations: Congregation[] = JSON.parse(localStorage.getItem('ATLAS_CONGREGATIONS') || '[]');
    return congregations.filter(c => c.assigned_convention_id === assignedConventionId);
  },

  async getAllCongregations(): Promise<Congregation[]> {
    if (supabase) {
      const { data, error } = await supabase.from('congregations').select('*');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('ATLAS_CONGREGATIONS') || '[]');
  },

  async upsertCongregations(congList: Omit<Congregation, 'id'>[]): Promise<void> {
    if (supabase) {
      // Clean and map for Supabase upsert
      await supabase.from('congregations').upsert(congList, { onConflict: 'number,assigned_convention_id' });
      return;
    }
    const current: Congregation[] = JSON.parse(localStorage.getItem('ATLAS_CONGREGATIONS') || '[]');
    congList.forEach(item => {
      // Find matching number & convention to replace, or add
      const idx = current.findIndex(c => c.number === item.number && c.assigned_convention_id === item.assigned_convention_id);
      const newCong: Congregation = {
        id: idx >= 0 ? current[idx].id : `cong-${Math.random().toString(36).substr(2, 9)}`,
        ...item
      };
      if (idx >= 0) {
        current[idx] = newCong;
      } else {
        current.push(newCong);
      }
    });
    localStorage.setItem('ATLAS_CONGREGATIONS', JSON.stringify(current));
  },

  // --- Volunteers ---
  async getVolunteers(assignedConventionId: string): Promise<(Volunteer & { congregation?: Congregation; evaluations?: Evaluation[] })[]> {
    const congregations = await this.getCongregations(assignedConventionId);
    const congIds = congregations.map(c => c.id);

    if (supabase) {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*, evaluations(*)')
        .in('home_congregation_id', congIds);

      if (!error && data) {
        return data.map((v: any) => ({
          ...v,
          congregation: congregations.find(c => c.id === v.home_congregation_id),
          evaluations: v.evaluations || []
        }));
      }
    }

    const allVolunteers: Volunteer[] = JSON.parse(localStorage.getItem('ATLAS_VOLUNTEERS') || '[]');
    const filteredVolunteers = allVolunteers.filter(v => congIds.includes(v.home_congregation_id));
    const allEvaluations = await this.getAllEvaluations();

    return filteredVolunteers.map(v => ({
      ...v,
      congregation: congregations.find(c => c.id === v.home_congregation_id),
      evaluations: allEvaluations.filter(e => e.volunteer_id === v.id)
    }));
  },

  async upsertVolunteers(volList: Omit<Volunteer, 'id'>[]): Promise<void> {
    if (supabase) {
      await supabase.from('volunteers').upsert(volList, { onConflict: 'jwpub_email' });
      return;
    }
    const current: Volunteer[] = JSON.parse(localStorage.getItem('ATLAS_VOLUNTEERS') || '[]');
    volList.forEach(item => {
      const idx = current.findIndex(v => v.jwpub_email.toLowerCase() === item.jwpub_email.toLowerCase());
      const newVol: Volunteer = {
        id: idx >= 0 ? current[idx].id : `vol-${Math.random().toString(36).substr(2, 9)}`,
        ...item
      };
      if (idx >= 0) {
        current[idx] = newVol;
      } else {
        current.push(newVol);
      }
    });
    localStorage.setItem('ATLAS_VOLUNTEERS', JSON.stringify(current));
  },

  async updateVolunteerAssistantStatus(volunteerId: string, isAssistant: boolean): Promise<void> {
    if (supabase) {
      await supabase.from('volunteers').update({ is_committee_assistant: isAssistant }).eq('id', volunteerId);
      return;
    }
    const current: Volunteer[] = JSON.parse(localStorage.getItem('ATLAS_VOLUNTEERS') || '[]');
    const idx = current.findIndex(v => v.id === volunteerId);
    if (idx >= 0) {
      current[idx].is_committee_assistant = isAssistant;
      localStorage.setItem('ATLAS_VOLUNTEERS', JSON.stringify(current));
    }
  },

  // --- Evaluations ---
  async getAllEvaluations(): Promise<Evaluation[]> {
    if (supabase) {
      const { data, error } = await supabase.from('evaluations').select('*');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('ATLAS_EVALUATIONS') || '[]');
  },

  async getEvaluationsForVolunteer(volunteerId: string): Promise<Evaluation[]> {
    if (supabase) {
      const { data, error } = await supabase.from('evaluations').select('*').eq('volunteer_id', volunteerId);
      if (!error && data) return data;
    }
    const all = await this.getAllEvaluations();
    return all.filter(e => e.volunteer_id === volunteerId);
  },

  async saveEvaluation(evalData: Omit<Evaluation, 'id'> & { id?: string }): Promise<void> {
    if (supabase) {
      if (evalData.id) {
        await supabase.from('evaluations').update(evalData).eq('id', evalData.id);
      } else {
        await supabase.from('evaluations').insert(evalData);
      }
      return;
    }

    const current: Evaluation[] = JSON.parse(localStorage.getItem('ATLAS_EVALUATIONS') || '[]');
    if (evalData.id) {
      const idx = current.findIndex(e => e.id === evalData.id);
      if (idx >= 0) {
        current[idx] = { id: evalData.id, ...evalData };
      }
    } else {
      const newEval: Evaluation = {
        id: `eval-${Math.random().toString(36).substr(2, 9)}`,
        ...evalData
      };
      current.push(newEval);
    }
    localStorage.setItem('ATLAS_EVALUATIONS', JSON.stringify(current));
  },

  async deleteEvaluation(evaluationId: string): Promise<void> {
    if (supabase) {
      await supabase.from('evaluations').delete().eq('id', evaluationId);
      return;
    }
    const current: Evaluation[] = JSON.parse(localStorage.getItem('ATLAS_EVALUATIONS') || '[]');
    const filtered = current.filter(e => e.id !== evaluationId);
    localStorage.setItem('ATLAS_EVALUATIONS', JSON.stringify(filtered));
  }
};
