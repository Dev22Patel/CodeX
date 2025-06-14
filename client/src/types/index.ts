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
}

export interface TestCaseResult {
  id: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'ERROR';
  executionTime?: number;
  memory?: number;
}

export interface SubmissionResult {
  status: 'PENDING' | 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR';
  score: number;
  testCases: TestCaseResult[];
  totalTestCases: number;
  passedTestCases: number;
  executionTime?: number;
  memory?: number;
  errorMessage?: string;
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
