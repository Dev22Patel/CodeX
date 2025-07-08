import type { ApiResponse, LoginCredentials, Problem, ProblemStats, RegisterData, User, ContestProblem, SubmissionResult } from '../types/index';

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

  // Updated getProblems function in your api.js file
getProblems: async (token?: string): Promise<ApiResponse<{ problems: Problem[] }>> => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/problems`, {
    headers
  });
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

  submitSolution: async (
    problemId: string,
    code: string,
    token: string,
    languageId: string
  ): Promise<ApiResponse<{ submissionId: string; status: string }>> => {
    const response = await fetch(`${API_BASE_URL}/submissions/submit/${problemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, languageId }),
    });
    return response.json();
  },

  getSubmissionStatus: async (
    submissionId: string,
    token: string
  ): Promise<ApiResponse<SubmissionResult>> => {
    const response = await fetch(`${API_BASE_URL}/submissions/status/${submissionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getContestProblem: async (
    contestSlug: string,
    problemSlug: string,
    token?: string
  ): Promise<ApiResponse<ContestProblem>> => {
    console.log('Calling getContestProblem:', { contestSlug, problemSlug, hasToken: !!token });
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Token added to headers');
    } else {
      console.log('No token provided');
    }

    const url = `${API_BASE_URL}/contests/${contestSlug}/problems/${problemSlug}`;
    const response = await fetch(url, { headers });
    const data = await response.json();
    console.log('Response data:', data);
    return data;
  },

submitContestSolution: async (
  contestSlug: string,  // Changed from contestId
  problemSlug: string,  // Changed from problemId
  code: string,
  token: string,
  languageId: string
): Promise<ApiResponse<{ submissionId: string; status: string; contestProblemId: string; problemTitle: string }>> => {
  console.log('Submitting contest solution:', { contestSlug, problemSlug, languageId });
  const response = await fetch(`${API_BASE_URL}/contests/${contestSlug}/submissions/${problemSlug}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, languageId }),
  });
  return response.json();
},

  getContestSubmissionStatus: async (
    submissionId: string,
    token: string
  ): Promise<ApiResponse<SubmissionResult>> => {
    const response = await fetch(`${API_BASE_URL}/contests/submissions/status/${submissionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getUserSubmissions: async (problemId: string, token: string, page: number = 1, limit: number = 10) => {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions/problem/${problemId}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get user submissions error:', error);
      return { success: false, message: 'Failed to fetch submissions' };
    }
  },

};
