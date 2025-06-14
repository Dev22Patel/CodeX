import type { ApiResponse, LoginCredentials, Problem, ProblemStats, RegisterData, User } from '../types/index';

const API_BASE_URL = 'http://localhost:3000/api';

export const api = {
  register: async (userData: RegisterData): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return response.json();
  },

  getProfile: async (token: string): Promise<ApiResponse<{ user: User }>> => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getProblems: async (): Promise<ApiResponse<{ problems: Problem[] }>> => {
    const response = await fetch(`${API_BASE_URL}/problems`);
    return response.json();
  },

  getProblem: async (identifier: string): Promise<ApiResponse<Problem>> => {
    const response = await fetch(`${API_BASE_URL}/problems/${identifier}`);
    return response.json();
  },

  getProblemStats: async (): Promise<ApiResponse<ProblemStats>> => {
    const response = await fetch(`${API_BASE_URL}/problems/stats`);
    return response.json();
  },

//   submitSolution: async (
//     problemId: string,
//     code: string,
//     token: string
//   ): Promise<ApiResponse<{ passed: boolean; results: { testCaseId: string; passed: boolean; output: string }[] }>> => {
//     const response = await fetch(`${API_BASE_URL}/submissions`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({ problemId, code }),
//     });
//     return response.json();
//   },

  async submitSolution(problemId:string, code:string, token:string, languageId:string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/submissions/submit/${problemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        code,
        languageId // Make sure to pass the language UUID
      })
    });

    return await response.json();
  },

  // Get submission status
  async getSubmissionStatus(submissionId:string, token:string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/submissions/status/${submissionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return await response.json();
  },

  // Get user submissions for a problem
  async getUserSubmissions(problemId:string, token:string, page = 1, limit = 10): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/submissions/problem/${problemId}?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return await response.json();
  }
};
