import React, { useState, useEffect } from 'react';
import { api } from '../service/api';
import { useAuth } from '../context/AuthContext';
import Loading from './common/Loading';
import Toast from './common/Toast';
import { Clock, Code, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { ToastProps } from '../types/index';

interface Submission {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR';
  code: string;
  score: number;
  runtime: number;
  memory: number;
  passedTests: number;
  totalTests: number;
  createdAt: string;
  language: {
    name: string;
  };
}

interface UserSubmissionsProps {
  problemId: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserSubmissions: React.FC<UserSubmissionsProps> = ({ problemId, isOpen, onClose }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const { token } = useAuth();

  useEffect(() => {
    if (isOpen && problemId) {
      fetchSubmissions();
    }
  }, [isOpen, problemId, currentPage]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await api.getUserSubmissions(problemId, token!, currentPage, 10);
      if (response.success) {
        setSubmissions(response.data.submissions);
        setTotalPages(response.data.pagination.pages);
      } else {
        setToast({
          message: response.message || 'Failed to fetch submissions',
          type: 'error',
          onClose: () => setToast(null)
        });
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setToast({
        message: 'Failed to fetch submissions',
        type: 'error',
        onClose: () => setToast(null)
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'WRONG_ANSWER':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'TIME_LIMIT_EXCEEDED':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'RUNTIME_ERROR':
      case 'COMPILATION_ERROR':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'text-green-500';
      case 'WRONG_ANSWER':
        return 'text-red-500';
      case 'TIME_LIMIT_EXCEEDED':
        return 'text-yellow-500';
      case 'RUNTIME_ERROR':
      case 'COMPILATION_ERROR':
        return 'text-red-500';
      case 'PENDING':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleCodeView = (submissionId: string) => {
    setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {toast && <Toast {...toast} />}

        <div className="p-6 border-b border-zinc-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">My Submissions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <Loading />
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No submissions found for this problem.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(submission.status)}
                        <div>
                          <p className={`font-medium ${getStatusColor(submission.status)}`}>
                            {submission.status.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatDate(submission.createdAt)} • {submission.language.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">
                            Score: {submission.score}%
                          </p>
                          <p className="text-xs text-gray-400">
                            {submission.passedTests}/{submission.totalTests} tests
                          </p>
                        </div>
                        {submission.runtime && (
                          <div className="text-right">
                            <p className="text-sm text-gray-300">
                              {submission.runtime}ms
                            </p>
                            <p className="text-xs text-gray-400">
                              {submission.memory}MB
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => toggleCodeView(submission.id)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="View Code"
                        >
                          {expandedSubmission === submission.id ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedSubmission === submission.id && (
                    <div className="border-t border-zinc-700">
                      <div className="p-4 bg-zinc-950">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Submitted Code ({submission.language.name})
                        </h4>
                        <pre className="bg-zinc-900 rounded p-3 text-sm text-gray-300 overflow-x-auto border border-zinc-600">
                          <code>{submission.code}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-zinc-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600"
              >
                Previous
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-zinc-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-600"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSubmissions;
