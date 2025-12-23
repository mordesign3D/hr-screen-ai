
export interface JobProfile {
  title: string;
  minExperience: number;
  educationLevel: string;
  fieldOfStudy: string;
  languages: string[];
  requiredSkills: string[];
  softSkills: string[];
}

export interface AnalysisResult {
  candidateName: string;
  totalExperience: string;
  score: number; // Score global (moyenne pondérée)
  technicalScore: number; // Adéquation technique /10
  potentialScore: number; // Potentiel d'évolution /10
  stabilityScore: number; // Stabilité /10
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  softSkillsDetected: string[];
  weakSignals?: string[];
}

export interface AnalysisHistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
}