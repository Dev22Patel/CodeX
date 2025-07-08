import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Clock, Tag, TestTube, Eye, EyeOff, Cpu } from 'lucide-react';
import axios from 'axios';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  points: number;
  timeLimit?: number;
  memoryLimit?: number;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export const ProblemDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProblem();
    }
  }, [id]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3000/api/admin/problems/${id}`,{
         headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-authenticated'
        }
      });
      if (response.data.success) {
        setProblem(response.data.data);
      }
    } catch (err) {
      setError('Failed to fetch problem');
      console.error('Error fetching problem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!problem) return;

    if (window.confirm(`Are you sure you want to delete "${problem.title}"?`)) {
      try {
        await axios.delete(`http://localhost:3000/api/admin/problems/${id}`,{
             headers: {
          'Content-Type': 'application/json',
          'x-admin-token': 'admin-authenticated'
            }
        });
        navigate('/admin/problems');
      } catch (err) {
        console.error('Error deleting problem:', err);
        alert('Failed to delete problem');
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-400 bg-green-900/20 border-green-500';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      case 'HARD': return 'text-red-400 bg-red-900/20 border-red-500';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/problems')}
            className="text-gray-400 hover:text-gray-300 p-2 rounded-lg hover:bg-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-semibold text-white">Problem Details</h2>
        </div>
        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error || 'Problem not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/problems')}
            className="text-gray-400 hover:text-gray-300 p-2 rounded-lg hover:bg-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-semibold text-white">Problem Details</h2>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/problems/${id}/edit`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Edit size={16} />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Problem Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">{problem.title}</h3>
            <p className="text-gray-300 font-mono text-sm mb-3">/{problem.slug}</p>
            <div className="flex items-center gap-4 mb-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                problem.isPublic
                  ? 'text-green-400 bg-green-900/20 border border-green-500'
                  : 'text-gray-400 bg-gray-900/20 border border-gray-500'
              }`}>
                {problem.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        </div>

        {/* Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-gray-300">
            <Clock size={16} />
            <span>Time Limit: {problem.timeLimit}ms</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Cpu size={16} />
            <span>Memory Limit: {problem.memoryLimit}MB</span>
          </div>
        </div>

        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {problem.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-900/20 text-blue-300 text-sm rounded-full border border-blue-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">Description</h4>
          <div className="bg-gray-700 rounded-lg p-4">
            <pre className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
              {problem.description}
            </pre>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400 border-t border-gray-700 pt-4">
          <div>
            <span className="font-medium">Created:</span> {formatDate(problem.createdAt)}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {formatDate(problem.updatedAt)}
          </div>
        </div>
      </div>

      {/* Test Cases */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TestTube size={20} className="text-gray-400" />
            <h4 className="text-lg font-semibold text-white">Test Cases</h4>
            <span className="text-sm text-gray-400">({problem.testCases.length} total)</span>
          </div>
        </div>

        {problem.testCases.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No test cases found for this problem.
          </div>
        ) : (
          <div className="space-y-4">
            {problem.testCases.map((testCase, index) => (
              <div key={testCase.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h5 className="text-white font-medium">Test Case {index + 1}</h5>
                    <span className="text-sm text-gray-400">
                      {testCase.points} point{testCase.points !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      {testCase.isPublic ? (
                        <><Eye size={14} className="text-green-400" /><span className="text-green-400 text-sm">Public</span></>
                      ) : (
                        <><EyeOff size={14} className="text-gray-400" /><span className="text-gray-400 text-sm">Private</span></>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Input</label>
                    <div className="bg-gray-600 rounded p-3">
                      <pre className="text-gray-100 text-sm whitespace-pre-wrap">{testCase.input}</pre>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Expected Output</label>
                    <div className="bg-gray-600 rounded p-3">
                      <pre className="text-gray-100 text-sm whitespace-pre-wrap">{testCase.expectedOutput}</pre>
                    </div>
                  </div>
                </div>

                {(testCase.timeLimit || testCase.memoryLimit) && (
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    {testCase.timeLimit && (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>Time: {testCase.timeLimit}ms</span>
                      </div>
                    )}
                    {testCase.memoryLimit && (
                      <div className="flex items-center gap-1">
                        <Cpu size={14} />
                        <span>Memory: {testCase.memoryLimit}MB</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// This component can be used in the admin section to view and manage problem details.
export default ProblemDetails;
