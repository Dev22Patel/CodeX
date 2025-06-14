import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

function App() {
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/problems/reverse-a-string', {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzZjc4ZWU0ZC1jMGE2LTQ5NWYtYWIwZi00ZDc5MDA1ZTJmMjMiLCJpYXQiOjE3NDk4MjEwNjYsImV4cCI6MTc1MDQyNTg2Nn0.sUR9LBeTwOMIUlnUuAxk3MUDxAUb7InYSNpV3p5O9cU'
          }
        });

        const result = await response.json();
        console.log("Fetched problem:", result);
        setProblem(result.data);
      } catch (error) {
        console.error("Failed to fetch problem:", error);
      }
    };

    fetchProblem();
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <p>
          Problem Title: <strong>{problem?.title}</strong>
        </p>
        <p>
          Description: <em>{problem?.description}</em>
        </p>
        <p>
          Difficulty: {problem?.difficulty}
        </p>
        <p>
          Tags: {problem?.tags}
        </p>
        <div>
        <p>Test Cases:</p>
        <ul>
            {problem?.testCases?.map(tc => (
            <li key={tc.id}>
                <strong>Input:</strong> {tc.input}, <strong>Output:</strong> {tc.expectedOutput}
            </li>
            ))}
        </ul>
        </div>

      </div>
    </>
  );
}

export default App;
