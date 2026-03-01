
import { JobProfile, AnalysisHistoryItem, AnalysisResult } from '../types';
import { DEFAULT_JOB_PROFILE } from '../constants';

const KEYS = {
  USER: 'hr_app_user',
  JOB_PROFILE: 'hr_app_job_profile',
  PLAN: 'hr_app_plan',
  LOCAL_HISTORY: 'hr_app_history'
};

export interface UserProfile {
  name: string;
  email: string;
  company: string;
  phone?: string;
}

const DEFAULT_USER: UserProfile = {
  name: "Recruteur",
  email: "contact@entreprise.com",
  company: "Ma Société"
};

export const storageService = {
  isCloudSyncActive: () => false,

  // Authentication
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(KEYS.USER);
  },

  logout: () => {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.PLAN);
    localStorage.removeItem(KEYS.LOCAL_HISTORY);
  },

  getUser: (): UserProfile | null => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  updateUser: (user: UserProfile) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  getJobProfile: (): JobProfile => {
    const data = localStorage.getItem(KEYS.JOB_PROFILE);
    return data ? JSON.parse(data) : DEFAULT_JOB_PROFILE;
  },

  saveJobProfile: (profile: JobProfile) => {
    localStorage.setItem(KEYS.JOB_PROFILE, JSON.stringify(profile));
  },

  saveAnalysis: async (result: AnalysisResult): Promise<string> => {
    const user = storageService.getUser();
    if (user) {
      try {
        const response = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, result }),
        });
        const data = await response.json();
        if (data.success) return data.id;
      } catch (error) {
        console.error("Error saving to server:", error);
      }
    }

    // Fallback to local storage
    const timestamp = Date.now();
    const history = await storageService.getHistory();
    const id = timestamp.toString();
    const newItem = { ...result, id, timestamp };
    localStorage.setItem(KEYS.LOCAL_HISTORY, JSON.stringify([newItem, ...history]));
    return id;
  },

  getHistory: async (): Promise<AnalysisHistoryItem[]> => {
    const user = storageService.getUser();
    if (user) {
      try {
        const response = await fetch(`/api/history/${user.email}`);
        const data = await response.json();
        if (data.success) return data.history;
      } catch (error) {
        console.error("Error fetching from server:", error);
      }
    }

    const data = localStorage.getItem(KEYS.LOCAL_HISTORY);
    return data ? JSON.parse(data) : [];
  },

  getPlanId: (): number => {
    const data = localStorage.getItem(KEYS.PLAN);
    return data ? parseInt(data, 10) : 0;
  },

  savePlanId: (planId: number) => {
    localStorage.setItem(KEYS.PLAN, planId.toString());
  }
};
