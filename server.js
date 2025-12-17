
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- CONFIGURATION FIREBASE ---
let db;
try {
  // Vérifie si le fichier de clé existe
  if (fs.existsSync('./serviceAccountKey.json')) {
    const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore();
    console.log("✅ Base de données Google Firestore connectée !");
  } else {
    console.warn("⚠️ ATTENTION: Fichier 'serviceAccountKey.json' introuvable.");
    console.warn("   L'application fonctionne mais ne sauvegardera pas dans la base de données.");
    console.warn("   Téléchargez la clé depuis la console Firebase.");
  }
} catch (error) {
  console.error("Erreur d'initialisation Firebase:", error);
}

// --- CONFIGURATION GEMINI ---
// Use process.env.API_KEY directly in the constructor as per the latest @google/genai guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('HR Screen AI Backend is running');
});

// Récupérer l'historique depuis la DB
app.get('/api/history', async (req, res) => {
  try {
    if (!db) return res.json([]); // Si pas de DB, renvoie vide (ou fallback local)

    const snapshot = await db.collection('analyses')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
      
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(history);
  } catch (error) {
    console.error("Erreur lecture DB:", error);
    res.status(500).json({ error: "Impossible de lire l'historique" });
  }
});

// Analyser et Sauvegarder
app.post('/api/analyze', async (req, res) => {
  try {
    const { jobProfile, text, file } = req.body;

    if (!jobProfile) return res.status(400).json({ error: "Profil de poste manquant" });

    // 1. ANALYSE GEMINI
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        candidateName: { type: Type.STRING },
        totalExperience: { type: Type.STRING },
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        softSkillsDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["candidateName", "score", "summary", "matchedSkills", "missingSkills", "totalExperience", "softSkillsDetected"]
    };

    const systemInstruction = `
      Vous êtes un Analyste RH senior spécialisé dans le recrutement pour le rôle de "${jobProfile.title}".
      Votre tâche est d'analyser le CV fourni par rapport aux critères suivants :
      - Expérience minimale : ${jobProfile.minExperience} ans
      - Niveau d'étude : ${jobProfile.educationLevel} en ${jobProfile.fieldOfStudy}
      - Compétences clés : ${jobProfile.requiredSkills.join(", ")}
      - Langues : ${jobProfile.languages.join(", ")}

      Soyez rigoureux mais juste dans votre notation (score/10).
    `;

    const parts = [];
    if (file && file.data) {
      parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
      parts.push({ text: "Analysez ce CV ci-joint." });
    } else if (text) {
      parts.push({ text: `Voici le contenu du CV à analyser :\n\n${text}` });
    } else {
      return res.status(400).json({ error: "Aucun contenu à analyser." });
    }

    // Use gemini-3-flash-preview for text analysis tasks and proper access to response.text property
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      }
    });

    // Extract generated text from the response using the .text property
    const result = JSON.parse(response.text);

    // 2. SAUVEGARDE EN BASE DE DONNÉES (Si connectée)
    let savedId = Date.now().toString(); // ID par défaut temporaire
    
    if (db) {
      const docRef = await db.collection('analyses').add({
        ...result,
        jobTitle: jobProfile.title, // On ajoute le contexte du poste
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      });
      savedId = docRef.id;
      console.log(`Analyse sauvegardée en DB avec l'ID: ${savedId}`);
    }

    // On renvoie le résultat enrichi de l'ID (pour le frontend)
    res.json({ ...result, id: savedId, timestamp: Date.now() });

  } catch (error) {
    console.error("Erreur Backend:", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Serveur backend lancé sur http://localhost:${port}`);
});
