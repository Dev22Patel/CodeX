import React from 'react';
import type { Problem } from '../../types/index';

interface DifficultyBadgeProps {
  difficulty: Problem['difficulty'];
}

const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty }) => {
  const getDifficultyStyles = (difficulty: Problem['difficulty']): string => {
    switch (difficulty) {
      case 'EASY':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'HARD':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyStyles(difficulty)}`}>
      {difficulty}
    </span>
  );
};

export default DifficultyBadge;
