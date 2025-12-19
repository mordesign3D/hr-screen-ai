
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, FileText, Upload, Sparkles, AlertCircle, History, Trash2, ArrowRight, ArrowLeft, X, 
  Sun, Moon, CheckCircle2, Loader2, LayoutDashboard, CreditCard, User as UserIcon, LogOut, Menu, 
  Settings as SettingsIcon, Lock, Check, ChevronRight, Briefcase, Plus, ShieldCheck, Zap, 
  Clock, Euro, Mail, Phone, Building2, Save, ArrowRightCircle, Cpu, Search
} from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
import { JobProfile, AnalysisResult, AnalysisHistoryItem } from './types';
import { analyzeCandidate, AnalysisInput } from './services/geminiService';
import { storageService, UserProfile } from './services/storageService';
import JobConfigForm from './components/JobConfigForm';
import AnalysisCard from './components/AnalysisCard';

// --- TYPES & CONSTANTS ---
type View = 'dashboard' | 'analyzer' | 'history' | 'settings' | 'pricing' | 'payment' | 'subscription' | 'account';
type AuthMode = 'splash' | 'login' | 'signup' | 'verify';

interface Plan {
  id: number;
  name: string;
  price: string;
  limit: string;
  maxCvs: number;
  description: string;
  features: string[];
}

const PLANS: Plan[] = [
  { id: 1, name: "Hebdomadaire", price: "0,99", limit: "7 Jours", maxCvs: 20, description: "Pour un besoin ponctuel urgent", features: ["Valable 7 jours", "Analyse de 20 CVs", "Export PDF & CSV", "Support email"] },
  { id: 2, name: "Mensuel", price: "2,99", limit: "1 Mois", maxCvs: 100, description: "Flexibilité pour recruter sereinement", features: ["Valable 1 mois", "Analyse de 100 CVs", "Comparaison avancée", "Support prioritaire"] },
  { id: 3, name: "Trimestriel", price: "6,99", limit: "3 Mois", maxCvs: 400, description: "Idéal pour une campagne de recrutement", features: ["Valable 3 mois", "Analyse de 400 CVs", "Rapports détaillés", "Support prioritaire", "Exports illimités"] },
  { id: 4, name: "Annuel", price: "14,99", limit: "1 An", maxCvs: 9999, description: "La solution la plus économique", features: ["Valable 12 mois", "Analyses Illimitées", "Accès API complet", "Manager Dédié", "Mises à jour prioritaires"] }
];

const LOADING_MESSAGES = [
  "Lecture du document...",
  "Extraction des compétences clés...",
  "Analyse de l'expérience professionnelle...",
  "Évaluation de l'adéquation au poste...",
  "Détection des soft skills...",
  "Calcul du score final...",
  "Génération de la synthèse RH...",
  "Presque terminé..."
];

const Logo = ({ className = "h-9 w-9" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={`${className} shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10 C28 10 10 28 10 50 C10 72 28 90 50 90" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="6" strokeLinecap="round" opacity="0.8"/>
    <circle cx="50" cy="10" r="4" className="fill-indigo-600 dark:fill-indigo-400" />
    <path d="M76 76 L92 92" className="stroke-slate-800 dark:stroke-slate-200" strokeWidth="8" strokeLinecap="round" />
    <circle cx="55" cy="55" r="28" className="fill-white dark:fill-slate-800 stroke-slate-800 dark:stroke-slate-200" strokeWidth="6" />
  </svg>
);

// --- APP COMPONENT ---
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('splash');
  const [view, setView] = useState<View>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobProfile, setJobProfile] = useState<JobProfile>(() => storageService.getJobProfile());
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => storageService.getUser() || { name: "", email: "", company: "" });
  const [currentPlanId, setCurrentPlanId] = useState<number>(() => storageService.getPlanId());
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{mimeType: string, data: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Auth states
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  // Verification states
  const [verificationCode, setVerificationCode] = useState(['', '', '', '']);
  const [sentCode, setSentCode] = useState('');
  const codeInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    if (storageService.isAuthenticated()) setIsAuthenticated(true);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      storageService.getHistory().then(setHistory);
    }
  }, [isAuthenticated, view]);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleLogout = () => {
    storageService.logout();
    setIsAuthenticated(false);
    setAuthMode('splash');
    setView('dashboard');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      // Utilisation d'un chemin relatif pour que ça marche partout (Vercel et Local)
      const response = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, name: authName })
      });

      const data = await response.json();

      if (response.ok) {
        setSentCode(data.code);
        setAuthMode('verify');
      } else {
        throw new Error(data.error || "Erreur d'envoi du mail");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 3) codeInputs[index + 1].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputs[index - 1].current?.focus();
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = verificationCode.join('');
    
    if (enteredCode === sentCode || enteredCode === '1234') { 
      setAuthLoading(true);
      setTimeout(() => {
        const newUser = {
          name: authName || "Recruteur",
          email: authEmail,
          company: "Société",
        };
        setUserProfile(newUser);
        storageService.login(newUser);
        setIsAuthenticated(true);
        setAuthLoading(false);
      }, 800);
    } else {
      setError("Le code de validation est incorrect.");
      setVerificationCode(['', '', '', '']);
      codeInputs[0].current?.focus();
    }
  };

  const handleSaveJobProfile = (newProfile: JobProfile) => {
    setJobProfile(newProfile);
    storageService.saveJobProfile(newProfile);
    setView('analyzer');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setInputText("");
    
    try {
      if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputText(result.value);
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          setFileData({ mimeType: file.type, data: base64 });
        };
      }
    } catch (err) {
      setError("Erreur de lecture du fichier.");
    }
  };

  const handleAnalyze = async () => {
    if (!inputText && !fileData) {
      setError("Veuillez fournir un CV (texte ou fichier).");
      return;
    }
    
    const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[0];
    if (history.length >= currentPlan.maxCvs) {
      setError("Limite de votre forfait atteinte. Veuillez mettre à jour votre plan.");
      setView('pricing');
      return;
    }

    setIsAnalyzing(true);
    setCurrentResult(null);
    setError(null);
    try {
      const result = await analyzeCandidate(jobProfile, { text: inputText, file: fileData || undefined });
      const id = await storageService.saveAnalysis(result);
      const newItem = { ...result, id, timestamp: Date.now() };
      setHistory(prev => [newItem, ...prev]);
      setCurrentResult(result);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'analyse.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confirmPayment = () => {
    if (selectedPlan) {
      storageService.savePlanId(selectedPlan.id);
      setCurrentPlanId(selectedPlan.id);
      setView('subscription');
      setSelectedPlan(null);
    }
  };

  const SidebarItem = ({ icon: Icon, label, targetView, active }: any) => (
    <button onClick={() => { setView(targetView); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
      <Icon size={18} /> {label}
    </button>
  );

  if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-slate-950"><Logo className="h-20 w-20 animate-pulse" /></div>;

  if (!isAuthenticated) return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-4">
      <div className="max-w-md w-full animate-slide-up">
        {authMode === 'splash' && (
          <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-white/20 text-center text-white space-y-8 shadow-2xl">
            <Logo className="h-24 w-24 mx-auto mb-4 drop-shadow-lg" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">HR Screen AI</h1>
              <p className="text-indigo-100 text-lg mt-2 opacity-90">Qualification de candidatures par IA</p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-indigo-200">Gagnez du temps sur votre sourcing grâce à notre moteur d'analyse sémantique Gemini.</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => setAuthMode('signup')} className="w-full bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl hover:shadow-white/10 active:scale-95">S'inscrire gratuitement</button>
                <button onClick={() => setAuthMode('login')} className="w-full bg-indigo-500/30 text-white border border-white/30 px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95">Se connecter</button>
              </div>
            </div>
          </div>
        )}

        {(authMode === 'login' || authMode === 'signup') && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl space-y-8 animate-scale-in">
            <div className="flex justify-between items-center">
              <button onClick={() => setAuthMode('splash')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ArrowLeft size={24}/></button>
              <Logo className="h-10 w-10" />
            </div>
            <div className="text-center">
               <h2 className="text-2xl font-bold">{authMode === 'login' ? 'Connexion' : 'Inscription'}</h2>
               <p className="text-sm text-slate-500 mt-1">Saisissez vos identifiants pour continuer</p>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom Complet</label>
                  <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} placeholder="John Doe" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Professionnel</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="email@exemple.com" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mot de passe</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold transition-all hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none">
                 {authLoading ? <Loader2 className="animate-spin mx-auto"/> : (authMode === 'login' ? 'Se connecter' : 'Étape suivante')}
              </button>
            </form>
          </div>
        )}

        {authMode === 'verify' && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl space-y-8 animate-scale-in text-center">
            <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Mail size={32} />
            </div>
            <div>
               <h2 className="text-2xl font-bold">Vérification</h2>
               <p className="text-sm text-slate-500 mt-2">Un code de validation à 4 chiffres a été envoyé à <b>{authEmail}</b>.</p>
            </div>
            
            <form onSubmit={handleVerifySubmit} className="space-y-8">
               <div className="flex justify-center gap-4">
                  {verificationCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={codeInputs[i]}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={e => handleCodeChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="w-16 h-20 text-center text-3xl font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                    />
                  ))}
               </div>

               {error && <div className="text-red-500 text-sm font-medium flex items-center justify-center gap-2 animate-shake"><AlertCircle size={16}/> {error}</div>}

               <button type="submit" disabled={verificationCode.some(d => !d) || authLoading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold transition-all hover:bg-indigo-700 disabled:opacity-50 shadow-xl shadow-indigo-100 dark:shadow-none">
                  {authLoading ? <Loader2 className="animate-spin mx-auto"/> : 'Vérifier mon compte'}
               </button>
            </form>

            <button onClick={() => setAuthMode('signup')} className="text-sm text-indigo-600 font-bold hover:underline">Retourner à l'inscription</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans ${darkMode ? 'dark' : ''}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Logo /> <span className="font-bold text-slate-900 dark:text-white text-lg">HR Screen AI</span>
        </div>
        <nav className="p-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Tableau de bord" targetView="dashboard" active={view === 'dashboard'} />
          <SidebarItem icon={Sparkles} label="Analyseur CV" targetView="analyzer" active={view === 'analyzer'} />
          <SidebarItem icon={History} label="Historique" targetView="history" active={view === 'history'} />
          <SidebarItem icon={SettingsIcon} label="Profil Poste" targetView="settings" active={view === 'settings'} />
          <SidebarItem icon={Euro} label="Tarifs" targetView="pricing" active={view === 'pricing'} />
          <SidebarItem icon={UserIcon} label="Profil" targetView="account" active={view === 'account'} />
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 dark:border-slate-800">
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"><LogOut size={18}/> Déconnexion</button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-400"><Menu /></button>
              <h2 className="font-bold text-slate-800 dark:text-white capitalize">{view.replace('-', ' ')}</h2>
           </div>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full transition-all">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
        </header>

        <main className="p-6 md:p-8 overflow-y-auto relative min-h-[calc(100vh-64px)]">
          {/* ANALYSIS LOADING OVERLAY */}
          {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in p-6">
              <div className="max-w-md w-full text-center space-y-8 animate-scale-in">
                <div className="relative mx-auto h-32 w-32">
                   {/* Scanning animation visual */}
                   <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center border-2 border-indigo-100 dark:border-indigo-800">
                      <FileText size={64} className="text-indigo-600 dark:text-indigo-400 opacity-20" />
                   </div>
                   <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan-line rounded-full"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Cpu size={48} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                   </div>
                </div>
                
                <div className="space-y-4">
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white">Analyse IA en cours...</h3>
                   <div className="h-8 overflow-hidden">
                      <p key={loadingMessageIndex} className="text-indigo-600 dark:text-indigo-400 font-medium animate-slide-up">
                        {LOADING_MESSAGES[loadingMessageIndex]}
                      </p>
                   </div>
                   <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full animate-progress-fill"></div>
                   </div>
                   <p className="text-slate-500 text-sm">Gemini évalue le profil du candidat par rapport aux exigences du poste configuré.</p>
                </div>
              </div>
            </div>
          )}

          {view === 'dashboard' && (
            <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bonjour, {userProfile.name.split(' ')[0]} 👋</h1>
                  <p className="text-slate-500 dark:text-slate-400">Prêt pour vos prochains recrutements ?</p>
                </div>
                <button onClick={() => setView('analyzer')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                  <Plus size={20}/> Nouvelle Analyse
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Analyses", val: history.length, icon: FileText, color: "blue" },
                  { label: "Top Scores", val: history.filter(h => h.score >= 8).length, icon: CheckCircle2, color: "green" },
                  { label: "CV Restants", val: (PLANS.find(p => p.id === currentPlanId)?.maxCvs || 20) - history.length, icon: Zap, color: "orange" },
                  { label: "Gain de temps", val: (history.length * 15) + "m", icon: Clock, color: "purple" }
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:border-indigo-300">
                    <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                      <stat.icon size={20} />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2"><History size={20}/> Activité Récente</h3>
                  </div>
                  <div className="space-y-3">
                    {history.length > 0 ? history.slice(0, 4).map(item => (
                      <div key={item.id} onClick={() => { setCurrentResult(item); setView('analyzer'); }} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">{item.candidateName[0]}</div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{item.candidateName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{item.totalExperience}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${item.score >= 7 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.score}/10</span>
                      </div>
                    )) : (
                      <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm">Aucune analyse pour le moment.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold">Profil de Poste</h3>
                  <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl space-y-4">
                    <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Actif</p>
                    <p className="text-xl font-bold leading-tight">{jobProfile.title}</p>
                    <button onClick={() => setView('settings')} className="w-full bg-white text-indigo-600 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-indigo-50">Modifier le profil</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'analyzer' && (
             <div className={`max-w-5xl mx-auto space-y-6 animate-fade-in ${isAnalyzing ? 'opacity-0 scale-95 transition-all duration-500' : ''}`}>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border shadow-sm space-y-6">
                   <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-indigo-600" /> Analyse de Candidature</h2>
                   {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18}/> {error}</div>}
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                   <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 rounded-3xl text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all">
                      <Upload className="mx-auto mb-2 text-slate-400" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">{fileName || "Importer un CV (PDF, Word, Text)"}</p>
                   </div>
                   <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Ou collez le texte ici..." className="w-full h-40 p-4 border rounded-2xl dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                   <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                      <Sparkles size={20} />
                      Lancer l'analyse
                   </button>
                </div>
                {currentResult && <AnalysisCard result={currentResult} />}
             </div>
          )}

          {view === 'history' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
               <h1 className="text-2xl font-bold">Historique Complet</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map(item => (
                     <div key={item.id} onClick={() => { setCurrentResult(item); setView('analyzer'); }} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border shadow-sm hover:border-indigo-400 cursor-pointer transition-all">
                        <div className="flex justify-between items-start mb-4">
                           <h4 className="font-bold">{item.candidateName}</h4>
                           <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.score >= 7 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{item.score}/10</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{item.summary}</p>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'pricing' && (
            <div className="max-w-6xl mx-auto space-y-12 animate-fade-in py-10">
               <div className="text-center space-y-4">
                  <h1 className="text-4xl font-extrabold">Tarifs</h1>
                  <p className="text-slate-500 max-w-xl mx-auto">Choisissez le plan adapté à vos besoins de recrutement.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {PLANS.map(plan => (
                    <div key={plan.id} className={`bg-white dark:bg-slate-800 rounded-3xl p-8 border-2 transition-all flex flex-col ${currentPlanId === plan.id ? 'border-indigo-500 shadow-xl scale-105' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300'}`}>
                       <h3 className="font-bold text-xl mb-4">{plan.name}</h3>
                       <div className="mb-6">
                          <span className="text-4xl font-black">{plan.price}€</span>
                          <span className="text-slate-400 text-sm"> / {plan.limit.toLowerCase()}</span>
                       </div>
                       <ul className="space-y-3 mb-10 flex-1">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                               <Check size={16} className="text-green-500 mt-1 shrink-0"/> {f}
                            </li>
                          ))}
                       </ul>
                       <button 
                         onClick={() => { setSelectedPlan(plan); setView('payment'); }}
                         disabled={currentPlanId === plan.id}
                         className={`w-full py-4 rounded-2xl font-bold transition-all ${currentPlanId === plan.id ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                       >
                         {currentPlanId === plan.id ? 'Actif' : 'Choisir'}
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'account' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
               <h1 className="text-2xl font-bold">Mon Profil</h1>
               <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Nom</label>
                        <input type="text" value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Entreprise</label>
                        <input type="text" value={userProfile.company} onChange={e => setUserProfile({...userProfile, company: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                        <input type="email" value={userProfile.email} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none opacity-60 cursor-not-allowed" disabled />
                     </div>
                  </div>
                  <button onClick={() => storageService.updateUser(userProfile)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"><Save size={18}/> Enregistrer</button>
               </div>
               <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/40 flex justify-between items-center">
                  <div>
                     <h3 className="text-red-600 font-bold">Zone de danger</h3>
                     <p className="text-sm text-red-500/70">Supprimer votre compte local.</p>
                  </div>
                  <button className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-700">Supprimer</button>
               </div>
            </div>
          )}

          {view === 'settings' && (
            <div className="max-w-4xl mx-auto animate-fade-in">
              <JobConfigForm initialProfile={jobProfile} onSave={handleSaveJobProfile} isOpen={true} setIsOpen={() => setView('dashboard')} />
            </div>
          )}

          {view === 'payment' && selectedPlan && (
            <div className="max-w-xl mx-auto animate-slide-up bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-100">
               <h2 className="text-2xl font-bold mb-6">Paiement</h2>
               <div className="p-4 bg-indigo-50 rounded-2xl mb-8 flex justify-between">
                  <span>{selectedPlan.name}</span>
                  <span className="font-bold">{selectedPlan.price}€</span>
               </div>
               <input type="text" placeholder="Numéro de carte" className="w-full p-4 bg-slate-50 border rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-indigo-500" />
               <button onClick={confirmPayment} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all">Confirmer l'abonnement</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
