class ScoreCalculator {
  // Calculate score based on test cases passed
  static calculateScore(passedTests, totalTests, problemPoints = 100) {
    if (totalTests === 0) return 0;

    // Simple percentage-based scoring
    const percentage = passedTests / totalTests;
    return Math.round(percentage * problemPoints);
  }

  // Advanced penalty system with decreasing penalty rate
  static calculateAdvancedPenalty(passedTests, totalTests, attempts, problemPoints = 100) {
    if (totalTests === 0) return 0;

    const baseScore = this.calculateScore(passedTests, totalTests, problemPoints);

    // Only apply penalty if the solution is accepted
    if (passedTests === totalTests && attempts > 1) {
      const failedAttempts = attempts - 1;

      // Progressive penalty: first failed attempt = 15%, second = 10%, third+ = 5%
      let totalPenalty = 0;
      for (let i = 0; i < failedAttempts; i++) {
        if (i === 0) {
          totalPenalty += baseScore * 0.15; // 15% penalty for first failed attempt
        } else if (i === 1) {
          totalPenalty += baseScore * 0.10; // 10% penalty for second failed attempt
        } else {
          totalPenalty += baseScore * 0.05; // 5% penalty for subsequent attempts
        }
      }

      return Math.max(0, Math.round(baseScore - totalPenalty));
    }

    return baseScore;
  }
}

module.exports = ScoreCalculator;
