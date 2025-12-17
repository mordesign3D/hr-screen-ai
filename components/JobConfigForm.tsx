import React, { useState, useRef, useEffect } from 'react';
import { JobProfile } from '../types';
import { Settings, Save, Plus, X, Briefcase, GraduationCap, BookOpen, Languages } from 'lucide-react';

interface JobConfigFormProps {
  initialProfile: JobProfile;
  onSave: (profile: JobProfile) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const COMMON_JOB_TITLES = [
  "Développeur Full-Stack", "Développeur Frontend", "Développeur Backend", "Développeur Mobile",
  "Data Scientist", "Data Analyst", "Data Engineer",
  "DevOps Engineer", "Cloud Architect", "Administrateur Système",
  "Chef de Projet", "Product Manager", "Product Owner", "Scrum Master",
  "UX Designer", "UI Designer", "Directeur Artistique",
  "Responsable RH", "Recruteur IT", "Assistant Administratif",
  "Comptable", "Contrôleur de Gestion",
  "Commercial", "Business Developer", "Account Manager",
  "Marketing Manager", "Community Manager", "SEO Specialist"
];

const EDUCATION_LEVELS = [
  "Aucun",
  "Bac / Niveau Bac",
  "Bac+2 (BTS, DUT)",
  "Bac+3 (Licence, Bachelor)",
  "Bac+5 (Master, Ingénieur)",
  "Bac+8 (Doctorat)",
  "Autre"
];

const JobConfigForm: React.FC<JobConfigFormProps> = ({ initialProfile, onSave, isOpen, setIsOpen }) => {
  const [profile, setProfile] = useState<JobProfile>(initialProfile);
  const [newSkill, setNewSkill] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filter suggestions based on input
  const filteredTitles = COMMON_JOB_TITLES.filter(title => 
    title.toLowerCase().includes(profile.title.toLowerCase()) && 
    title.toLowerCase() !== profile.title.toLowerCase()
  );

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim()) {
      setProfile(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(s => s !== skillToRemove)
    }));
  };

  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLanguage.trim()) {
      setProfile(prev => ({
        ...prev,
        languages: [...(prev.languages || []), newLanguage.trim()]
      }));
      setNewLanguage("");
    }
  };

  const removeLanguage = (langToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      languages: (prev.languages || []).filter(l => l !== langToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    setIsOpen(false);
  };

  const selectTitle = (title: string) => {
    setProfile({ ...profile, title });
    setShowSuggestions(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-4 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-full md:w-auto"
      >
        <Settings size={16} />
        <span>Configurer le Profil de Poste ({profile.title})</span>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-indigo-100 dark:border-slate-700 mb-6 animate-scale-in">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
          <Settings size={18} className="text-indigo-600 dark:text-indigo-400" />
          Configuration du Poste
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative z-20">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Intitulé du Poste</label>
            <input 
              type="text" 
              value={profile.title}
              onChange={e => {
                setProfile({...profile, title: e.target.value});
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
              placeholder="Ex: Développeur React"
              className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && profile.title && filteredTitles.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-30 animate-fade-in">
                {filteredTitles.map((title, index) => (
                  <li 
                    key={index}
                    onClick={() => selectTitle(title)}
                    className="px-4 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2"
                  >
                    <Briefcase size={14} className="text-slate-400" />
                    {title}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expérience Min. (Ans)</label>
            <input 
              type="number" 
              value={profile.minExperience}
              onChange={e => setProfile({...profile, minExperience: parseInt(e.target.value) || 0})}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
               <GraduationCap size={14} className="text-slate-400"/> Niveau d'étude
            </label>
            <select
              value={profile.educationLevel || "Autre"}
              onChange={e => setProfile({...profile, educationLevel: e.target.value})}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
               <BookOpen size={14} className="text-slate-400"/> Domaine / Formation
            </label>
            <input 
              type="text" 
              value={profile.fieldOfStudy || ""}
              onChange={e => setProfile({...profile, fieldOfStudy: e.target.value})}
              placeholder="Ex: Informatique, Marketing..."
              className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Languages Section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <Languages size={14} className="text-slate-400"/> Langues Maîtrisées
          </label>
          <div className="flex flex-wrap gap-2 mb-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md min-h-[46px] border border-slate-100 dark:border-slate-700">
            {profile.languages && profile.languages.length > 0 ? (
              profile.languages.map((lang) => (
                <span key={lang} className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm">
                  {lang}
                  <button type="button" onClick={() => removeLanguage(lang)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic py-1">Aucune langue spécifiée</span>
            )}
          </div>
          <div className="flex gap-2">
            <input 
              type="text"
              value={newLanguage}
              onChange={e => setNewLanguage(e.target.value)}
              placeholder="Ajouter une langue (ex: Anglais, Espagnol...)"
              className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md outline-none focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddLanguage(e)}
            />
            <button 
              type="button" 
              onClick={handleAddLanguage}
              className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Compétences Requises</label>
          <div className="flex flex-wrap gap-2 mb-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md min-h-[50px] border border-slate-100 dark:border-slate-700">
            {profile.requiredSkills.map((skill) => (
              <span key={skill} className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text"
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              placeholder="Ajouter une compétence (ex: React)"
              className="flex-1 p-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md outline-none focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(e)}
            />
            <button 
              type="button" 
              onClick={handleAddSkill}
              className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button 
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-md shadow-indigo-200 dark:shadow-none"
          >
            <Save size={16} />
            Enregistrer la Configuration
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobConfigForm;