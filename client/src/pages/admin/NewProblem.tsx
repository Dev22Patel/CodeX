// Frontend: client/src/pages/admin/NewProblem.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const NewProblem: React.FC = () => {
  const navigate = useNavigate();
  const [problem, setProblem] = useState({
    title: '',
    slug: '',
    description: '',
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    timeLimit: 1000,
    memoryLimit: 256,
    isPublic: true,
    tags: [] as string[],
  });
  const [testCases, setTestCases] = useState([{ input: '', expectedOutput: '', isPublic: false, points: 1 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!problem.title.trim()) {
        throw new Error('Title is required');
      }
      if (!problem.slug.trim()) {
        throw new Error('Slug is required');
      }
      if (!problem.description.trim()) {
        throw new Error('Description is required');
      }

      // Validate test cases
      const validTestCases = testCases.filter(tc =>
        tc.input.trim() && tc.expectedOutput.trim()
      );

      if (validTestCases.length === 0) {
        throw new Error('At least one valid test case is required');
      }

      console.log('Sending problem data:', problem);

      const { data } = await axios.post('http://localhost:3000/api/admin/problems', problem , {
         headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-authenticated'
        }
      });

      console.log('Problem created:', data);

      // Create test cases
      for (const testCase of validTestCases) {
        console.log('Creating test case:', testCase);
        await axios.post(`http://localhost:3000/api/admin/problems/${data.data.id}/test-cases`, testCase, {
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': 'admin-authenticated'
          }
        });
      }

      navigate('/admin/problems');
    } catch (error: any) {
      console.error('Error creating problem:', error);

      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.details) {
        setError(`Validation error: ${error.response.data.details.map((d: any) => d.message).join(', ')}`);
      } else {
        setError(error.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '', isPublic: false, points: 1 }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (index: number, field: string, value: any) => {
    const newTestCases = [...testCases];
    (newTestCases[index] as any)[field] = value;
    setTestCases(newTestCases);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">Create New Problem</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-md">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200">Title *</label>
          <input
            type="text"
            value={problem.title}
            onChange={(e) => setProblem({ ...problem, title: e.target.value })}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200">Slug *</label>
          <input
            type="text"
            value={problem.slug}
            onChange={(e) => setProblem({ ...problem, slug: e.target.value })}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            required
            disabled={loading}
            placeholder="unique-problem-identifier"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200">Description *</label>
          <textarea
            value={problem.description}
            onChange={(e) => setProblem({ ...problem, description: e.target.value })}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            rows={6}
            required
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200">Difficulty</label>
            <select
              value={problem.difficulty}
              onChange={(e) => setProblem({ ...problem, difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              disabled={loading}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">Time Limit (ms)</label>
            <input
              type="number"
              value={problem.timeLimit}
              onChange={(e) => setProblem({ ...problem, timeLimit: parseInt(e.target.value) || 1000 })}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              min="100"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200">Memory Limit (MB)</label>
            <input
              type="number"
              value={problem.memoryLimit}
              onChange={(e) => setProblem({ ...problem, memoryLimit: parseInt(e.target.value) || 256 })}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
              min="64"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            checked={problem.isPublic}
            onChange={(e) => setProblem({ ...problem, isPublic: e.target.checked })}
            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
            disabled={loading}
          />
          <label htmlFor="isPublic" className="ml-2 text-sm text-gray-200">
            Make this problem public
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200">Test Cases *</label>
          {testCases.map((testCase, index) => (
            <div key={index} className="space-y-2 mb-4 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-200">Test Case {index + 1}</h4>
                {testCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTestCase(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                    disabled={loading}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-200">Input *</label>
                <textarea
                  value={testCase.input}
                  onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  rows={3}
                  disabled={loading}
                  placeholder="Enter test input..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-200">Expected Output *</label>
                <textarea
                  value={testCase.expectedOutput}
                  onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                  rows={3}
                  disabled={loading}
                  placeholder="Enter expected output..."
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testCase.isPublic}
                    onChange={(e) => updateTestCase(index, 'isPublic', e.target.checked)}
                    className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-200">Public Test Case</span>
                </label>

                <div>
                  <label className="block text-sm text-gray-200">Points</label>
                  <input
                    type="number"
                    value={testCase.points}
                    onChange={(e) => updateTestCase(index, 'points', parseInt(e.target.value) || 1)}
                    className="mt-1 block w-20 rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
                    min="1"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addTestCase}
            className="text-blue-400 hover:text-blue-300"
            disabled={loading}
          >
            + Add Test Case
          </button>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => navigate('/admin/problems')}
            className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Problem'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProblem;
