
export type Role = 'teacher' | 'student' | 'parent';
export type QuestionType = 'multiple_choice' | 'matching' | 'fill_blank' | 'true_false' | 'essay' | 'ordering';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  student_count?: number;
}

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  class_id: string;
  avatar_url?: string;
  managed_classes?: ClassInfo[];
  student_id?: string;
  password?: string;
}

export interface GradeColumn {
  id: string;
  class_id: string;
  name: string;
  max_score: number;
  weight: number; 
  type: 'manual' | 'assignment';
}

export interface GradebookData {
  columns: GradeColumn[];
  students: {
    id: string;
    name: string;
    grades: Record<string, number>; 
    total_points?: number;
    avatar_url?: string;
  }[];
}

export interface Behavior {
  id: string;
  class_id: string;
  name: string;
  points: number;
  icon: string;
}

export interface Seat {
  student_id: string;
  row: number;
  col: number;
}

export interface ClassToolsData {
  behaviors: Behavior[];
  seats: Seat[];
  students: { id: string; name: string; total_points?: number; avatar_url?: string }[];
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  matchingPairs?: { left: string; right: string }[];
  topic?: string;
  difficulty?: Difficulty;
  score?: number; 
}

export interface QuestionBankItem {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  category: string;
  correct_answer: string;
  explanation?: string;
  options_json?: any;
  teacher_id: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  deadline: string;
  questions_json: string;
  type: 'Quiz' | 'Writing' | 'Homework';
  max_attempts: number; 
  attempt_count?: number;
  last_submission?: Submission;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  score: number;
  total_possible_score: number;
  auto_score: number;
  status: 'Pending' | 'Submitted' | 'Graded';
  is_essay_confirmed: boolean;
  answers_json: string;
  timestamp: number;
  file_url?: string;
  teacher_comments?: string;
}

export interface FeedComment {
  id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  timestamp: number;
}

export interface FeedItem {
  id: string;
  class_id: string;
  author_name: string;
  author_role: Role;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  timestamp: string | number;
  likes_count: number;
  is_pinned: boolean;
  comments_json?: FeedComment[];
}
