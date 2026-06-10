/**
 * ShotApprovalWorkflow (Phase 7)
 * State machine for shot production pipeline.
 * Draft -> Generated -> Validation -> Review -> Approved -> Locked
 */
export class ShotApprovalWorkflow {
  static processTransition(currentStatus, targetStatus) {
      const validTransitions = {
          'Draft': ['Generated'],
          'Generated': ['Validation'],
          'Validation': ['Review', 'Approved'],
          'Review': ['Generated', 'Approved'],
          'Approved': ['Locked', 'Draft']
      };

      if (!validTransitions[currentStatus]?.includes(targetStatus)) {
          throw new Error(`Invalid state transition from ${currentStatus} to ${targetStatus}`);
      }

      return targetStatus;
  }
}
