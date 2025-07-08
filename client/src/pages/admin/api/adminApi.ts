// client/src/services/adminApi.ts
const API_BASE_URL = 'http://localhost:3000/api';

class AdminApiService {
  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-token': 'admin-authenticated'
    };
  }

  async getAllProblems() {
    const response = await fetch(`${API_BASE_URL}/admin/problems`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch problems');
    }

    return response.json();
  }

  async getProblem(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/problems/${id}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch problem');
    }

    return response.json();
  }

  async createProblem(problemData: any) {
    const response = await fetch(`${API_BASE_URL}/admin/problems`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(problemData)
    });

    if (!response.ok) {
      throw new Error('Failed to create problem');
    }

    return response.json();
  }

  async updateProblem(id: string, problemData: any) {
    const response = await fetch(`${API_BASE_URL}/admin/problems/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(problemData)
    });

    if (!response.ok) {
      throw new Error('Failed to update problem');
    }

    return response.json();
  }

  async deleteProblem(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/problems/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete problem');
    }

    return response.json();
  }

  async createTestCase(problemId: string, testCaseData: any) {
    const response = await fetch(`${API_BASE_URL}/admin/problems/${problemId}/test-cases`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(testCaseData)
    });

    if (!response.ok) {
      throw new Error('Failed to create test case');
    }

    return response.json();
  }

  async updateTestCase(id: string, testCaseData: any) {
    const response = await fetch(`${API_BASE_URL}/admin/test-cases/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(testCaseData)
    });

    if (!response.ok) {
      throw new Error('Failed to update test case');
    }

    return response.json();
  }

  async deleteTestCase(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/test-cases/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete test case');
    }

    return response.json();
  }

  async createContest(contestData: any) {
    const response = await fetch(`${API_BASE_URL}/admin/contests`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(contestData)
    });

    if (!response.ok) {
      throw new Error('Failed to create contest');
    }

    return response.json();
  }

  async createContestProblem(contestId: string, problemData: any) {
    const response = await fetch(`${API_BASE_URL}/admin/contests/${contestId}/problems`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(problemData)
    });

    if (!response.ok) {
      throw new Error('Failed to create contest problem');
    }

    return response.json();
  }

  async createContestTestCase(contestProblemId: string, testCaseData: any) {
    const response = await fetch(`${API_BASE_URL}/admin/contests/problems/${contestProblemId}/test-cases`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(testCaseData)
    });

    if (!response.ok) {
      throw new Error('Failed to create contest test case');
    }

    return response.json();
  }
}

export const adminApiService = new AdminApiService();
