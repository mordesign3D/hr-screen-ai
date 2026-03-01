
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { db } from './services/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Services
const resend = new Resend(process.env.RESEND_API_KEY);
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
    // Send verification email
    const { data, error } = await resend.emails.send({
      from: 'CV SCREEN AI <onboarding@resend.dev>',
      to: [email],
      subject: 'Votre code de validation - CV SCREEN AI',
      html: `
        <div style="font-family: sans-serif; padding: 40px; color: #334155; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #4f46e5; text-align: center; font-size: 24px;">Validation de votre compte</h2>
            <p>Bonjour <strong>${name}</strong>,</p>
            <p>Merci d'utiliser CV SCREEN AI. Voici votre code de validation sécurisé à 6 chiffres :</p>
            <div style="background: #eef2ff; padding: 30px; border-radius: 16px; text-align: center; font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #4338ca; margin: 30px 0; border: 2px dashed #c7d2fe;">
              ${code}
            </div>
            <p style="font-size: 14px; color: #64748b; text-align: center;">Ce code est requis pour activer votre compte.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">L'équipe HR CV SCREEN (${TEAM_EMAIL})</p>
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
