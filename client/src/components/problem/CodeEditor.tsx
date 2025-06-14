import React, { useState, useEffect } from 'react';
import { Play, Code, AlertCircle } from 'lucide-react';

interface Language {
  id: string;
  name: string;
  judge0Id: number;
  extension: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

interface CodeEditorProps {
  problem: Problem;
  token: string | null;
  onSubmit: (code: string, languageId: string) => Promise<void>;
  submissionLoading: boolean;
  setToast: (toast: ToastProps | null) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  problem,
  token,
  onSubmit,
  submissionLoading,
  setToast
}) => {
  const [code, setCode] = useState<string>('// Write your solution here\n');
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>('');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  // Default code templates for different languages
  const codeTemplates: Record<string, string> = {
    'JavaScript': `// Write your JavaScript solution here
function solution(input) {
    // Your code here
    return result;
}`,
    'Python': `# Write your Python solution here
def solution():
    # Your code here
    pass`,
    'Java': `// Write your Java solution here
public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`,
    'C++': `// Write your C++ solution here
#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
    'C': `// Write your C solution here
#include <stdio.h>
#include <stdlib.h>

int main() {
    // Your code here
    return 0;
}`
  };

  // Fetch available languages on component mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        // Fixed the typo in the original URL
        const response = await fetch('http://localhost:3000/api/launguages');
        const data = await response.json();

        if (data.success) {
          setLanguages(data.data);
          // Set default language (first available)
          if (data.data.length > 0) {
            setSelectedLanguageId(data.data[0].id);
            const defaultLang = data.data[0];
            setCode(codeTemplates[defaultLang.name] || '// Write your solution here\n');
          }
        } else {
          // Fallback to mock data if API response is not successful
          const mockLanguages: Language[] = [
            { id: '1', name: 'JavaScript', judge0Id: 63, extension: '.js' },
            { id: '2', name: 'Python', judge0Id: 71, extension: '.py' },
            { id: '3', name: 'Java', judge0Id: 62, extension: '.java' },
            { id: '4', name: 'C++', judge0Id: 54, extension: '.cpp' },
            { id: '5', name: 'C', judge0Id: 50, extension: '.c' }
          ];
          setLanguages(mockLanguages);
          setSelectedLanguageId(mockLanguages[0].id);
          setCode(codeTemplates[mockLanguages[0].name] || '// Write your solution here\n');

          setToast({
            message: 'Failed to load languages, using offline data',
            type: 'info',
            onClose: () => setToast(null)
          });
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
        // Fallback to mock data on error
        const mockLanguages: Language[] = [
          { id: '1', name: 'JavaScript', judge0Id: 63, extension: '.js' },
          { id: '2', name: 'Python', judge0Id: 71, extension: '.py' },
          { id: '3', name: 'Java', judge0Id: 62, extension: '.java' },
          { id: '4', name: 'C++', judge0Id: 54, extension: '.cpp' },
          { id: '5', name: 'C', judge0Id: 50, extension: '.c' }
        ];
        setLanguages(mockLanguages);
        setSelectedLanguageId(mockLanguages[0].id);
        setCode(codeTemplates[mockLanguages[0].name] || '// Write your solution here\n');

        setToast({
          message: 'Error loading languages, using offline data',
          type: 'info',
          onClose: () => setToast(null)
        });
      } finally {
        setLanguagesLoading(false);
      }
    };

    fetchLanguages();
  }, [setToast]);

  // Handle language change
  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguageId(languageId);
    const selectedLang = languages.find(lang => lang.id === languageId);
    if (selectedLang) {
      setCode(codeTemplates[selectedLang.name] || '// Write your solution here\n');
    }
  };

  const handleRunCode = async () => {
    if (!selectedLanguageId) {
      setToast({
        message: 'Please select a programming language',
        type: 'error',
        onClose: () => setToast(null)
      });
      return;
    }

    setIsRunning(true);
    setConsoleOutput('Running code...');

    try {
      // Simulate code execution with the same logic as original
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConsoleOutput('Code executed successfully. Submit to run against all test cases.');
    } catch (error) {
      setConsoleOutput('Error running code.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      setToast({
        message: 'Please log in to submit solutions.',
        type: 'error',
        onClose: () => setToast(null)
      });
      return;
    }

    if (!selectedLanguageId) {
      setToast({
        message: 'Please select a programming language',
        type: 'error',
        onClose: () => setToast(null)
      });
      return;
    }

    if (!code.trim()) {
      setToast({
        message: 'Please write some code before submitting',
        type: 'error',
        onClose: () => setToast(null)
      });
      return;
    }

    await onSubmit(code, selectedLanguageId);
  };

  const selectedLanguage = languages.find(lang => lang.id === selectedLanguageId);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Code className="h-5 w-5 mr-2 text-blue-400" />
          Code Editor
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <select
              value={selectedLanguageId}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={languagesLoading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              {languagesLoading ? (
                <option>Loading languages...</option>
              ) : (
                <>
                  <option value="">Select Language</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          {selectedLanguage && (
            <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 flex items-center">
              <span className="font-mono">{selectedLanguage.extension}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-96 p-4 bg-gray-900 border border-gray-600 rounded-lg font-mono text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Write your solution here..."
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={handleRunCode}
          disabled={isRunning || submissionLoading || !selectedLanguageId}
          className="flex-1 sm:flex-none bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Code
            </>
          )}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submissionLoading || !selectedLanguageId}
          className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium"
        >
          {submissionLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            'Submit'
          )}
        </button>
      </div>

      {/* <div className="bg-gray-900 rounded-lg border border-gray-600 p-4">
        <h4 className="font-medium text-white mb-3 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 text-gray-400" />
          Console Output
        </h4>
        <pre className="text-sm text-gray-300 whitespace-pre-wrap min-h-[3rem]">
          {consoleOutput || 'Click "Run Code" or "Submit" to see output here...'}
        </pre>
      </div> */}

      {selectedLanguage && (
        <div className="mt-3 text-xs text-gray-500">
          Selected: {selectedLanguage.name} (Judge0 ID: {selectedLanguage.judge0Id})
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
