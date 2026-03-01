
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Upload, Sparkles, AlertCircle, History, X, 
  Sun, Moon, CheckCircle2, Loader2, LayoutDashboard, CreditCard, User as UserIcon, LogOut, Menu, 
  Settings as SettingsIcon, Check, Plus, ShieldCheck, Zap, 
  Clock, Euro, Save, Smartphone, Wallet, Cpu, ArrowLeft, ChevronRight, Mail
} from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';
import { JobProfile, AnalysisResult, AnalysisHistoryItem } from './types';
import { analyzeCandidate, AnalysisInput } from './services/geminiService';
import { storageService, UserProfile } from './services/storageService';
import JobConfigForm from './components/JobConfigForm';
import AnalysisCard from './components/AnalysisCard';
import AuthView from './components/AuthView';

// --- CONSTANTS ---
const PLANS = [
  { id: 1, name: "Découverte", price: "1 000", limit: "24 Heures", maxCvs: 100, maxBatchSize: 20, features: ["Valable 24h", "Analyse de 100 CVs", "20 CVs par analyse", "Export PDF & CSV"] },
  { id: 2, name: "Essentiel", price: "3 500", limit: "1 Mois", maxCvs: 500, maxBatchSize: 50, features: ["Valable 1 mois", "Analyse de 500 CVs", "50 CVs par analyse", "Support prioritaire"] },
  { id: 3, name: "Pro", price: "9 000", limit: "3 Mois", maxCvs: 2500, maxBatchSize: 100, features: ["Valable 3 mois", "Analyse de 2 500 CVs", "100 CVs par analyse", "Support prioritaire"] },
  { id: 4, name: "Business", price: "25 000", limit: "1 An", maxCvs: 9999, maxBatchSize: 500, features: ["Valable 12 mois", "Analyses Illimitées", "500 CVs par analyse", "Manager Dédié"] }
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
  <svg viewBox="0 0 100 100" className={`${className} drop-shadow-[0_0_8px_rgba(0,133,63,0.4)]`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10 C28 10 10 28 10 50 C10 72 28 90 50 90" className="stroke-snGreen" strokeWidth="6" strokeLinecap="round" opacity="0.8"/>
    <circle cx="50" cy="10" r="4" className="fill-snYellow" />
    <path d="M76 76 L92 92" className="stroke-snRed" strokeWidth="8" strokeLinecap="round" />
    <circle cx="55" cy="55" r="28" className="fill-white dark:fill-dark stroke-slate-800 dark:stroke-white" strokeWidth="6" />
    <path d="M55 45 L55 65 M45 55 L65 55" className="stroke-snGreen" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const App = () => {
  // Global States
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'auth' | 'dashboard' | 'analyzer' | 'history' | 'settings' | 'pricing' | 'payment' | 'subscription' | 'account'>('auth');
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data States
  const [jobProfile, setJobProfile] = useState<JobProfile>(() => storageService.getJobProfile());
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => storageService.getUser());
  const [currentPlanId, setCurrentPlanId] = useState<number>(() => storageService.getPlanId());
  
  // Analyzer States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [batchResults, setBatchResults] = useState<AnalysisResult[]>([]);
  const [inputText, setInputText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<{name: string, input: AnalysisInput}[]>([]);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);
  const [processingIndex, setProcessingIndex] = useState(0);

  // Pricing/Payment States
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wave' | 'orange'>('card');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    if (storageService.isAuthenticated()) {
      setView('dashboard');
    } else {
      setView('auth');
    }
    const timer = setTimeout(() => setIsLoading(false), 2000);
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

  // --- ANALYZER HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const activePlan = PLANS.find(p => p.id === currentPlanId);
    if (!activePlan) {
      setAnalyzerError("Vous devez souscrire à un forfait pour utiliser cette fonctionnalité.");
      setView('pricing');
      return;
    }

    if (files.length > activePlan.maxBatchSize) {
      setAnalyzerError(`Votre forfait actuel limite l'analyse à ${activePlan.maxBatchSize} CVs par session.`);
      return;
    }

    setIsImporting(true);
    setAnalyzerError(null);
    setInputText("");
    setBatchResults([]);
    const newPending: {name: string, input: AnalysisInput}[] = [];

    try {
      // Cast Array.from result to File[] to fix 'unknown' type errors during processing
      for (const file of Array.from(files) as File[]) {
        try {
          if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            newPending.push({ name: file.name, input: { text: result.value } });
          } else if (file.type === "application/pdf" || file.type.startsWith("image/") || file.type === "text/plain") {
            const reader = new FileReader();
            const filePromise = new Promise<{name: string, input: AnalysisInput}>((resolve) => {
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ name: file.name, input: { file: { mimeType: file.type, data: base64 } } });
              };
              reader.readAsDataURL(file);
            });
            newPending.push(await filePromise);
          } else {
            const text = await file.text();
            newPending.push({ name: file.name, input: { text } });
          }
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
        }
      }
      setPendingFiles(newPending);
    } finally {
      setIsImporting(false);
    }
  };

  const handleAnalyze = async () => {
    let inputsToProcess = [...pendingFiles];
    if (inputText.trim() && inputsToProcess.length === 0) {
      inputsToProcess = [{ name: "Saisie manuelle", input: { text: inputText } }];
    }

    if (inputsToProcess.length === 0) {
      setAnalyzerError("Veuillez fournir au moins un CV.");
      return;
    }
    
    const activePlan = PLANS.find(p => p.id === currentPlanId);
    
    if (!activePlan) {
      setAnalyzerError("Vous devez souscrire à un forfait pour utiliser cette fonctionnalité.");
      setView('pricing');
      return;
    }

    if (inputsToProcess.length > activePlan.maxBatchSize) {
      setAnalyzerError(`Votre forfait actuel limite l'analyse à ${activePlan.maxBatchSize} CVs par session.`);
      return;
    }

    if (history.length + inputsToProcess.length > activePlan.maxCvs) {
      setAnalyzerError(`Limite atteinte (${activePlan.maxCvs} CVs).`);
      setView('pricing');
      return;
    }

    setIsAnalyzing(true);
    setCurrentResult(null);
    setBatchResults([]);
    setAnalyzerError(null);
    setProcessingIndex(0);

    try {
      let completedCount = 0;
      const analysisPromises = inputsToProcess.map(async (item) => {
        try {
          const result = await analyzeCandidate(jobProfile, item.input);
          const id = await storageService.saveAnalysis(result);
          const newItem = { ...result, id, timestamp: Date.now() };
          setHistory(prev => [newItem, ...prev]);
          completedCount++;
          setProcessingIndex(completedCount);
          return newItem;
        } catch (err) {
          console.error(`Error analyzing ${item.name}:`, err);
          return null;
        }
      });

      const results = (await Promise.all(analysisPromises)).filter(r => r !== null) as AnalysisResult[];
      
      // Sort results by score descending
      const sortedResults = [...results].sort((a, b) => b.score - a.score);
      setBatchResults(sortedResults);
      if (sortedResults.length > 0) {
        setCurrentResult(sortedResults[0]);
      }
      
      setPendingFiles([]);
      setInputText("");
    } catch (err: any) {
      setAnalyzerError(err.message || "Erreur lors de l'analyse.");
    } finally {
      setIsAnalyzing(false);
      setProcessingIndex(0);
    }
  };

  const handleSaveJobProfile = (profile: JobProfile) => {
    setJobProfile(profile);
    storageService.saveJobProfile(profile);
    setView('dashboard');
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setView('payment');
  };

  const SidebarItem = ({ icon: Icon, label, targetView, active }: any) => (
    <button onClick={() => { setView(targetView); setSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-accent/10 text-accent glow-teal border border-accent/20 dark:border-accent/20' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
      <Icon size={20} /> {label}
    </button>
  );

  const activePlan = PLANS.find(p => p.id === currentPlanId);
  const quotaReached = activePlan ? history.length >= activePlan.maxCvs : true;
  const hasActivePlan = !!activePlan;

  const handleLogout = () => {
    storageService.logout();
    setUserProfile(null);
    setView('auth');
  };

  if (isLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-dark overflow-hidden transition-colors duration-500">
      <div className="relative mb-12 animate-float">
        <div className="w-32 h-44 glass rounded-2xl relative shadow-2xl overflow-hidden animate-scale-in">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`mt-${i===0?6:3} mx-4 h-1.5 w-${[20,24,16,12,22,18][i]} bg-slate-200 dark:bg-white/10 rounded-full`}></div>
          ))}
          <div className="absolute top-0 left-0 w-full h-1 bg-accent glow-teal animate-scan-line z-10"></div>
        </div>
      </div>
      <div className="text-center space-y-4 max-w-xs animate-fade-in">
        <div className="flex items-center justify-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="font-black text-slate-800 dark:text-white text-2xl tracking-tighter uppercase">CV SCREEN AI</span>
        </div>
        <div className="w-48 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-accent animate-progress-loading glow-teal"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-300 ${darkMode ? 'dark bg-dark text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* SIDEBAR BACKDROP (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass border-r border-slate-200 dark:border-white/5 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-200 dark:border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo /> <span className="font-black text-slate-800 dark:text-white text-xl tracking-tighter uppercase">CV SCREEN AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <nav className="p-6 space-y-2">
          <div className="lg:hidden mb-6">
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
            >
              <ArrowLeft size={18} /> Retour
            </button>
          </div>
          <SidebarItem icon={LayoutDashboard} label="Tableau de bord" targetView="dashboard" active={view === 'dashboard'} />
          <SidebarItem icon={Sparkles} label="Analyseur CV" targetView="analyzer" active={view === 'analyzer'} />
          <SidebarItem icon={History} label="Historique" targetView="history" active={view === 'history'} />
          <SidebarItem icon={SettingsIcon} label="Profil Poste" targetView="settings" active={view === 'settings'} />
          <SidebarItem icon={Smartphone} label="Tarifs" targetView="pricing" active={view === 'pricing'} />
          <SidebarItem icon={UserIcon} label="Profil" targetView="account" active={view === 'account'} />
        </nav>
        <div className="absolute bottom-6 w-full px-6">
           <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl text-sm font-bold transition-all">
             <LogOut size={20} /> Déconnexion
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="h-20 glass border-b border-slate-200 dark:border-white/5 px-10 flex items-center justify-between sticky top-0 z-40">
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-white"><Menu size={24}/></button>
              <h2 className="text-sm font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{view}</h2>
           </div>
           <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                 <Zap size={14} className="text-yellow-500" /> {activePlan ? `${history.length} / ${activePlan.maxCvs} CVs` : "Aucun forfait actif"}
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className="p-3 glass rounded-2xl text-accent transition-all hover:scale-110 border border-slate-200 dark:border-white/10 shadow-sm">
                {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
              </button>
           </div>
        </header>

        <main className="p-8 md:p-12 relative min-h-[calc(100vh-80px)]">
          {isAnalyzing && (
            <div className="fixed inset-0 z-50 glass flex items-center justify-center p-6 animate-fade-in">
              <div className="max-w-md w-full text-center space-y-10 animate-scale-in">
                <div className="relative mx-auto h-40 w-40">
                   <div className="absolute inset-0 bg-accent/10 rounded-3xl flex items-center justify-center border border-accent/20 glow-teal">
                      <Cpu size={64} className="text-accent animate-pulse" />
                   </div>
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-accent shadow-[0_0_15px_#14b8a6] animate-scan-line rounded-full"></div>
                </div>
                <div className="space-y-4">
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Traitement IA...</h3>
                   <div className="h-8 overflow-hidden"><p key={loadingMessageIndex} className="text-accent font-bold animate-slide-up uppercase text-sm tracking-widest">{LOADING_MESSAGES[loadingMessageIndex]}</p></div>
                </div>
              </div>
            </div>
          )}

          {view === 'auth' && (
            <AuthView 
              onSuccess={(user) => {
                setUserProfile(user);
                setView('dashboard');
              }} 
            />
          )}

          {view === 'dashboard' && (
            <div className="space-y-12 animate-fade-in max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Tableau de Bord</h1>
                  <p className="text-slate-500 font-bold">Bienvenue sur votre interface de recrutement prédictif.</p>
                  {!hasActivePlan && (
                    <div className="flex items-center gap-2 text-snRed text-xs font-black uppercase tracking-widest bg-snRed/10 px-4 py-2 rounded-full border border-snRed/20">
                      <AlertCircle size={14} /> Forfait inactif - Souscription requise
                    </div>
                  )}
                </div>
                <button onClick={() => setView('analyzer')} className="bg-brand hover:scale-105 text-white px-8 py-4 rounded-2xl font-black shadow-xl transition-all flex items-center gap-3 glow-brand">
                  <Plus size={24}/> NOUVELLE ANALYSE
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Fusion Profil Actif et Total Analyse dans une carte double - GRIS en thème CLAIR, EMERAUDE en thème SOMBRE */}
                <div onClick={() => setView('settings')} className="lg:col-span-2 glass p-8 rounded-3xl group transition-all border border-slate-200 dark:border-white/5 bg-slate-300 dark:bg-emerald-600 text-slate-900 dark:text-white relative overflow-hidden cursor-pointer shadow-xl shadow-slate-400/20 dark:shadow-emerald-500/20 hover:border-slate-400 dark:hover:border-emerald-400/30">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform"><Cpu size={120} /></div>
                  <div className="relative z-10">
                    <p className="text-slate-600 dark:text-white/80 text-[10px] font-black uppercase tracking-widest mb-2">Profil de Poste Actif</p>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter mb-8 leading-tight">{jobProfile.title}</h3>
                    <div className="flex items-center gap-10">
                      <div>
                         <p className="text-slate-600 dark:text-white/70 text-[10px] font-black uppercase tracking-widest">Total Analyses</p>
                         <p className="text-4xl font-black">{history.length}</p>
                      </div>
                      <div className="h-10 w-px bg-slate-400 dark:bg-white/20"></div>
                      <div>
                         <p className="text-slate-600 dark:text-white/70 text-[10px] font-black uppercase tracking-widest">Matchs (8+)</p>
                         <p className="text-4xl font-black text-slate-800 dark:text-white">{history.filter(h => h.score >= 8).length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quota Restant */}
                <div className="glass p-8 rounded-3xl group hover:border-accent/30 transition-all border border-slate-200 dark:border-white/5">
                  <div className={`h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-yellow-600 mb-6`}><Zap size={24} /></div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Quota Restant</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">{activePlan ? Math.max(0, activePlan.maxCvs - history.length) : 0}</p>
                </div>

                {/* Temps Gagné */}
                <div className="glass p-8 rounded-3xl group hover:border-accent/30 transition-all border border-slate-200 dark:border-white/5">
                  <div className={`h-12 w-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-purple-600 mb-6`}><Clock size={24} /></div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Temps Gagné</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">{(history.length * 15)}m</p>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-xl font-black flex items-center gap-4 text-slate-800 dark:text-white uppercase tracking-widest">DERNIÈRES ACTIVITÉS IA</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.length > 0 ? history.slice(0, 6).map(item => (
                    <div key={item.id} onClick={() => { setCurrentResult(item); setView('analyzer'); }} className="glass p-6 rounded-2xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer group transition-all border border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-black text-xl">{item.candidateName[0]}</div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-lg group-hover:text-accent transition-colors">{item.candidateName}</p>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{item.totalExperience}</p>
                        </div>
                      </div>
                      <div className={`px-5 py-2.5 rounded-2xl text-lg font-black ${item.score >= 7 ? 'bg-accent/10 text-accent' : 'bg-red-50 dark:bg-red-400/10 text-red-600 dark:text-red-400'}`}>{item.score}/10</div>
                    </div>
                  )) : (
                    <div className="col-span-full text-center p-20 glass rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center gap-4">
                      <FileText size={48} className="text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-sm">Aucune donnée disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'analyzer' && (
             <div className="max-w-4xl mx-auto space-y-12 animate-fade-in relative">
                {!hasActivePlan && (
                  <div className="absolute inset-0 z-30 glass rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="h-20 w-20 rounded-full bg-snRed/10 flex items-center justify-center text-snRed">
                      <ShieldCheck size={48} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Accès Restreint</h2>
                      <p className="text-slate-500 font-bold max-w-sm">Vous devez souscrire à un forfait CV SCREEN AI pour accéder à l'analyseur neuronal.</p>
                    </div>
                    <button onClick={() => setView('pricing')} className="bg-accent text-dark px-10 py-4 rounded-2xl font-black text-lg shadow-xl glow-teal hover:scale-105 transition-all">
                      VOIR LES FORFAITS
                    </button>
                  </div>
                )}
                <div className={`glass p-12 rounded-[2.5rem] shadow-2xl space-y-10 border border-slate-200 dark:border-white/5 ${!hasActivePlan ? 'blur-sm pointer-events-none' : ''}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 uppercase tracking-tighter"><Sparkles className="text-accent" /> ANALYSEUR IA</h2>
                      <p className="text-slate-500 font-bold">Importez vos CV pour un scoring neuronal immédiat.</p>
                    </div>
                  </div>
                  
                  {analyzerError && <div className="p-5 bg-red-400/10 border border-red-400/20 text-red-500 dark:text-red-400 rounded-2xl text-sm font-bold flex items-center gap-3"><AlertCircle size={20}/> {analyzerError}</div>}
                  
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
                  <div onClick={() => !quotaReached && !isImporting && fileInputRef.current?.click()} className={`border-2 border-dashed border-slate-200 dark:border-white/10 p-20 rounded-[2.5rem] text-center transition-all ${quotaReached || isImporting ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/5 hover:border-accent/50 group'}`}>
                      {isImporting ? (
                        <Loader2 className="mx-auto mb-6 text-accent animate-spin" size={64} />
                      ) : (
                        <Upload className="mx-auto mb-6 text-accent/30 group-hover:text-accent transition-colors" size={64} />
                      )}
                      <p className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-widest">
                        {isImporting ? "LECTURE DES FICHIERS..." : pendingFiles.length > 0 ? `${pendingFiles.length} CV DÉTECTÉS` : "IMPORTER DES CV"}
                      </p>
                      <p className="text-slate-500 font-bold text-xs uppercase">PDF, Word, Images, Text</p>
                  </div>

                  <textarea value={inputText} onChange={e => { setInputText(e.target.value); if (e.target.value) setPendingFiles([]); }} disabled={quotaReached} placeholder="Ou collez le texte ici pour une analyse instantanée..." className="w-full h-44 p-8 glass rounded-2xl outline-none focus:ring-4 focus:ring-accent/20 text-slate-800 dark:text-slate-300 font-medium text-lg border border-slate-200 dark:border-white/5" />
                  
                  <button onClick={handleAnalyze} disabled={isAnalyzing || quotaReached || isImporting || (pendingFiles.length === 0 && !inputText.trim())} className="w-full bg-accent hover:bg-teal-400 text-dark py-6 rounded-2xl font-black text-2xl shadow-2xl glow-teal disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    LANCER LE SCORING
                  </button>
                </div>

                {batchResults.length > 1 && (
                  <div className="space-y-6 animate-fade-in">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-3">
                      <LayoutDashboard className="text-accent" /> COMPARATIF DES CANDIDATS ({batchResults.length})
                    </h3>
                    <div className="glass rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/5 shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rang</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidat</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score Global</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Technique</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Potentiel</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stabilité</th>
                              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expérience</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {batchResults.map((res, idx) => (
                              <tr 
                                key={res.id || idx} 
                                onClick={() => setCurrentResult(res)}
                                className={`group cursor-pointer transition-all hover:bg-accent/5 ${currentResult?.id === res.id ? 'bg-accent/10' : ''}`}
                              >
                                <td className="px-6 py-5">
                                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : idx === 1 ? 'bg-slate-300 text-slate-700' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                                    {idx + 1}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <p className="font-bold text-slate-800 dark:text-white group-hover:text-accent transition-colors">{res.candidateName}</p>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full font-black text-sm ${res.score >= 8 ? 'text-accent bg-accent/10' : res.score >= 6 ? 'text-yellow-600 bg-yellow-50' : 'text-red-500 bg-red-50'}`}>
                                    {res.score}/10
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{res.technicalScore}/10</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{res.potentialScore}/10</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{res.stabilityScore}/10</span>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">{res.totalExperience}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {currentResult && (
                  <div className="space-y-6 animate-fade-in">
                    {batchResults.length > 1 && <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest">DÉTAILS DU CANDIDAT SÉLECTIONNÉ</h3>}
                    <AnalysisCard result={currentResult} />
                  </div>
                )}
             </div>
          )}

          {view === 'pricing' && (
            <div className="max-w-6xl mx-auto space-y-16 animate-fade-in">
               <div className="text-center space-y-4">
                  <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase tracking-widest">OFFRES PREMIUM</h1>
                  <p className="text-slate-500 font-bold text-lg">Activez la pleine puissance de l'IA Screen pour vos recrutements.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {PLANS.map(plan => (
                    <div key={plan.id} className={`glass rounded-[2.5rem] p-10 border-2 flex flex-col transition-all group ${currentPlanId === plan.id ? 'border-brand glow-brand scale-105 bg-brand/5' : 'border-slate-200 dark:border-white/5 hover:border-accent/30'}`}>
                       <h3 className="font-black text-2xl mb-2 text-slate-800 dark:text-white uppercase tracking-tight">{plan.name}</h3>
                       <div className="mb-8"><span className="text-5xl font-black text-slate-900 dark:text-white">{plan.price} FCFA</span><span className="text-slate-500 text-sm font-black ml-2 uppercase tracking-widest">/{plan.limit}</span></div>
                       <ul className="space-y-4 mb-12 flex-1">
                          {plan.features.map((f, i) => (<li key={i} className="flex items-start gap-3 text-xs font-bold text-slate-600 dark:text-slate-400"><Check size={18} className="text-accent shrink-0"/> {f}</li>))}
                       </ul>
                       <button onClick={() => handleSelectPlan(plan)} disabled={currentPlanId === plan.id} className={`w-full py-5 rounded-2xl font-black text-lg transition-all ${currentPlanId === plan.id ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500' : 'bg-brand text-white hover:scale-95 shadow-2xl'}`}>
                         {currentPlanId === plan.id ? 'ACTIF' : 'CHOISIR'}
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'payment' && selectedPlan && (
            <div className="max-w-2xl mx-auto glass p-12 rounded-[3rem] shadow-2xl animate-slide-up border border-slate-200 dark:border-white/5">
               <button onClick={() => setView('pricing')} className="text-slate-500 hover:text-slate-900 dark:hover:text-white mb-10 flex items-center gap-3 font-black uppercase text-xs tracking-widest"><ArrowLeft size={18}/> Retour aux offres</button>
               <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">Finalisation</h2>
               <p className="text-slate-500 font-bold mb-10 uppercase text-xs tracking-widest">Pack {selectedPlan.name} actif pour {selectedPlan.limit}</p>
               <div className="grid grid-cols-3 gap-5 mb-10">
                  {['card', 'wave', 'orange'].map((m: any) => (
                    <button key={m} onClick={() => setPaymentMethod(m)} className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${paymentMethod === m ? 'border-accent bg-accent/10 text-accent glow-teal' : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'}`}>
                      {m === 'card' ? <CreditCard size={32}/> : m === 'wave' ? <Wallet size={32} /> : <Smartphone size={32}/>}
                      <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => { storageService.savePlanId(selectedPlan.id); setCurrentPlanId(selectedPlan.id); setView('dashboard'); setSelectedPlan(null); }} className="w-full bg-accent text-dark py-6 rounded-[1.5rem] font-black text-2xl flex items-center justify-center gap-4 glow-teal hover:scale-95 transition-all"><ShieldCheck size={28}/> PAYER {selectedPlan.price} FCFA</button>
            </div>
          )}

          {view === 'account' && userProfile && (
            <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
               <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Profil Analyste</h1>
               <div className="glass p-12 rounded-[3rem] space-y-10 border border-slate-200 dark:border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4"><label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Identité</label><input type="text" value={userProfile.name} onChange={e => setUserProfile({...userProfile, name: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-accent/20 font-medium text-lg" /></div>
                     <div className="space-y-4"><label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Email</label><input type="text" value={userProfile.email} disabled className="w-full p-5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 outline-none font-medium text-lg cursor-not-allowed" /></div>
                  </div>
                  <button onClick={() => storageService.updateUser(userProfile)} className="bg-brand text-white px-12 py-5 rounded-[1.5rem] font-black hover:scale-105 transition-all flex items-center gap-4 shadow-2xl text-lg"><Save size={24}/> SAUVEGARDER LES MODIFICATIONS</button>
               </div>

               <div className="glass p-12 rounded-[3rem] border border-slate-200 dark:border-white/5 space-y-6">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Support Technique</h3>
                  <p className="text-slate-500 font-bold">Besoin d'aide ou d'une assistance personnalisée ? Contactez notre équipe d'experts.</p>
                  <div className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="h-12 w-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                      <Mail size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email de l'équipe HR</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">nainguemame@gmail.com</p>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {view === 'history' && (
            <div className="max-w-7xl mx-auto space-y-10 animate-fade-in">
               <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Répertoire d'Analyse</h1>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {history.map(item => (
                     <div key={item.id} onClick={() => { setCurrentResult(item); setView('analyzer'); }} className="glass p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-accent/30 cursor-pointer transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><FileText size={100} className="text-slate-900 dark:text-white" /></div>
                        <div className="flex justify-between items-start mb-8 relative z-10">
                           <h4 className="font-black text-slate-900 dark:text-white text-2xl tracking-tight">{item.candidateName}</h4>
                           <span className={`px-5 py-2 rounded-2xl text-sm font-black ${item.score >= 7 ? 'bg-accent/10 text-accent' : 'bg-red-50 dark:bg-red-400/10 text-red-600 dark:text-red-400'}`}>{item.score}/10</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-500 line-clamp-3 font-medium leading-relaxed mb-8">{item.summary}</p>
                        <div className="flex items-center gap-3 text-xs font-black text-accent uppercase tracking-widest group-hover:gap-6 transition-all">Détails de l'analyse <ChevronRight size={18}/></div>
                     </div>
                  ))}
               </div>
               {history.length === 0 && <div className="text-center p-20 glass rounded-[3rem] border-dashed border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-700 font-black uppercase tracking-widest">Aucune analyse enregistrée</div>}
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
