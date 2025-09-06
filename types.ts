export interface DifficultyRange {
  id: string;
  to: number; // The end of the range (e.g., for questions 1-5, 'to' would be 5)
  difficulty: 'mudah' | 'sedang' | 'sulit';
}

export interface FormState {
  subject: string;
  topic: string;
  sourceMaterial: string;
  mcqCount: number;
  essayCount: number;
  difficultyRanges: DifficultyRange[];
}

export interface MCQ {
  id: string;
  type: 'mcq';
  question: string;
  options: string[];
  answer: string;
}

export interface Essay {
  id: string;
  type: 'essay';
  question: string;
  answer: string; // Answer guideline
}

export type Question = MCQ | Essay;

export interface ExamData {
  mcqs: MCQ[];
  essays: Essay[];
}
