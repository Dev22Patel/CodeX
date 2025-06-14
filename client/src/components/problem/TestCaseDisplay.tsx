import React from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, X } from 'lucide-react';
import type { SubmissionResult } from '../../types/index';

interface TestCaseDisplayProps {
  submissionResult: SubmissionResult | null;
  showTestCases: boolean;
  onClose: () => void;
}

const TestCaseDisplay: React.FC<TestCaseDisplayProps> = ({
  submissionResult,
  showTestCases,
  onClose
}) => {
  if (!submissionResult || !showTestCases) return null;
console.log('Submission Result:', submissionResult);
console.log('Show Test Cases:', showTestCases);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
      case 'ACCEPTED':
        return 'text-green-400';
      case 'FAILED':
      case 'WRONG_ANSWER':
        return 'text-red-400';
      case 'PENDING':
        return 'text-yellow-400';
      case 'ERROR':
      case 'RUNTIME_ERROR':
      case 'COMPILATION_ERROR':
        return 'text-orange-400';
      case 'TIME_LIMIT_EXCEEDED':
      case 'MEMORY_LIMIT_EXCEEDED':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5" />;
      case 'FAILED':
      case 'WRONG_ANSWER':
        return <XCircle className="h-5 w-5" />;
      case 'PENDING':
        return <Clock className="h-5 w-5" />;
      case 'ERROR':
      case 'RUNTIME_ERROR':
      case 'COMPILATION_ERROR':
        return <AlertTriangle className="h-5 w-5" />;
      case 'TIME_LIMIT_EXCEEDED':
        return <Clock className="h-5 w-5" />;
      case 'MEMORY_LIMIT_EXCEEDED':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  // Use the results array from your API response, with fallback to testCases
  const testCases = submissionResult.results || submissionResult.testCases || [];
  const totalTestCases = submissionResult.totalTests || submissionResult.totalTestCases || 0;
  const passedTestCases = submissionResult.passedTests || submissionResult.passedTestCases || 0;

  return (
    <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Test Cases</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-sm text-gray-300">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span>Status:</span>
              <span className={`font-semibold flex items-center space-x-1 ${getStatusColor(submissionResult.status)}`}>
                {getStatusIcon(submissionResult.status)}
                <span>{submissionResult.status.replace('_', ' ')}</span>
              </span>
            </div>
            {totalTestCases > 0 && (
              <div className="flex items-center space-x-2">
                <span>Passed:</span>
                <span className="font-semibold">
                  {passedTestCases}/{totalTestCases}
                </span>
              </div>
            )}
            {submissionResult.score !== undefined && (
              <div className="flex items-center space-x-2">
                <span>Score:</span>
                <span className="font-semibold">{submissionResult.score}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {testCases.length > 0 ? (
          <div className="space-y-4">
            {testCases.map((testCase, index) => {
              // Handle both formats: your API format and the expected format
              const testCaseData = {
                id: testCase.id || testCase.testCase || index,
                status: testCase.passed ? 'PASSED' : 'FAILED',
                input: testCase.input || 'Input not available',
                expectedOutput: testCase.expectedOutput || 'Expected output not available',
                actualOutput: testCase.actualOutput || null,
                executionTime: testCase.executionTime || submissionResult.runtime,
                memory: testCase.memory || submissionResult.memory,
                isPublic: testCase.isPublic
              };

              return (
                <div key={testCaseData.id} className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`${getStatusColor(testCaseData.status)}`}>
                        {getStatusIcon(testCaseData.status)}
                      </span>
                      <span className="text-white font-medium">
                        Test Case {testCaseData.testCase || index + 1}
                        {!testCaseData.isPublic && (
                          <span className="ml-2 text-xs bg-gray-700 px-2 py-1 rounded">Hidden</span>
                        )}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded ${getStatusColor(testCaseData.status)} bg-opacity-10`}>
                        {testCaseData.status.replace('_', ' ')}
                      </span>
                    </div>
                    {testCaseData.executionTime && (
                      <div className="text-xs text-gray-400">
                        {testCaseData.executionTime}ms
                        {testCaseData.memory && ` | ${testCaseData.memory / 1024}MB`}
                      </div>
                    )}
                  </div>

                  {testCaseData.isPublic ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Input:</h4>
                        <pre className="bg-gray-800 p-3 rounded border border-gray-600 text-sm text-gray-200 font-mono overflow-x-auto">
                          {testCaseData.input}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Expected Output:</h4>
                        <pre className="bg-gray-800 p-3 rounded border border-gray-600 text-sm text-gray-200 font-mono overflow-x-auto">
                          {testCaseData.expectedOutput}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <p>This is a hidden test case. Input and expected output are not visible.</p>
                    </div>
                  )}

                  {testCaseData.isPublic && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Your Output:</h4>
                      <pre className={`p-3 rounded text-sm font-mono overflow-x-auto border ${
                        testCaseData.status === 'PASSED'
                          ? 'bg-green-900/20 text-green-200 border-green-700'
                          : 'bg-red-900/20 text-red-200 border-red-700'
                      }`}>
                        {testCaseData.actualOutput || 'No output generated'}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {submissionResult.status === 'PENDING' ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                <span>Running test cases...</span>
              </div>
            ) : (
              'No test case details available'
            )}
          </div>
        )}

        {submissionResult.errorMessage && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <h4 className="text-sm font-medium text-red-300 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Error Details:
            </h4>
            <pre className="text-sm text-red-200 font-mono whitespace-pre-wrap">
              {submissionResult.errorMessage}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestCaseDisplay;
