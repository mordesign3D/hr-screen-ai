
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
      score: { type: Type.NUMBER, description: "Note sur 10 basée sur l'adéquation au poste" },
      summary: { type: Type.STRING, description: "Synthèse professionnelle courte" },
      matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Compétences trouvées" },
      missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Compétences manquantes par rapport au profil" },
      softSkillsDetected: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Soft skills identifiés" }
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

  try {
    const parts: any[] = [];
    if (input.file) {
      parts.push({
        inlineData: {
          mimeType: input.file.mimeType,
          data: input.file.data,
        },
      });
      parts.push({ text: "Analyse ce CV par rapport au profil de poste." });
    } else if (input.text) {
      parts.push({ text: `Voici le contenu du CV :\n\n${input.text}\n\nAnalyse-le par rapport au profil de poste.` });
    } else {
      throw new Error("Aucun contenu fourni pour l'analyse.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    if (!response.text) {
      throw new Error("Gemini n'a pas retourné de texte.");
    }

    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
