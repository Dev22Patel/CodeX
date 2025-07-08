// Updated ProblemDetail component with UserSubmissions integration
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../service/api';
import Loading from '../components/common/Loading';
import Toast from '../components/common/Toast';
import ProblemDescription from '../components/problem/ProblemDescription';
import CodeEditor from '../components/problem/CodeEditor';
import TestCaseDisplay from '../components/problem/TestCaseDisplay';
import UserSubmissions from '../components/userSubmission';
import { useAuth } from '../context/AuthContext';
import { History } from 'lucide-react';
import type { Problem, ToastProps, SubmissionResult } from '../types/index';

const ProblemDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submissionLoading, setSubmissionLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [showTestCases, setShowTestCases] = useState<boolean>(false);
  const [showUserSubmissions, setShowUserSubmissions] = useState<boolean>(false);

  const { token } = useAuth();

  useEffect(() => {
    if (slug) {
      api.getProblem(slug).then((response) => {
        if (response.success) {
          setProblem(response.data);
        }
        setLoading(false);
      });
    }
  }, [slug]);

  // Polling function with exponential backoff
  const pollSubmissionStatus = async (submissionId: string, maxAttempts = 30) => {
    let attempts = 0;
    let delay = 1000; // Start with 1 second

    const poll = async (): Promise<any> => {
      try {
        const response = await api.getSubmissionStatus(submissionId, token!);

        if (response.success) {
          const status = response.data.status;

          // If still pending, continue polling
          if (status === 'PENDING' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 1.2, 5000); // Exponential backoff, max 5 seconds
            return poll();
          }

          return response.data;
        }

        throw new Error(response.message || 'Failed to get submission status');
      } catch (error) {
        if (attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.2, 5000);
          return poll();
        }
        throw error;
      }
    };

    return poll();
  };

  const handleSubmit = async (code: string, language: string) => {
    if (!problem) return;

    setSubmissionLoading(true);
    setShowTestCases(false);
    setSubmissionResult(null);

    try {
      const submitResponse = await api.submitSolution(problem.id, code, token!, language);

      if (submitResponse.success) {
        const submissionId = submitResponse.data.submissionId;

        // Poll for results
        const result = await pollSubmissionStatus(submissionId);

        setSubmissionResult(result);
        setShowTestCases(true);

        // Show result based on final status
        const isAccepted = result.status === 'ACCEPTED';
        const message = isAccepted
          ? `Solution accepted! Score: ${result.score}%`
          : `Solution ${result.status.toLowerCase().replace('_', ' ')}: Score: ${result.score}%`;

        setToast({
          message,
          type: isAccepted ? 'success' : 'error',
          onClose: () => setToast(null),
        });
      } else {
        setToast({
          message: submitResponse.message,
          type: 'error',
          onClose: () => setToast(null)
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setToast({
        message: 'Submission failed. Please try again.',
        type: 'error',
        onClose: () => setToast(null)
      });
    } finally {
      setSubmissionLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!problem) return <div className="text-center py-8">Problem not found</div>;

  return (
    <div className="max-w bg-zinc-900 mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast && <Toast {...toast} />}

      {/* Header with problem title and submissions button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">{problem.title}</h1>
        {token && (
          <button
            onClick={() => setShowUserSubmissions(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <History className="h-5 w-5" />
            <span>My Submissions</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProblemDescription problem={problem} />
        <CodeEditor
          problem={problem}
          token={token}
          onSubmit={handleSubmit}
          submissionLoading={submissionLoading}
          setToast={setToast}
        />
      </div>

      {submissionResult && (
        <TestCaseDisplay
          submissionResult={submissionResult}
          showTestCases={showTestCases}
          onClose={() => setShowTestCases(false)}
        />
      )}

      {/* User Submissions Modal */}
      {showUserSubmissions && (
        <UserSubmissions
          problemId={problem.id}
          isOpen={showUserSubmissions}
          onClose={() => setShowUserSubmissions(false)}
        />
      )}
    </div>
  );
};

export default ProblemDetail;
