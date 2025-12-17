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
  totalExperience: string; // String to allow "5 years" or "5 ans"
  score: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  softSkillsDetected: string[];
}

export interface AnalysisHistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
}