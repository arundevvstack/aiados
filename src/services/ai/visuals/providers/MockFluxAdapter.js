/**
 * MockFluxAdapter (Phase 6)
 */
export class MockFluxAdapter {
  async execute(visualSpec) {
      // Deterministic output
      return {
          visualHash: 'mock_flux_hash_' + Math.random().toString(36).substring(7),
          specificationHash: JSON.stringify(visualSpec).length, // pseudo-hash
          provider: 'flux',
          metadata: { _injectedHardFail: visualSpec._injectedHardFail || false, _wardrobeMismatch: visualSpec._wardrobeMismatch || false },
          generatedViews: [ { url: `mock://flux/${visualSpec.requestedView || 'default'}.png` } ]
      };
  }
}
