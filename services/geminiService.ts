
import { GoogleGenAI, Type } from "@google/genai";
import { JobProfile, AnalysisResult } from "../types";

export interface AnalysisInput {
  text?: string;
  file?: {
    mimeType: string;
    data: string; // base64 encoded string
  };
}

export const analyzeCandidate = async (
  jobProfile: JobProfile,
  input: AnalysisInput
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      candidateName: { type: Type.STRING, description: "Nom complet du candidat" },
      totalExperience: { type: Type.STRING, description: "Nombre d'années d'expérience totale" },
      technicalScore: { type: Type.NUMBER, description: "Note sur 10 de l'adéquation technique (Savoir-faire)" },
      potentialScore: { type: Type.NUMBER, description: "Note sur 10 du potentiel d'évolution (Soft skills)" },
      stabilityScore: { type: Type.NUMBER, description: "Note sur 10 de la stabilité (Durée des expériences)" },
      score: { type: Type.NUMBER, description: "Note globale finale sur 10" },
      summary: { type: Type.STRING, description: "Synthèse professionnelle détaillée commençant par le rappel des 3 scores" },
      matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Compétences trouvées" },
      missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Compétences manquantes" },
      softSkillsDetected: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Soft skills identifiés" },
      weakSignals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Signaux faibles" }
    },
    required: ["candidateName", "score", "technicalScore", "potentialScore", "stabilityScore", "summary", "matchedSkills", "missingSkills", "totalExperience", "softSkillsDetected", "weakSignals"]
  };

  const systemInstruction = `
    Vous êtes un Analyste RH senior expert. Votre mission est d'évaluer un CV pour le poste de "${jobProfile.title}".
    
    SCORING MULTI-CRITÈRES (Obligatoire) :
    Notez séparément de 0 à 10 les dimensions suivantes :
    1. ADÉQUATION TECHNIQUE : Correspondance directe avec les compétences techniques (${jobProfile.requiredSkills.join(", ")}).
    2. POTENTIEL D'ÉVOLUTION : Évaluation des soft skills, de la curiosité intellectuelle et de la capacité à progresser.
    3. STABILITÉ : Analyse de la fidélité aux entreprises (durée moyenne des postes > 2 ans = stable).

    CALIBRATION :
    - CANDIDAT IDÉAL (9-10/10 partout) : Expérience > ${jobProfile.minExperience + 2} ans, progression rapide, stable et prestigieux.
    - CANDIDAT MOYEN (5-6/10) : Juste le minimum d'expérience, instabilité modérée ou manque de hard skills clés.

    STRUCTURE DE LA SYNTHÈSE (summary) :
    Commencez toujours votre texte par une ligne récapitulative : 
    "SCORES : Technique: X/10 | Potentiel: X/10 | Stabilité: X/10"
    Puis développez votre analyse incluant les signaux faibles (dates, vélocité, prestige).
  `;

  try {
    const parts: any[] = [];
    if (input.file) {
      parts.push({
        inlineData: {
          mimeType: input.file.mimeType,
          data: input.file.data,
        },
      });
      parts.push({ text: "Analyse ce CV selon le scoring multi-critères : Technique, Potentiel et Stabilité." });
    } else if (input.text) {
      parts.push({ text: `Contenu du CV :\n\n${input.text}\n\nApplique le scoring multi-critères.` });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    if (!response.text) {
      throw new Error("Gemini n'a pas retourné de résultat.");
    }

    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};