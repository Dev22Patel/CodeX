import React from 'react';
import { CheckCircle, Code, Play } from 'lucide-react';
import type { Problem } from '../../types/index';
import DifficultyBadge from './DifficultyBadge';

interface ProblemDescriptionProps {
  problem: Problem;
}

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem }) => {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
        <div className="flex items-center space-x-6 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Acceptance: {problem.acceptanceRate ? `${problem.acceptanceRate}%` : 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Code className="h-4 w-4" />
            <span>Submissions: {problem.totalSubmissions || 0}</span>
          </div>
        </div>
      </div>

      <div className="prose prose-invert max-w-none">
        <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
          {problem.description}
        </div>
      </div>

      {problem.testCases && problem.testCases.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Play className="h-5 w-5 mr-2 text-blue-400" />
            Examples
          </h3>
          <div className="space-y-4">
            {problem.testCases.map((testCase, index) => (
              <div key={testCase.id} className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                <h4 className="font-medium text-white mb-3">Example {index + 1}:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Input:</label>
                    <pre className="bg-gray-800 p-3 rounded border border-gray-600 text-sm text-gray-200 font-mono overflow-x-auto">
                      {testCase.input}
                    </pre>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Output:</label>
                    <pre className="bg-gray-800 p-3 rounded border border-gray-600 text-sm text-gray-200 font-mono overflow-x-auto">
                      {testCase.expectedOutput}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemDescription;
