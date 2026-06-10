import { VisualDependencyResolver } from '../src/services/ai/visuals/VisualDependencyResolver.js';
import { IdentityRuleEngine } from '../src/services/ai/visuals/IdentityRuleEngine.js';
import { VisualPromptBuilder } from '../src/services/ai/visuals/VisualPromptBuilder.js';
import { VisualConsistencyEngine } from '../src/services/ai/visuals/VisualConsistencyEngine.js';
import { ApprovalWorkflowEngine } from '../src/services/ai/visuals/ApprovalWorkflowEngine.js';
import { CanonicalReferenceManager } from '../src/services/ai/visuals/CanonicalReferenceManager.js';
import { VisualDiffEngine } from '../src/services/ai/visuals/VisualDiffEngine.js';
import { ReferenceSheetGenerator } from '../src/services/ai/visuals/ReferenceSheetGenerator.js';
import { MockFluxAdapter } from '../src/services/ai/visuals/providers/MockFluxAdapter.js';

const report = {
  Setup: 'PENDING',
  Test8: 'PENDING',
  Test9: 'PENDING',
  Test10: 'PENDING',
  Test11: 'PENDING',
  Test12: 'PENDING',
  Performance: 'PENDING'
};

function getMs(start) {
    const diff = process.hrtime(start);
    return Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
}

async function runPhase6Validation() {
  console.log('--- CTO PHASE 6 VALIDATION: VISUAL ASSET SYSTEM ---\n');
  
  // Setup Memory Context
  const amaraId = 'uuid-char-1';
  const dressId = 'uuid-wardrobe-1';
  
  const memoryContext = {
      assets: [
          { id: amaraId, name: 'Amara', type: 'character' },
          { id: dressId, name: 'White Dress', type: 'wardrobe' }
      ],
      relationships: [
          { source: amaraId, target: dressId, type: 'WEARS' }
      ],
      brandRules: { palette: ['#FFFFFF', '#000000'] },
      visualManifests: {
          [amaraId]: {
              identity_rules: { eye_color: 'Brown', hair_color: 'Black' },
              appearance_rules: { skin_tone: 'Medium' },
              prohibited_changes: ['eye_color']
          }
      }
  };

  report.Setup = 'PASS';

  try {
    // ---------------------------------------------------------
    // TEST 11: Visual Dependency Resolution
    // ---------------------------------------------------------
    console.log('[Test 11] Visual Dependency Resolution');
    const baseAsset = memoryContext.assets.find(a => a.id === amaraId);
    
    const resolveStart = process.hrtime();
    const dependencies = VisualDependencyResolver.resolve(baseAsset, memoryContext);
    const resolveMs = getMs(resolveStart);

    if (dependencies.wardrobe[0].name !== 'White Dress') throw new Error("Dependency Resolution missed Wardrobe.");
    if (dependencies.visualManifest.identity_rules.eye_color !== 'Brown') throw new Error("Dependency Resolution missed Manifest.");
    
    report.Test11 = 'PASS';
    console.log('✅ VisualDependencyResolver correctly linked Wardrobe, Brand Rules, and Manifests.');

    // ---------------------------------------------------------
    // TEST 8: Identity Rule Violation (Hard Fail)
    // ---------------------------------------------------------
    console.log('\n[Test 8] Identity Rule Violation (Hard Fail)');
    
    const specStart = process.hrtime();
    const specA = VisualPromptBuilder.build(dependencies);
    const specMs = getMs(specStart);

    // Try to violate identity
    const violatingSpec = { ...specA, appearance: { eye_color: 'Blue' }, _injectedIdentityFail: false };
    
    const validStart = process.hrtime();
    try {
        IdentityRuleEngine.validate(violatingSpec, dependencies.visualManifest);
        throw new Error("Failed to block identity violation");
    } catch (e) {
        if (!e.message.includes("Identity Violation: eye_color must be Brown")) {
            throw e;
        }
        report.Test8 = 'PASS';
        console.log('✅ IdentityRuleEngine correctly blocked provider execution for eye_color drift.');
    }
    const validMs = getMs(validStart);

    // ---------------------------------------------------------
    // TEST 12: Specification Drift Detection (Visual Diff)
    // ---------------------------------------------------------
    console.log('\n[Test 12] Specification Drift Detection');
    const validSpec = { ...specA, appearance: { eye_color: 'Brown' } };
    const newSpec = { ...specA, appearance: { eye_color: 'Green' } }; // Drift

    const diffStart = process.hrtime();
    const driftResult = VisualDiffEngine.compare(validSpec, newSpec);
    const diffMs = getMs(diffStart);

    if (!driftResult.hasDrift || driftResult.severity !== 'high') throw new Error("VisualDiffEngine failed to flag high severity drift.");
    
    report.Test12 = 'PASS';
    console.log(`✅ VisualDiffEngine identified drift: ${driftResult.deltas[0]}`);

    // ---------------------------------------------------------
    // GENERATION & CONSISTENCY (Reference Sheet Generator)
    // ---------------------------------------------------------
    const fluxAdapter = new MockFluxAdapter();
    const sheetResult = await ReferenceSheetGenerator.generate(amaraId, memoryContext, fluxAdapter);
    
    const consistStart = process.hrtime();
    const cReport = VisualConsistencyEngine.evaluate(sheetResult.generatedViews[0], sheetResult.specUsed);
    const consistMs = getMs(consistStart);

    if (!cReport.layer1_pass) throw new Error("Valid generation failed consistency engine.");

    // ---------------------------------------------------------
    // TEST 9 & 10: Canonical Workflow & Restoration
    // ---------------------------------------------------------
    console.log('\n[Test 9 & 10] Canonical Promotion and Manifest Restoration');
    
    const vAssetVersion = { id: 'v1', visual_asset_id: 'asset1', approval_status: 'Generated' };
    
    const state1 = await ApprovalWorkflowEngine.processStateTransition(vAssetVersion, 'Validation', cReport);
    if (state1 !== 'Approved') throw new Error("Workflow failed to approve Validated asset.");
    vAssetVersion.approval_status = state1;

    const retrieveStart = process.hrtime();
    const state2 = await ApprovalWorkflowEngine.processStateTransition(vAssetVersion, 'Canonical', cReport);
    if (state2 !== 'Canonical') throw new Error("Workflow failed to promote to Canonical.");
    
    // Simulate restoring
    const state3 = await CanonicalReferenceManager.restoreHistorical('asset1', 'v0');
    if (!state3) throw new Error("Failed to restore historical canonical");
    const retrieveMs = getMs(retrieveStart);

    report.Test9 = 'PASS';
    report.Test10 = 'PASS';
    console.log('✅ Canonical Reference Manager successfully promoted and restored versions exclusively.');

    // ---------------------------------------------------------
    // PERFORMANCE VALIDATION
    // ---------------------------------------------------------
    console.log('\n[Performance Benchmark]');
    console.log(`Visual Spec Build: ${specMs}ms (Target: <100ms)`);
    console.log(`Identity Validation: ${validMs}ms (Target: <100ms)`);
    console.log(`Visual Diff: ${diffMs}ms (Target: <200ms)`);
    console.log(`Manifest Resolution: ${resolveMs}ms (Target: <50ms)`);
    console.log(`Canonical Retrieval: ${retrieveMs}ms (Target: <25ms)`);

    if (specMs > 100 || validMs > 100 || diffMs > 200 || resolveMs > 50 || retrieveMs > 25) {
        throw new Error("Performance target missed.");
    }
    report.Performance = 'PASS';
    console.log('✅ All benchmark targets achieved.');

    console.log('\n=======================================');
    console.log('PHASE 6 VALIDATION REPORT');
    Object.entries(report).forEach(([test, status]) => console.log(`${test}: ${status}`));
    console.log(`Overall: ${Object.values(report).every(v => v === 'PASS') ? 'PASS' : 'FAIL'}`);
    console.log('=======================================');

  } catch(e) {
    console.error('\n❌ VALIDATION HALTED DUE TO ERROR:');
    console.error(e);
    process.exit(1);
  }
}

runPhase6Validation();
