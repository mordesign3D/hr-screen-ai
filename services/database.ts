
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(DATA_DIR, 'db.json');

interface User {
  name: string;
  email: string;
  password?: string;
  verified: boolean;
  code?: string;
}

interface AnalysisResult {
  candidateName: string;
  totalExperience: string;
  score: number;
  technicalScore: number;
  potentialScore: number;
  stabilityScore: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  softSkillsDetected: string[];
  weakSignals?: string[];
}

interface AnalysisHistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
  userEmail: string;
}

interface DatabaseSchema {
  users: Record<string, User>;
  history: AnalysisHistoryItem[];
}

class Database {
  private data: DatabaseSchema = { users: {}, history: [] };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_PATH)) {
      try {
        const content = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(content);
        if (!this.data.history) this.data.history = [];
      } catch (error) {
        console.error("Error reading database:", error);
        this.data = { users: {}, history: [] };
      }
    } else {
      this.save();
    }

    // Seed Admin User
    const adminEmail = "nianguemame@gmail.com";
    if (!this.getUser(adminEmail)) {
      this.saveUser({
        name: "Administrateur HR",
        email: adminEmail,
        password: "Mortuto2",
        verified: true
      });
      console.log(`✅ Admin user seeded: ${adminEmail}`);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error("Error saving database:", error);
    }
  }

  // User methods
  getUser(email: string): User | undefined {
    return this.data.users[email];
  }

  saveUser(user: User) {
    this.data.users[user.email] = user;
    this.save();
  }

  updateUser(email: string, updates: Partial<User>) {
    if (this.data.users[email]) {
      this.data.users[email] = { ...this.data.users[email], ...updates };
      this.save();
    }
  }

  deleteUser(email: string) {
    delete this.data.users[email];
    this.save();
  }

  // History methods
  saveAnalysis(item: AnalysisHistoryItem) {
    this.data.history.unshift(item);
    this.save();
  }

  getHistory(email: string): AnalysisHistoryItem[] {
    return this.data.history.filter(item => item.userEmail === email);
  }
}

export const db = new Database();
