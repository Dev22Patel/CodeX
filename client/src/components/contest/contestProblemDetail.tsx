// pages/ContestProblemDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../service/api';
import Loading from '../common/Loading';
import Toast from '../common/Toast';
import ProblemDescription from '../../components/problem/ProblemDescription';
import CodeEditor from '../../components/problem/CodeEditor';
import TestCaseDisplay from '../../components/problem/TestCaseDisplay';
import type { ContestProblem, ToastProps, SubmissionResult } from '../../types';

const ContestProblemDetail: React.FC = () => {
  const { contestSlug, problemSlug } = useParams<{ contestSlug: string; problemSlug: string }>();
  const [problem, setProblem] = useState<ContestProblem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submissionLoading, setSubmissionLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [showTestCases, setShowTestCases] = useState<boolean>(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (contestSlug && problemSlug && token) {
        console.log("contestSlug ->", contestSlug);
        console.log("problemSlug ->", problemSlug);
      api
        .getContestProblem(contestSlug, problemSlug, token)
        .then((response) => {
          if (response.success) {
            setProblem(response.data);
          } else {
            setToast({
              message: response.message || 'Failed to load contest problem',
              type: 'error',
              onClose: () => setToast(null),
            });
          }
        })
        .catch((error) => {
          console.error('Error fetching contest problem:', error);
          setToast({
            message: 'Failed to load contest problem',
            type: 'error',
            onClose: () => setToast(null),
          });
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setToast({
        message: 'Authentication required or invalid parameters',
        type: 'error',
        onClose: () => setToast(null),
      });
      setLoading(false);
    }
  }, [contestSlug, problemSlug, token]);

  const pollSubmissionStatus = async (submissionId: string, maxAttempts = 30): Promise<SubmissionResult> => {
    let attempts = 0;
    let delay = 1000;

    const poll = async (): Promise<SubmissionResult> => {
      try {
        const response = await api.getContestSubmissionStatus(submissionId, token!);
        if (response.success) {
          const status = response.data.status;
          if (status === 'PENDING' && attempts < maxAttempts) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.min(delay * 1.2, 5000);
            return poll();
          }
          return response.data;
        }
        throw new Error(response.message || 'Failed to get submission status');
      } catch (error) {
        if (attempts < maxAttempts) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.2, 5000);
          return poll();
        }
        throw error;
      }
    };

    return poll();
  };

  const handleSubmit = async (code: string, language: string) => {
    if (!problem || !contestSlug || !problemSlug || !token) {
      setToast({
        message: 'Authentication required or invalid problem',
        type: 'error',
        onClose: () => setToast(null),
      });
      return;
    }

    setSubmissionLoading(true);
    setShowTestCases(false);
    setSubmissionResult(null);

    try {
        console.log("problem ->", problem);
        console.log("Using contestId ->", contestSlug || problem.contestId);
        console.log("Using problemId ->", problem.slug);
      const submitResponse = await api.submitContestSolution(
        contestSlug,
        problem.slug,
        code,
        token,
        language
      );

      if (submitResponse.success) {
        const submissionId = submitResponse.data.submissionId;
        const result = await pollSubmissionStatus(submissionId);

        setSubmissionResult(result);
        setShowTestCases(true);

        const isAccepted = result.status === 'ACCEPTED';
        const message = isAccepted
          ? `Solution accepted! Points: ${result.points || 0}`
          : `Solution ${result.status.toLowerCase().replace('_', ' ')}: Points: ${result.points || 0}`;

        setToast({
          message,
          type: isAccepted ? 'success' : 'error',
          onClose: () => setToast(null),
        });
      } else {
        setToast({
          message: submitResponse.message || 'Submission failed',
          type: 'error',
          onClose: () => setToast(null),
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setToast({
        message: 'Submission failed. Please try again.',
        type: 'error',
        onClose: () => setToast(null),
      });
    } finally {
      setSubmissionLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!problem)
    return <div className="text-center py-8">Contest problem not found or not accessible</div>;

  return (
    <div className="max-w bg-zinc-900 mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast && <Toast {...toast} />}
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
    </div>
  );
};

export default ContestProblemDetail;
