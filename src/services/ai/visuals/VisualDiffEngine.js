/**
 * VisualDiffEngine (Phase 6)
 * Detects identity drift by comparing Structural Specifications.
 */
export class VisualDiffEngine {
  static compare(specA, specB) {
    const drift = {
        hasDrift: false,
        deltas: [],
        severity: 'none'
    };

    if (!specA || !specB) return drift;

    // Compare Appearance Rules
    if (specA.appearance && specB.appearance) {
        Object.keys(specA.appearance).forEach(key => {
            if (specA.appearance[key] !== specB.appearance[key]) {
                drift.hasDrift = true;
                drift.deltas.push(`Appearance Changed: ${key} (${specA.appearance[key]} -> ${specB.appearance[key]})`);
                drift.severity = 'high'; // Appearance drift is always high
            }
        });
    }

    // Compare Wardrobe Rules
    if (JSON.stringify(specA.wardrobe) !== JSON.stringify(specB.wardrobe)) {
         drift.hasDrift = true;
         drift.deltas.push(`Wardrobe Changed`);
         if (drift.severity === 'none') drift.severity = 'medium';
    }

    return drift;
  }
}
