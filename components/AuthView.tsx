
import React, { useState } from 'react';
import { Mail, Lock, User, ShieldCheck, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { storageService, UserProfile } from '../services/storageService';

interface AuthViewProps {
  onSuccess: (user: UserProfile) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (!validateEmail(email)) {
      setError("Format d'email invalide");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await response.json();
      if (data.success) {
        setMode('verify');
        if (data.debugCode) setDebugCode(data.debugCode);
      } else {
        setError(data.error || "Erreur lors de l'inscription");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      if (data.success) {
        storageService.updateUser(data.user);
        onSuccess(data.user);
      } else {
        setError(data.error || "Code invalide");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (!validateEmail(email)) {
      setError("Format d'email invalide");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
        storageService.updateUser(data.user);
        onSuccess(data.user);
      } else if (data.unverified) {
        setMode('verify');
        setError("Veuillez vérifier votre compte");
      } else {
        setError(data.error || "Identifiants invalides");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md glass p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 space-y-8 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Inscription' : 'Vérification'}
          </h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">
            {mode === 'login' ? 'Accédez à votre espace analyste' : mode === 'signup' ? 'Créez votre compte professionnel' : 'Entrez le code reçu par email'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm font-bold animate-shake">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Professionnel</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-accent/20 font-medium"
                  placeholder="nom@entreprise.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-accent/20 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button 
              disabled={loading}
              className="w-full bg-accent text-dark py-4 rounded-2xl font-black text-lg shadow-xl glow-teal hover:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'SE CONNECTER'}
            </button>
            <p className="text-center text-sm font-bold text-slate-500">
              Pas de compte ? <button type="button" onClick={() => setMode('signup')} className="text-accent hover:underline">S'inscrire</button>
            </p>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nom Complet</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-accent/20 font-medium"
                  placeholder="Prénom Nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Professionnel</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-accent/20 font-medium"
                  placeholder="nom@entreprise.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-accent/20 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button 
              disabled={loading}
              className="w-full bg-brand text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : "CRÉER MON COMPTE"}
            </button>
            <p className="text-center text-sm font-bold text-slate-500">
              Déjà inscrit ? <button type="button" onClick={() => setMode('login')} className="text-accent hover:underline">Se connecter</button>
            </p>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-6 text-center">
            <div className="p-6 bg-accent/5 rounded-3xl border border-accent/20 space-y-4">
              <CheckCircle2 className="mx-auto text-accent" size={48} />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Un code de validation à 6 chiffres a été envoyé à <br/>
                <span className="text-accent">{email}</span>
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code de validation (6 chiffres)</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center py-6 bg-slate-50 dark:bg-dark border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-accent/20 font-black text-4xl tracking-[1rem]"
                placeholder="000000"
              />
            </div>

            {debugCode && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-600 text-xs font-bold">
                DEBUG: Code reçu: {debugCode}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-accent text-dark py-4 rounded-2xl font-black text-lg shadow-xl glow-teal hover:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'VÉRIFIER LE CODE'}
            </button>
            
            <button type="button" onClick={() => setMode('signup')} className="text-slate-500 text-xs font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors">
              Retour à l'inscription
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthView;
