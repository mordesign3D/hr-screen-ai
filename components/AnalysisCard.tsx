import React from 'react';
import { AnalysisResult } from '../types';
import { CheckCircle, XCircle, User, Briefcase, Award, Download, FileText } from 'lucide-react';
// @ts-ignore
import { jsPDF } from "jspdf";

interface AnalysisCardProps {
  result: AnalysisResult;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text("Rapport d'analyse - HR Screen AI", margin, y);
      y += 15;

      // Candidate Info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Candidat : ${result.candidateName}`, margin, y);
      y += 8;
      doc.text(`Expérience : ${result.totalExperience}`, margin, y);
      y += 8;
      
      // Score
      doc.text(`Score : ${result.score}/10`, margin, y);
      y += 15;

      // Summary
      doc.setFontSize(14);
      doc.setTextColor(50, 50, 50);
      doc.text("Synthèse", margin, y);
      y += 8;
      
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      const splitSummary = doc.splitTextToSize(result.summary, pageWidth - (margin * 2));
      doc.text(splitSummary, margin, y);
      y += (splitSummary.length * 6) + 15;

      // Matched Skills
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74); // Green
      doc.text("Compétences Validées", margin, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const matched = result.matchedSkills.length > 0 ? result.matchedSkills.join(", ") : "Aucune";
      const splitMatched = doc.splitTextToSize(matched, pageWidth - (margin * 2));
      doc.text(splitMatched, margin, y);
      y += (splitMatched.length * 6) + 15;

      // Missing Skills
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38); // Red
      doc.text("Compétences Manquantes", margin, y);
      y += 8;

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const missing = result.missingSkills.length > 0 ? result.missingSkills.join(", ") : "Aucune";
      const splitMissing = doc.splitTextToSize(missing, pageWidth - (margin * 2));
      doc.text(splitMissing, margin, y);
      y += (splitMissing.length * 6) + 15;

      // Soft Skills
      if (result.softSkillsDetected.length > 0) {
         doc.setFontSize(14);
         doc.setTextColor(79, 70, 229); // Indigo
         doc.text("Soft Skills", margin, y);
         y += 8;
   
         doc.setFontSize(11);
         doc.setTextColor(0, 0, 0);
         const soft = result.softSkillsDetected.join(", ");
         const splitSoft = doc.splitTextToSize(soft, pageWidth - (margin * 2));
         doc.text(splitSoft, margin, y);
      }

      const filename = `Analyse_${result.candidateName.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error("PDF Export Error", e);
      alert("Erreur lors de la génération du PDF");
    }
  };

  const handleExportCSV = () => {
    try {
        const headers = ["Nom", "Expérience", "Score", "Synthèse", "Compétences Validées", "Compétences Manquantes", "Soft Skills"];
        const row = [
            result.candidateName,
            result.totalExperience,
            result.score,
            result.summary,
            result.matchedSkills.join("; "),
            result.missingSkills.join("; "),
            result.softSkillsDetected.join("; ")
        ];
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for Excel compatibility
            + headers.join(",") + "\n" 
            + row.map(e => `"${e.toString().replace(/"/g, '""')}"`).join(",");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `analyse_${result.candidateName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("CSV Export Error", e);
        alert("Erreur lors de l'export CSV");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{result.candidateName || "Candidat Inconnu"}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Briefcase size={14} />
                <span>Expérience: {result.totalExperience}</span>
              </div>
            </div>
          </div>
          <div className={`flex flex-col items-center justify-center h-16 w-16 rounded-full border-4 ${getScoreColor(result.score).split(' ').find(c => c.startsWith('border-'))} ${getScoreColor(result.score).split(' ').find(c => c.startsWith('dark:border-'))}`}>
              <span className={`text-xl font-bold ${getScoreColor(result.score).split(' ').find(c => c.startsWith('text-'))} ${getScoreColor(result.score).split(' ').find(c => c.startsWith('dark:text-'))}`}>{result.score}</span>
              <span className="text-[10px] font-medium text-slate-400">/10</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-2">
            <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Exporter en CSV"
            >
                <FileText size={14} className="text-green-600" />
                CSV
            </button>
            <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Télécharger en PDF"
            >
                <Download size={14} className="text-red-500" />
                PDF
            </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className={`p-4 rounded-lg border ${getScoreColor(result.score)}`}>
            <h3 className="text-sm font-semibold mb-1 opacity-80 uppercase tracking-wider dark:text-slate-200">Synthèse de l'IA</h3>
            <p className="text-sm font-medium leading-relaxed dark:text-slate-300">{result.summary}</p>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Matched Skills */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
              Compétences Validées
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.matchedSkills && result.matchedSkills.length > 0 ? (
                result.matchedSkills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-md font-medium border border-green-200 dark:border-green-800">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Aucune compétence majeure détectée</span>
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <XCircle size={16} className="text-red-500 dark:text-red-400" />
              Compétences Manquantes
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.missingSkills && result.missingSkills.length > 0 ? (
                result.missingSkills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-md font-medium border border-red-100 dark:border-red-900">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Aucune lacune majeure</span>
              )}
            </div>
          </div>
        </div>

        {/* Soft Skills */}
        {result.softSkillsDetected && result.softSkillsDetected.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Award size={16} className="text-indigo-500 dark:text-indigo-400" />
              Soft Skills Détectés
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.softSkillsDetected.map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded-full font-medium border border-indigo-100 dark:border-indigo-800">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisCard;