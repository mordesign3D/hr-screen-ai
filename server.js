
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { Resend } from 'resend';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialisation des services avec les clés du .env
// Note : Vercel injecte ces variables si elles sont configurées dans le dashboard
const resend = new Resend(process.env.RESEND_API_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

// Route pour envoyer le code de validation par email
app.post('/api/send-code', async (req, res) => {
  const { email, name } = req.body;
  
  if (!email) return res.status(400).json({ error: "Email manquant" });

  const code = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    const { data, error } = await resend.emails.send({
      from: 'HR Screen AI <onboarding@resend.dev>',
      to: [email],
      subject: 'Votre code de validation - HR Screen AI',
      html: `
        <div style="font-family: sans-serif; padding: 40px; color: #334155; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #4f46e5; text-align: center; font-size: 24px;">Validation de votre compte</h2>
            <p>Bonjour <strong>${name || 'Recruteur'}</strong>,</p>
            <p>Merci d'utiliser HR Screen AI. Voici votre code de validation sécurisé :</p>
            <div style="background: #eef2ff; padding: 30px; border-radius: 16px; text-align: center; font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #4338ca; margin: 30px 0; border: 2px dashed #c7d2fe;">
              ${code}
            </div>
            <p style="font-size: 14px; color: #64748b; text-align: center;">Ce code expirera dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">© 2025 HR Screen AI. Technologie Propulsée par Gemini 2.5 Flash.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return res.status(400).json({ error: "Erreur lors de l'envoi du mail." });
    }

    res.json({ success: true, code });
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Erreur interne du serveur lors de l'envoi." });
  }
});

// Important pour Vercel : n'écouter que si on n'est pas dans l'environnement de production serverless
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`🚀 Backend prêt sur http://localhost:${port}`);
  });
}

// Export de l'application pour Vercel Serverless Functions
export default app;
