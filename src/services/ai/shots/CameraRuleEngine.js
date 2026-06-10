/**
 * CameraRuleEngine (Phase 7)
 * Applies deterministic cinematic logic.
 */
export class CameraRuleEngine {
  static validate(shotSpec) {
      const errors = [];

      // Extreme Close Up cannot be shot on an ultra-wide (distorts features uncinematically)
      if (shotSpec.shotType === 'extreme_close_up' && ['12mm', '14mm', '24mm'].includes(shotSpec.lens)) {
          errors.push(`Hard Fail: ${shotSpec.shotType} cannot be shot on ${shotSpec.lens} without heavy distortion.`);
      }

      // Explicit test hook
      if (shotSpec._injectedCameraRuleFail) {
          errors.push("Hard Fail: Injected Camera Rule Failure.");
      }

      if (errors.length > 0) {
          throw new Error("CAMERA RULE VALIDATION FAILED:\n" + errors.join('\n'));
      }

      return { valid: true };
  }
}
