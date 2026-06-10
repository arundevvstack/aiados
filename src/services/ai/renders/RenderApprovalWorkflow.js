/**
 * RenderApprovalWorkflow (Phase 8)
 * State machine: Queued -> Rendering -> Validation -> Review -> Approved -> Canonical
 * (Also Failed, Cancelled, Archived)
 */
export class RenderApprovalWorkflow {
  static processTransition(currentStatus, targetStatus) {
      const validTransitions = {
          'Queued': ['Rendering', 'Cancelled'],
          'Rendering': ['Validation', 'Failed', 'Cancelled'],
          'Validation': ['Review', 'Approved', 'Failed'],
          'Review': ['Approved', 'Failed', 'Archived'],
          'Approved': ['Canonical', 'Archived'],
          'Canonical': ['Archived'],
          'Failed': ['Archived', 'Queued'],
          'Cancelled': ['Archived', 'Queued'],
          'Archived': []
      };

      if (!validTransitions[currentStatus]?.includes(targetStatus)) {
          throw new Error(`Invalid state transition from ${currentStatus} to ${targetStatus}`);
      }

      return targetStatus;
  }
}
