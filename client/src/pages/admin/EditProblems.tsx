import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Plus } from 'lucide-react';
import axios from 'axios';

interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  points: number;
  timeLimit?: number;
  memoryLimit?: number;
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit: number;
  memoryLimit: number;
  isPublic: boolean;
  tags: string[];
  testCases: TestCase[];
}

export const EditProblem: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [originalTestCases, setOriginalTestCases] = useState<TestCase[]>([]);

  useEffect(() => {
    if (id) {
      fetchProblem();
    }
  }, [id]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3000/api/admin/problems/${id}`,{
         headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-authenticated'
        }
      });
      if (response.data.success) {
        const problemData = response.data.data;
        setProblem(problemData);
        setTestCases(problemData.testCases || []);
        setOriginalTestCases(problemData.testCases || []);
        setTagsInput(problemData.tags ? problemData.tags.join(', ') : '');
      }
    } catch (err: any) {
      console.error('Error fetching problem:', err);
      if (err.response?.status === 404) {
        setError('Problem not found');
      } else {
        setError('Failed to fetch problem');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem) return;

    setSaving(true);
    setError(null);

    try {
      const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);

      // Update problem
      console.log('Updating problem with data:', { ...problem, tags });
      await axios.put(`http://localhost:3000/api/admin/problems/${id}`, {
        title: problem.title,
        slug: problem.slug,
        description: problem.description,
        difficulty: problem.difficulty,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        isPublic: problem.isPublic,
        tags,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-authenticated',
      },
    });

      // Handle test cases - we'll need to delete all existing ones and recreate them
      // This is a simplified approach since your backend doesn't have update endpoints for test cases

      // First, delete all existing test cases
      for (const originalTestCase of originalTestCases) {
        if (originalTestCase.id) {
          try {
            await axios.delete(`http://localhost:3000/api/admin/test-cases/${originalTestCase.id}`,{
                 headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-authenticated'
        }
            });
          } catch (err) {
            console.warn('Failed to delete test case:', originalTestCase.id);
          }
        }
      }

      // Then create all current test cases
      for (const testCase of testCases) {
        if (testCase.input.trim() && testCase.expectedOutput.trim()) {
          await axios.post(`http://localhost:3000/api/admin/problems/${id}/test-cases`, {
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            isPublic: testCase.isPublic,
            points: testCase.points,
            timeLimit: testCase.timeLimit,
            memoryLimit: testCase.memoryLimit,
          },{
             headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-authenticated'
        }
          });
        }
      }

      navigate('/admin/problems');
    } catch (err: any) {
      console.error('Error updating problem:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.details) {
        setError(`Validation error: ${err.response.data.details.map((d: any) => d.message).join(', ')}`);
      } else {
        setError('Failed to update problem');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestCase = async (testCaseId: string, index: number) => {
    if (window.confirm('Are you sure you want to delete this test case?')) {
      try {
        // Remove from local state immediately
        setTestCases(prev => prev.filter((_, i) => i !== index));

        // Note: We'll handle the actual deletion when saving the problem
        // since we're recreating all test cases anyway
      } catch (err) {
        console.error('Error deleting test case:', err);
        alert('Failed to delete test case');
      }
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, {
      input: '',
      expectedOutput: '',
      isPublic: false,
      points: 1,
    }]);
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const newTestCases = [...testCases];
    (newTestCases[index] as any)[field] = value;
    setTestCases(newTestCases);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-gray-400">Loading problem...</div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="space-y-4">
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Problem not found'}
        </div>
        <button
          onClick={() => navigate('/admin/problems')}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Problems
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/problems')}
            className="text-gray-400 hover:text-gray-300 p-2 rounded-lg hover:bg-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-semibold text-white">Edit Problem</h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={problem.title}
              onChange={(e) => setProblem({ ...problem, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={problem.slug}
              onChange={(e) => setProblem({ ...problem, slug: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={saving}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Description *
          </label>
          <textarea
            value={problem.description}
            onChange={(e) => setProblem({ ...problem, description: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={6}
            required
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Difficulty
            </label>
            <select
              value={problem.difficulty}
              onChange={(e) => setProblem({ ...problem, difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Time Limit (ms)
            </label>
            <input
              type="number"
              value={problem.timeLimit}
              onChange={(e) => setProblem({ ...problem, timeLimit: parseInt(e.target.value) || 1000 })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="100"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Memory Limit (MB)
            </label>
            <input
              type="number"
              value={problem.memoryLimit}
              onChange={(e) => setProblem({ ...problem, memoryLimit: parseInt(e.target.value) || 256 })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="64"
              disabled={saving}
            />
          </div>
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={problem.isPublic}
                onChange={(e) => setProblem({ ...problem, isPublic: e.target.checked })}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                disabled={saving}
              />
              <span className="ml-2 text-sm text-gray-200">Public</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., algorithms, data-structures, dynamic-programming"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={saving}
          />
        </div>

        {/* Test Cases */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-200">Test Cases</label>
            <button
              type="button"
              onClick={addTestCase}
              className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
              disabled={saving}
            >
              <Plus size={16} />
              Add Test Case
            </button>
          </div>

          {testCases.map((testCase, index) => (
            <div key={index} className="bg-gray-700 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium text-white">Test Case {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => handleDeleteTestCase(testCase.id || '', index)}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20"
                  disabled={saving}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-200 mb-2">Input *</label>
                  <textarea
                    value={testCase.input}
                    onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-200 mb-2">Expected Output *</label>
                  <textarea
                    value={testCase.expectedOutput}
                    onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testCase.isPublic}
                    onChange={(e) => updateTestCase(index, 'isPublic', e.target.checked)}
                    className="rounded border-gray-500 text-blue-500 focus:ring-blue-500"
                    disabled={saving}
                  />
                  <span className="ml-2 text-sm text-gray-200">Public Test Case</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-200 mb-1">Points</label>
                  <input
                    type="number"
                    value={testCase.points}
                    onChange={(e) => updateTestCase(index, 'points', parseInt(e.target.value) || 1)}
                    className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          ))}

          {testCases.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No test cases yet. Add some test cases to validate solutions.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/problems')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProblem;
