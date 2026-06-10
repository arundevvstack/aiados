/**
 * CinematicGrammarEngine (Phase 7)
 * Validates allowed shot grammar (Coverage, 180 Degree, Screen Direction).
 */
export class CinematicGrammarEngine {
  static validate180DegreeRule(shotSpecA, shotSpecB) {
      // Simplistic grammar validation logic for phase 7 architecture
      if (!shotSpecA || !shotSpecB) return true;

      // Ensure that alternating OTS shots respect the axis
      if (shotSpecA.cameraIntent === 'ots_left' && shotSpecB.cameraIntent === 'ots_right') {
          // Typically valid if subjects swap, but if same focal subject, axis broken
          if (shotSpecA.focalSubject === shotSpecB.focalSubject) {
              return false;
          }
      }
      return true;
  }

  static validateScreenDirection(shotSpecA, shotSpecB) {
      if (!shotSpecA || !shotSpecB) return true;

      // If motion continues across a cut, screen direction must match
      if (shotSpecA.cameraMovement === 'pan_right' && shotSpecB.cameraMovement === 'pan_left') {
          return false;
      }
      return true;
  }
}
