import { JobProfile } from "./types";

export const DEFAULT_JOB_PROFILE: JobProfile = {
  title: "Développeur Full-Stack Senior",
  minExperience: 5,
  educationLevel: "Bac+5 / Master",
  fieldOfStudy: "Informatique",
  languages: ["Français", "Anglais Technique"],
  requiredSkills: ["Python", "Django", "Flask", "SQL", "React", "TypeScript"],
  softSkills: ["Travail d'équipe", "Autonomie", "Communication", "Leadership"]
};

export const MOCK_CV_TEXT = `Jean Dupont
Paris, France | jean.dupont@email.com

PROFIL
Développeur Full-Stack passionné avec 6 ans d'expérience dans la création d'applications web robustes. Expert en Python et JavaScript.

EXPÉRIENCE PROFESSIONNELLE

Senior Backend Developer | TechCorp (2020 - Présent)
- Développement d'API REST avec Django et Django Rest Framework.
- Optimisation des requêtes SQL (PostgreSQL) réduisant le temps de chargement de 40%.
- Mentoring de 3 développeurs juniors.
- Mise en place de pipelines CI/CD.

Développeur Web | WebAgency (2017 - 2020)
- Création de sites e-commerce avec Flask et Vue.js.
- Gestion de bases de données MySQL.
- Collaboration étroite avec les designers et les chefs de projet.

COMPÉTENCES TECHNIQUES
- Langages: Python, JavaScript, TypeScript, SQL
- Frameworks: Django, Flask, React, Vue.js
- Outils: Docker, Git, AWS

FORMATION
Master Informatique - Université de Paris (2017)

LANGUES
Français (Natif), Anglais (Courant)`;