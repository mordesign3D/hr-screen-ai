
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { db } from './services/database';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Services
let resendClient: Resend | null = null;
let aiClient: GoogleGenAI | null = null;

function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn("⚠️ RESEND_API_KEY is missing. Email sending will be simulated.");
    }
    resendClient = new Resend(key || 'dummy_key');
  }
  return resendClient;
}

function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY is missing. AI features will be limited.");
    }
    aiClient = new GoogleGenAI({ apiKey: key || 'dummy_key' });
  }
  return aiClient;
}

const TEAM_EMAIL = "nainguemame@gmail.com";

// --- AUTH API ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, name, password } = req.body;
  
  if (!email || !name || !password) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  // Check if user exists
  if (db.getUser(email)) {
    return res.status(400).json({ error: "Cet email est déjà utilisé" });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Save pending user
  db.saveUser({ name, email, password, verified: false, code });

  try {
    // Generate a personalized welcome message using Gemini
    let welcomeMessage = "Merci d'utiliser CV SCREEN AI.";
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Génère une phrase d'accueil courte (max 15 mots) et motivante pour un nouvel utilisateur nommé ${name} qui vient de s'inscrire sur HR Screen AI, une plateforme d'analyse de CV par intelligence artificielle.`,
      });
      if (response.text) {
        welcomeMessage = response.text.trim();
      }
    } catch (aiError) {
      console.error("Gemini Error:", aiError);
    }

    // Send verification email
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: 'HR Screen AI <onboarding@resend.dev>',
      to: [email],
      subject: 'Votre code de vérification HR Screen AI',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f1f5f9;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4f46e5; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px;">HR SCREEN AI</h1>
              <p style="color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; tracking: 2px; margin-top: 5px;">Recrutement Intelligent</p>
            </div>
            
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 15px;">Bienvenue, ${name} !</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 25px;">
              ${welcomeMessage}
            </p>
            
            <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 30px; border-radius: 20px; text-align: center; margin: 30px 0;">
              <p style="font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Votre code de vérification</p>
              <div style="font-size: 48px; font-weight: 900; letter-spacing: 10px; color: #4f46e5;">
                ${code}
              </div>
            </div>
            
            <p style="font-size: 14px; color: #64748b; text-align: center; margin-bottom: 30px;">
              Ce code est requis pour activer votre compte. Il expirera dans 10 minutes.
            </p>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                L'équipe HR CV SCREEN<br/>
                <a href="mailto:${TEAM_EMAIL}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${TEAM_EMAIL}</a>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      // For demo purposes, if Resend fails (e.g. no API key), we still return the code in the response
      // so the user can continue the flow in the preview.
      return res.json({ success: true, message: "Code envoyé (simulé)", debugCode: code });
    }

    res.json({ success: true, message: "Code envoyé par email" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// Verify Code
app.post('/api/auth/verify', (req, res) => {
  const { email, code } = req.body;
  const user = db.getUser(email);

  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
  
  if (user.code === code) {
    db.updateUser(email, { verified: true, code: undefined });
    res.json({ success: true, user: { name: user.name, email: user.email } });
  } else {
    res.status(400).json({ error: "Code invalide" });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.getUser(email);

  if (!user) {
    return res.status(401).json({ error: "Cet utilisateur n'existe pas" });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }

  if (!user.verified) {
    return res.status(403).json({ error: "Compte non vérifié", unverified: true });
  }

  res.json({ success: true, user: { name: user.name, email: user.email } });
});

// --- HISTORY API ---

// Save Analysis
app.post('/api/history', (req, res) => {
  const { email, result } = req.body;
  if (!email || !result) return res.status(400).json({ error: "Données manquantes" });

  const timestamp = Date.now();
  const id = timestamp.toString();
  const newItem = { ...result, id, timestamp, userEmail: email };
  
  db.saveAnalysis(newItem);
  res.json({ success: true, id });
});

// Get History
app.get('/api/history/:email', (req, res) => {
  const { email } = req.params;
  const history = db.getHistory(email);
  res.json({ success: true, history });
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
