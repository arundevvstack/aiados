/**
 * ADGRAVITY OS — AutoApprovalEngine
 * 
 * Multi-layer auto-canonicalization gate (CTO directive: 5-condition approval).
 * 
 * A generation is ONLY auto-approved if ALL five conditions pass:
 *   1. Consistency Score ≥ 95
 *   2. No Hard Fail Flags
 *   3. Canonical Identity Match = 100%
 *   4. Brand Compliance = 100%
 *   5. Dependency Validation Pass
 * 
 * Everything else → Human Review Queue.
 * 
 * There is NO averaging. NO compensation between conditions.
 * One failure = human review, always.
 */

export class AutoApprovalEngine {

  /**
   * Evaluate a generation result against all 5 approval conditions.
   * 
   * @param {Object} result - Generation or render result object
   * @param {Object} result.consistencyScore - Overall score (0-100)
   * @param {Array}  result.hardFailFlags - Array of hard fail strings, empty = pass
   * @param {number} result.identityMatchScore - Canonical identity match (0-100)
   * @param {number} result.brandComplianceScore - Brand compliance (0-100)
   * @param {boolean} result.dependencyValidationPassed - All asset dependencies resolved
   * 
   * @returns {{ approved: boolean, reason: string, conditions: Object }}
   */
  static evaluate(result) {
    const conditions = {
      consistencyScore: {
        pass: typeof result.consistencyScore === 'number' && result.consistencyScore >= 95,
        value: result.consistencyScore,
        threshold: 95,
        description: 'Overall consistency score ≥ 95',
      },
      noHardFails: {
        pass: Array.isArray(result.hardFailFlags) && result.hardFailFlags.length === 0,
        value: result.hardFailFlags?.length ?? 'unknown',
        threshold: 0,
        description: 'Zero hard fail flags',
      },
      identityMatch: {
        pass: typeof result.identityMatchScore === 'number' && result.identityMatchScore === 100,
        value: result.identityMatchScore,
        threshold: 100,
        description: 'Canonical identity match = 100%',
      },
      brandCompliance: {
        pass: typeof result.brandComplianceScore === 'number' && result.brandComplianceScore === 100,
        value: result.brandComplianceScore,
        threshold: 100,
        description: 'Brand compliance = 100%',
      },
      dependencyValidation: {
        pass: result.dependencyValidationPassed === true,
        value: result.dependencyValidationPassed,
        threshold: true,
        description: 'All asset dependencies validated',
      },
    };

    const failedConditions = Object.entries(conditions)
      .filter(([, c]) => !c.pass)
      .map(([key, c]) => `${key}: ${c.description} (got: ${c.value}, need: ${c.threshold})`);

    const approved = failedConditions.length === 0;

    const reason = approved
      ? 'All 5 auto-approval conditions passed. Auto-canonicalized.'
      : `Routed to human review. Failed conditions:\n${failedConditions.map(f => `  - ${f}`).join('\n')}`;

    if (approved) {
      console.log('[AutoApprovalEngine] AUTO-APPROVED:', reason);
    } else {
      console.warn('[AutoApprovalEngine] HUMAN REVIEW REQUIRED:', reason);
    }

    return { approved, reason, conditions };
  }

  /**
   * Evaluate a batch of results.
   * Returns auto-approved items and items requiring human review separately.
   * 
   * @param {Array<Object>} results
   * @returns {{ autoApproved: Array, requiresReview: Array }}
   */
  static evaluateBatch(results) {
    const autoApproved = [];
    const requiresReview = [];

    for (const result of results) {
      const evaluation = this.evaluate(result);
      if (evaluation.approved) {
        autoApproved.push({ ...result, evaluation });
      } else {
        requiresReview.push({ ...result, evaluation });
      }
    }

    console.log(`[AutoApprovalEngine] Batch: ${autoApproved.length} auto-approved, ${requiresReview.length} require review.`);
    return { autoApproved, requiresReview };
  }
}
