/**
 * CoverageEngine (Phase 7)
 * Verifies that a scene has sufficient shot coverage.
 */
export class CoverageEngine {
  static evaluate(sceneShots) {
      const report = {
          coverage_score: 0,
          missing_coverage: [],
          camera_distribution: {},
          isComplete: false
      };

      const shotTypes = sceneShots.map(s => s.shotType || s.shot_type);

      const requiredCoverage = ['wide_shot', 'medium_shot'];
      const hasWide = shotTypes.includes('wide_shot') || shotTypes.includes('establishing_shot');
      const hasMedium = shotTypes.includes('medium_shot');
      
      if (!hasWide) report.missing_coverage.push('wide_shot (Establishing)');
      if (!hasMedium) report.missing_coverage.push('medium_shot (Action/Dialog)');

      report.coverage_score = ((requiredCoverage.length - report.missing_coverage.length) / requiredCoverage.length) * 100;
      report.isComplete = report.coverage_score === 100;

      shotTypes.forEach(t => {
          report.camera_distribution[t] = (report.camera_distribution[t] || 0) + 1;
      });

      return report;
  }
}
