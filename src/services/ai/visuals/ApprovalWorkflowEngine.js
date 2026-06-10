import { CanonicalReferenceManager } from './CanonicalReferenceManager.js';

/**
 * ApprovalWorkflowEngine (Phase 6)
 * Strict state machine: Draft -> Generated -> Validation -> Review -> Approved -> Canonical
 */
export class ApprovalWorkflowEngine {
  static async processStateTransition(visualAssetVersion, newState, report) {
    // Basic state machine validation
    if (newState === 'Validation' && visualAssetVersion.approval_status !== 'Generated') {
        throw new Error("Invalid State Transition");
    }
    
    // Automatically transition to Review if Validation failed or scored low
    if (newState === 'Validation') {
        if (!report.layer1_pass || report.overall_score < 85) {
            return 'Review';
        }
        return 'Approved';
    }

    if (newState === 'Canonical') {
        if (visualAssetVersion.approval_status !== 'Approved') {
            throw new Error("Only Approved assets can become Canonical.");
        }
        await CanonicalReferenceManager.promote(visualAssetVersion.visual_asset_id, visualAssetVersion.id);
        return 'Canonical';
    }

    return newState;
  }
}
