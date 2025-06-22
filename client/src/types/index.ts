import type { ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

export interface LoginCredentials {
  login: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  points: number;
}

export interface TestCaseResult {
  testCase: number;
  passed: boolean;
  isPublic: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  runtime?: number;
  statusDescription?: string;
  stderr?: string | null;
}

export interface SubmissionResult {
  submissionId: string;
  status: 'PENDING' | 'ACCEPTED' | 'WRONG_ANSWER' | 'TLE' | 'MLE' | 'RE' | 'CE';
  points?: number;
  score?: number;
  runtime: number;
  memory: number;
  passedTests: number;
  totalTests: number;
  errorMessage?: string | null;
  results: TestCaseResult[];
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  acceptanceRate?: number;
  totalSubmissions?: number;
  testCases?: TestCase[];
  tags: string[];
}

export interface ContestProblem {
  contestId: string;
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  timeLimit: number;
  memoryLimit: number;
  points: number;
  tags?: string[] | null;
  isVisible: boolean;
  releaseTime?: string | null;
  testCases: TestCase[];
}

export interface ProblemStats {
  totalProblems: number;
  totalSolved: number;
  totalSubmissions: number;
  averageAcceptanceRate: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<ApiResponse<{ token: string; user: User }>>;
  register: (userData: RegisterData) => Promise<ApiResponse<{ token: string; user: User }>>;
  logout: () => void;
  loading: boolean;
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface ProtectedRouteProps {
  children: ReactNode;
}

export interface Contest {
  id: string;
  title: string;
  slug: string;
  description?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  _count: {
    contestProblems: number;
    submissions: number;
  };
}

export interface ContestDetail extends Omit<Contest, '_count'> {
  contestProblems: ContestProblem[];
  _count: {
    submissions: number;
  };
}
