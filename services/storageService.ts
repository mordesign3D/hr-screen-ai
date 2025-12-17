
import { JobProfile, AnalysisHistoryItem, AnalysisResult } from '../types';
import { DEFAULT_JOB_PROFILE } from '../constants';

const KEYS = {
  USER: 'hr_app_user',
  AUTH_TOKEN: 'hr_app_token',
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

export const storageService = {
  // Désactivation des indicateurs Cloud
  isCloudSyncActive: () => false,

  isAuthenticated: (): boolean => !!localStorage.getItem(KEYS.AUTH_TOKEN),

  login: (user: UserProfile) => {
    const token = 'tk_' + Math.random().toString(36).substr(2);
    localStorage.setItem(KEYS.AUTH_TOKEN, token);
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return token;
  },

  logout: () => {
    localStorage.removeItem(KEYS.AUTH_TOKEN);
    // On garde les données pour la prochaine session locale ou on peut choisir de les vider
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
    const timestamp = Date.now();
    const history = await storageService.getHistory();
    const id = timestamp.toString();
    const newItem = { ...result, id, timestamp };
    
    localStorage.setItem(KEYS.LOCAL_HISTORY, JSON.stringify([newItem, ...history]));
    return id;
  },

  getHistory: async (): Promise<AnalysisHistoryItem[]> => {
    const data = localStorage.getItem(KEYS.LOCAL_HISTORY);
    return data ? JSON.parse(data) : [];
  },

  getPlanId: (): number => {
    const data = localStorage.getItem(KEYS.PLAN);
    return data ? parseInt(data, 10) : 1;
  },

  savePlanId: (planId: number) => {
    localStorage.setItem(KEYS.PLAN, planId.toString());
  }
};
