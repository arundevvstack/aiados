import { RenderingSpecificationEngine } from './RenderingSpecificationEngine.js';
import { RenderPolicyEngine } from './RenderPolicyEngine.js';
import { ProviderCapabilityRegistry } from './ProviderCapabilityRegistry.js';
import { ImageProviderGateway } from './ImageProviderGateway.js';
import { RenderQueueEngine } from './RenderQueueEngine.js';
import { RenderConsistencyEngine } from './RenderConsistencyEngine.js';
import { RenderCostEngine } from './RenderCostEngine.js';
import { RenderAuditLogger } from './RenderAuditLogger.js';

/**
 * RenderOrchestrator (Phase 8)
 * Master coordinator for the entire deterministic pipeline.
 */
export class RenderOrchestrator {
  static async render(jobContext) {
      // 1. Build Rendering Specification
      const renderSpec = RenderingSpecificationEngine.build(
          jobContext.visualManifest, 
          jobContext.shotSpec, 
          jobContext.productionContext
      );

      // 2. Policy Enforcement (Hard Fails on budget/limits)
      RenderPolicyEngine.validate(renderSpec, jobContext.budgetContext);

      // 3. Provider Routing based on required capabilities
      const provider = ProviderCapabilityRegistry.resolveBestProvider(jobContext.capabilitiesRequired);

      // 4. Queue Creation
      const queuedJob = await RenderQueueEngine.enqueue({ spec: renderSpec, provider });

      // 5. Execution (Gateway)
      const result = await ImageProviderGateway.execute(provider, queuedJob.spec);
      
      // 6. Consistency Validation
      const consistency = RenderConsistencyEngine.validate(result, queuedJob.spec);
      if (!consistency.valid) {
          throw new Error("Render failed consistency check: " + consistency.hard_failures.join(', '));
      }

      // 7. Cost Calculation
      const cost = RenderCostEngine.calculate(result);

      // 8. Audit Logging
      const audit = RenderAuditLogger.log({
          ...jobContext,
          renderSpec,
          result
      });

      return {
          status: 'Canonical',
          provider,
          result_hash: result.result_hash,
          consistency_score: consistency.overall_score,
          cost,
          audit_trail: audit
      };
  }
}
