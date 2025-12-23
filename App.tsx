import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Upload, Sparkles, AlertCircle, History, X, 
  Sun, Moon, CheckCircle2, Loader2, LayoutDashboard, CreditCard, User as UserIcon, LogOut, Menu, 
  Settings as SettingsIcon, Check, ChevronRight, Plus, ShieldCheck, Zap, 
  Clock, Euro, Mail, Save, LogIn, Smartphone, Wallet, Cpu, ArrowLeft
} from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
import { JobProfile, AnalysisResult, AnalysisHistoryItem } from './types';
import { analyzeCandidate, AnalysisInput } from './services/geminiService';
import { storageService, UserProfile } from './services/storageService';
import JobConfigForm from './components/JobConfigForm';
import AnalysisCard from './components/AnalysisCard';

// --- CONSTANTS ---
const PLANS = [
  { id: 1, name: "Hebdomadaire", price: "0,99", limit: "7 Jours", maxCvs: 20, features: ["Valable 7 jours", "Analyse de 20 CVs", "Export PDF & CSV", "Support email"] },
  { id: 2, name: "Mensuel", price: "2,99", limit: "1 Mois", maxCvs: 100, features: ["Valable 1 mois", "Analyse de 100 CVs", "Comparaison avancée", "Support prioritaire"] },
  { id: 3, name: "Trimestriel", price: "6,99", limit: "3 Mois", maxCvs: 400, features: ["Valable 3 mois", "Analyse de 400 CVs", "Rapports détaillés", "Support prioritaire", "Exports illimités"] },
  { id: 4, name: "Annuel", price: "14,99", limit: "1 An", maxCvs: 9999, features: ["Valable 12 mois", "Analyses Illimitées", "Accès API complet", "Manager Dédié"] }
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

// --- MAIN APP COMPONENT ---
const App = () => {
  // Global States
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => storageService.isAuthenticated());
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'verify' | 'none'>('none');
  const [view, setView] = useState<'dashboard' | 'analyzer' | 'history' | 'settings' | 'pricing' | 'payment' | 'subscription' | 'account'>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data States
  const [jobProfile, setJobProfile] = useState<JobProfile>(() => storageService.getJobProfile());
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => storageService.getUser() || { name: "Recruteur", email: "", company: "" });
  const [currentPlanId, setCurrentPlanId] = useState<number>(() => storageService.getPlanId());
  
  // Auth Form States
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '']);
  const [sentCode, setSentCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const codeInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Analyzer States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [inputText, setInputText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{mimeType: string, data: string} | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);

  // Pricing/Payment States
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wave' | 'orange'>('card');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    storageService.getHistory().then(setHistory);
  }, [view, isAnalyzing]);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // --- AUTH HANDLERS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      let response;
      try {
        response = await fetch('/api/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, name: authName })
        });
      } catch (err) {
        // Simulation locale si le backend est absent
        response = { ok: true, json: () => Promise.resolve({ success: true, code: '1234' }) };
      }

      const data = await (response as any).json();
      if ((response as any).ok) {
        setSentCode(data.code || '1234');
        setAuthMode('verify');
      } else {
        throw new Error(data.error || "Erreur de connexion au service d'authentification.");
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = verificationCode.join('');
    
    if (enteredCode === sentCode || enteredCode === '1234') { 
      setAuthLoading(true);
      setTimeout(() => {
        const newUser = {
          name: authName || authEmail.split('@')[0],
          email: authEmail,
          company: "Société",
        };
        setUserProfile(newUser);
        storageService.login(newUser);
        setIsAuthenticated(true);
        setAuthLoading(false);
        setAuthMode('none');
        if (selectedPlan) setView('payment');
        else setView('dashboard');
      }, 800);
    } else {
      setAuthError("Le code est incorrect. Utilisez '1234' pour tester.");
      setVerificationCode(['', '', '', '']);
      codeInputs[0].current?.focus();
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

  const handleLogout = () => {
    storageService.logout();
    setIsAuthenticated(false);
    setUserProfile({ name: "Invité", email: "", company: "" });
    setAuthMode('none');
    setView('dashboard');
  };

  // --- ANALYZER HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setAnalyzerError(null);
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
      setAnalyzerError("Erreur de lecture du fichier.");
    }
  };

  const handleAnalyze = async () => {
    if (!inputText && !fileData) {
      setAnalyzerError("Veuillez fournir un CV (texte ou fichier).");
      return;
    }
    
    const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[0];
    if (history.length >= currentPlan.maxCvs) {
      setAnalyzerError(`Limite de votre forfait (${currentPlan.maxCvs} CVs) atteinte.`);
      setView('pricing');
      return;
    }

    setIsAnalyzing(true);
    setCurrentResult(null);
    setAnalyzerError(null);
    try {
      const result = await analyzeCandidate(jobProfile, { text: inputText, file: fileData || undefined });
      const id = await storageService.saveAnalysis(result);
      const newItem = { ...result, id, timestamp: Date.now() };
      setHistory(prev => [newItem, ...prev]);
      setCurrentResult(newItem);
    } catch (err: any) {
      setAnalyzerError(err.message || "Erreur lors de l'analyse.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveJobProfile = (profile: JobProfile) => {
    setJobProfile(profile);
    storageService.saveJobProfile(profile);
    setView('dashboard');
  };

  // --- UTILS ---
  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    if (!isAuthenticated) setAuthMode('signup');
    else setView('payment');
  };

  const SidebarItem = ({ icon: Icon, label, targetView, active }: any) => (
    <button onClick={() => { setView(targetView); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
      <Icon size={18} /> {label}
    </button>
  );

  const currentPlan = PLANS.find(p => p.id === currentPlanId) || PLANS[0];
  const quotaReached = history.length >= currentPlan.maxCvs;

  // --- RENDERING ---
  if (isLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 overflow-hidden">
      <div className="relative mb-12 animate-float">
        <div className="w-32 h-44 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-lg relative shadow-2xl overflow-hidden animate-scale-in">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`mt-${i===0?6:3} mx-4 h-1.5 w-${[20,24,16,12,22,18][i]} bg-slate-100 dark:bg-slate-800 rounded-full`}></div>
          ))}
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/80 shadow-[0_0_15px_rgba(79,70,229,0.8)] animate-scan-loading z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none opacity-20"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-indigo-100/50 dark:border-indigo-900/20 rounded-full animate-spin-slow"></div>
        <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>
      </div>
      <div className="text-center space-y-4 max-w-xs animate-fade-in">
        <div className="flex items-center justify-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-bold text-slate-900 dark:text-white text-xl tracking-tight">HR Screen AI</span>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Optimisation de l'intelligence RH...</p>
        <div className="w-48 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-indigo-600 animate-progress-loading shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans ${darkMode ? 'dark' : ''}`}>
      {/* AUTH MODAL */}
      {authMode !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl relative animate-scale-in">
              <button onClick={() => setAuthMode('none')} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
              
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Logo className="h-12 w-12 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold">{authMode === 'login' ? 'Connexion' : 'Inscription'}</h2>
                    <p className="text-sm text-slate-500 mt-1">Accédez à vos outils de recrutement</p>
                  </div>
                  {authError && <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl flex items-center gap-2 border border-red-100"><AlertCircle size={14}/> {authError}</div>}
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authMode === 'signup' && (
                      <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Nom complet" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                    )}
                    <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email professionnel" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Mot de passe" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button type="submit" disabled={authLoading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold transition-all hover:bg-indigo-700 active:scale-95 shadow-lg">
                       {authLoading ? <Loader2 className="animate-spin mx-auto"/> : 'Continuer'}
                    </button>
                    <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-sm text-slate-500 font-medium">
                      {authMode === 'login' ? "Nouveau ? Créer un compte" : "Déjà inscrit ? Connexion"}
                    </button>
                  </form>
                </div>
              )}

              {authMode === 'verify' && (
                <div className="text-center space-y-6">
                  <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto animate-pulse"><Mail size={32} /></div>
                  <h2 className="text-2xl font-bold">Vérification</h2>
                  <p className="text-sm text-slate-500">Un code a été envoyé à {authEmail} (Mode test : entrez 1234)</p>
                  <form onSubmit={handleVerifySubmit} className="space-y-8">
                    <div className="flex justify-center gap-4">
                      {verificationCode.map((digit, i) => (
                        <input key={i} ref={codeInputs[i]} type="text" inputMode="numeric" value={digit} onChange={e => handleCodeChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} className="w-12 h-16 text-center text-2xl font-black bg-slate-50 border-2 rounded-xl focus:border-indigo-500 outline-none" />
                      ))}
                    </div>
                    {authError && <div className="text-red-500 text-sm font-medium">{authError}</div>}
                    <button type="submit" disabled={verificationCode.some(d => !d) || authLoading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700">Vérifier</button>
                  </form>
                </div>
              )}
           </div>
        </div>
      )}

      {/* SIDEBAR */}
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
           {isAuthenticated ? (
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"><LogOut size={18}/> Déconnexion</button>
           ) : (
             <button onClick={() => setAuthMode('login')} className="w-full flex items-center gap-3 px-3 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors"><LogIn size={18}/> Se connecter</button>
           )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu /></button>
              <h2 className="font-bold text-slate-800 dark:text-white capitalize">{view.replace('-', ' ')}</h2>
           </div>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full transition-all">{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
        </header>

        <main className="p-6 md:p-8 overflow-y-auto relative min-h-[calc(100vh-64px)]">
          {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in p-6">
              <div className="max-w-md w-full text-center space-y-8 animate-scale-in">
                <div className="relative mx-auto h-32 w-32">
                   <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center border-2 border-indigo-100 dark:border-indigo-800">
                      <FileText size={64} className="text-indigo-600 dark:text-indigo-400 opacity-20" />
                   </div>
                   <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-scan-line rounded-full"></div>
                   <div className="absolute inset-0 flex items-center justify-center"><Cpu size={48} className="text-indigo-600 dark:text-indigo-400 animate-pulse" /></div>
                </div>
                <div className="space-y-4">
                   <h3 className="text-2xl font-bold">Analyse en cours...</h3>
                   <div className="h-8 overflow-hidden"><p key={loadingMessageIndex} className="text-indigo-600 font-medium animate-slide-up">{LOADING_MESSAGES[loadingMessageIndex]}</p></div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-indigo-600 h-full animate-progress-fill"></div></div>
                </div>
              </div>
            </div>
          )}

          {view === 'dashboard' && (
            <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Bonjour, {userProfile.name.split(' ')[0]} 👋</h1>
                  <p className="text-slate-500">Prêt pour vos prochains recrutements ?</p>
                </div>
                <button onClick={() => setView('analyzer')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                  <Plus size={20}/> Nouvelle Analyse
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Analyses", val: history.length, icon: FileText },
                  { label: "Top Scores", val: history.filter(h => h.score >= 8).length, icon: CheckCircle2 },
                  { label: "CV Restants", val: (currentPlan.maxCvs - history.length), icon: Zap },
                  { label: "Gain de temps", val: (history.length * 15) + "m", icon: Clock }
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all hover:border-indigo-300">
                    <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 mb-3"><stat.icon size={20} /></div>
                    <p className="text-slate-500 text-xs font-medium uppercase">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2"><History size={20}/> Activité Récente</h3>
                  <div className="space-y-3">
                    {history.length > 0 ? history.slice(0, 4).map(item => (
                      <div key={item.id} onClick={() => { setCurrentResult(item); setView('analyzer'); }} className="bg-white dark:bg-slate-800 p-4 rounded-xl border flex items-center justify-between hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">{item.candidateName[0]}</div>
                          <div>
                            <p className="font-bold group-hover:text-indigo-600 transition-colors">{item.candidateName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{item.totalExperience}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${item.score >= 7 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.score}/10</span>
                      </div>
                    )) : (
                      <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-400 text-sm">Aucune analyse.</p></div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold">Profil Actif</h3>
                  <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl space-y-4">
                    <p className="text-sm font-medium opacity-80 uppercase">Actif</p>
                    <p className="text-xl font-bold leading-tight">{jobProfile.title}</p>
                    <button onClick={() => setView('settings')} className="w-full bg-white text-indigo-600 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-50">Modifier</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'analyzer' && (
             <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-indigo-600" /> Analyse de Candidature</h2>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${quotaReached ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Zap size={14} /> Quota : {history.length} / {currentPlan.maxCvs}
                    </div>
                  </div>
                  {quotaReached && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl text-sm flex flex-col gap-2">
                      <div className="flex items-center gap-2 font-bold"><AlertCircle size={18}/> Limite atteinte</div>
                      <p>Mettez à jour votre abonnement pour continuer les analyses.</p>
                      <button onClick={() => setView('pricing')} className="mt-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-xs self-start">Voir les tarifs</button>
                    </div>
                  )}
                  {analyzerError && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={18}/> {analyzerError}</div>}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <div onClick={() => !quotaReached && fileInputRef.current?.click()} className={`border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 rounded-3xl text-center transition-all ${quotaReached ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}>
                      <Upload className="mx-auto mb-2 text-slate-400" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">{fileName || "Importer un CV (PDF, Word, Text)"}</p>
                  </div>
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)} disabled={quotaReached} placeholder="Ou collez le texte ici..." className="w-full h-40 p-4 border rounded-2xl dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={handleAnalyze} disabled={isAnalyzing || quotaReached} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50">Lancer l'analyse IA</button>
                </div>
                {currentResult && <AnalysisCard result={currentResult} />}
             </div>
          )}

          {view === 'pricing' && (
            <div className="max-w-6xl mx-auto space-y-12 animate-fade-in py-10">
               <div className="text-center space-y-4">
                  <h1 className="text-4xl font-extrabold">Tarifs</h1>
                  <p className="text-slate-500">Choisissez le plan adapté à vos besoins de recrutement.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {PLANS.map(plan => (
                    <div key={plan.id} className={`bg-white dark:bg-slate-800 rounded-3xl p-8 border-2 flex flex-col ${currentPlanId === plan.id ? 'border-indigo-500 shadow-xl scale-105' : 'border-slate-100 dark:border-slate-700 hover:border-indigo-300'}`}>
                       <h3 className="font-bold text-xl mb-4">{plan.name}</h3>
                       <div className="mb-6"><span className="text-4xl font-black">{plan.price}€</span><span className="text-slate-400 text-sm"> / {plan.limit.toLowerCase()}</span></div>
                       <ul className="space-y-3 mb-10 flex-1">
                          {plan.features.map((f, i) => (<li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><Check size={16} className="text-green-500 shrink-0"/> {f}</li>))}
                       </ul>
                       <button onClick={() => handleSelectPlan(plan)} disabled={currentPlanId === plan.id} className={`w-full py-4 rounded-2xl font-bold ${currentPlanId === plan.id ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                         {currentPlanId === plan.id ? 'Actif' : 'Choisir'}
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'payment' && selectedPlan && (
            <div className="max-w-xl mx-auto animate-slide-up bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
               <button onClick={() => setView('pricing')} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-2 text-sm"><ArrowLeft size={16}/> Retour</button>
               <h2 className="text-2xl font-bold mb-2">Paiement Sécurisé</h2>
               <p className="text-slate-500 text-sm mb-8">Pack {selectedPlan.name} - {selectedPlan.price}€</p>
               <div className="grid grid-cols-3 gap-3 mb-8">
                  {['card', 'wave', 'orange'].map((m: any) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100'}`}>
                      {m === 'card' ? <CreditCard size={24}/> : m === 'wave' ? <Wallet size={24} className="text-blue-500"/> : <Smartphone size={24} className="text-orange-500"/>}
                      <span className="text-[10px] font-bold uppercase">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => { storageService.savePlanId(selectedPlan.id); setCurrentPlanId(selectedPlan.id); setView('dashboard'); setSelectedPlan(null); }} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><ShieldCheck size={20}/> Payer {selectedPlan.price}€</button>
            </div>
          )}

          {view === 'account' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
               <h1 className="text-2xl font-bold">Mon Profil</h1>
               <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border shadow-sm space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase">Nom</label><input type="text" value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl" /></div>
                     <div className="space-y-1.5"><label className="text-xs font-bold text-slate-400 uppercase">Entreprise</label><input type="text" value={userProfile.company} onChange={e => setUserProfile({...userProfile, company: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl" /></div>
                  </div>
                  <button onClick={() => storageService.updateUser(userProfile)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2"><Save size={18}/> Enregistrer</button>
               </div>
            </div>
          )}

          {view === 'history' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
               <h1 className="text-2xl font-bold">Historique</h1>
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

          {view === 'settings' && (
            <div className="max-w-4xl mx-auto animate-fade-in">
              <JobConfigForm initialProfile={jobProfile} onSave={handleSaveJobProfile} isOpen={true} setIsOpen={() => setView('dashboard')} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;