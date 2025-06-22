import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { User, CheckCircle, BarChart3, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  const [solvedProblems, setSolvedProblems] = useState<any[]>([]);

  useEffect(() => {
  console.log("user:", user);
  if (!user) return;

  const fetchSolvedProblems = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/auth/${user.id}/solved-problems`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      console.log("Fetched problems:", data);
      setSolvedProblems(data.data || []);
    } catch (err) {
      console.error("Error fetching solved problems:", err);
    }
  };

  fetchSolvedProblems();
}, [user, token]);


//   useEffect(() => {
//     const fetchProfile = async () => {
//       try {
//         const res = await fetch('http://localhost:3000/api/auth/profile', {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         const data = await res.json();
//         console.log("Profile data:", data);
//       } catch (err) {
//         console.error("Error fetching profile:", err);
//       }
//     };

//     fetchProfile();
//   }, [token]);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-950 min-h-screen text-white">
      <div className="bg-[#1C1C2D] m-12 shadow-md rounded-lg p-6">
        <div className="flex items-center space-x-6 mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-gray-400">@{user.username}</p>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#2A2A3C] p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{solvedProblems.length}</p>
                <p className="text-gray-400">Problems Solved</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Solved Problems</h2>
          {solvedProblems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No solved problems yet.</div>
          ) : (
            <ul className="space-y-4">
              {solvedProblems.map((problem) => (
                <li key={problem.id}>
                <Link
                    to={`/problems/${problem.slug}`}
                    className="block bg-[#2A2A3C] p-4 rounded-lg hover:bg-[#33334D] transition duration-200"
                >
                    <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold">{problem.title}</h3>
                        <p className="text-sm text-gray-400">Difficulty: {problem.difficulty}</p>
                    </div>
                    <span className="text-sm bg-green-600 text-white px-2 py-1 rounded">
                        Solved
                    </span>
                    </div>
                </Link>
                </li>

              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
