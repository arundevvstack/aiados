/**
 * RenderDiffEngine (Phase 8)
 * Compares structural deltas between Render Versions.
 */
export class RenderDiffEngine {
  static diff(versionA, versionB) {
      const deltas = [];
      if (versionA.payload.provider !== versionB.payload.provider) deltas.push('provider_change');
      if (versionA.payload.shotType !== versionB.payload.shotType) deltas.push('shot_change');
      return deltas;
  }
}
