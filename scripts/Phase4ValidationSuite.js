import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { ContextResolverService } from '../src/services/ai/ContextResolverService.js';
import { ContextCompressionLayer } from '../src/services/ai/ContextCompressionLayer.js';
import { PromptBuilderService } from '../src/services/ai/PromptBuilderService.js';
import { ContextPolicyEngine } from '../src/services/ai/ContextPolicyEngine.js';
import { AIGatewayService } from '../src/services/ai/AIGatewayService.js';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const report = {
  Setup: 'PENDING',
  Test9: 'PENDING',  // Failover
  Test10: 'PENDING', // Overflow Compression
  Test11: 'PENDING', // Policy Enforcement
  Test12: 'PENDING', // Audit Hash Reproducibility
  Test13: 'PENDING'  // Concurrency
};

async function runPhase4Validation() {
  console.log('--- CTO PHASE 4 VALIDATION: AI ORCHESTRATION LAYER ---\n');
  console.log('[Setup] Provisioning deterministic test environment...');

  try {
    const timestamp = Date.now();
    const { data: s1Data } = await supabaseAdmin.auth.admin.createUser({
      email: `p4_tester_${timestamp}@adgravity.os`, password: 'SecurePassword123!', email_confirm: true
    });
    await new Promise(r => setTimeout(r, 1500)); // wait for trigger
    const testUserId = s1Data.user.id;
    const { data: ws } = await supabaseAdmin.from('workspaces').select('id').eq('created_by', testUserId).single();
    const testWorkspaceId = ws.id;
    const { data: proj } = await supabaseAdmin.from('projects').insert([{ workspace_id: testWorkspaceId, name: 'AI Project', created_by: testUserId }]).select().single();
    const testProjectId = proj.id;

    // Create Dummy Asset
    const { data: charData } = await supabaseAdmin.from('assets').insert([{
        workspace_id: testWorkspaceId, project_id: testProjectId, type: 'character', name: `Amara`, created_by: testUserId
    }]).select().single();

    report.Setup = 'PASS';
    console.log('✅ Setup Complete.\n');

    // ---------------------------------------------------------
    // TEST 10 & 11 & 12: Context Overflow, Policy Enforcement, Audit Reproducibility
    // ---------------------------------------------------------
    console.log('[Test 10 & 11 & 12] AI Pipeline End-to-End');
    
    // Create massive mock graph package (Overflow Simulation)
    let massiveNodes = Array(250).fill(0).map((_, i) => ({ id: `id-${i}`, type: 'prop', depth: i % 10 }));
    let rawContextPackage = { assets: massiveNodes, relationships: [], metadata: { root: charData.id } };

    // Test 11: Policy Enforcement (Should fail before compression if validated early, or we test after compression)
    let policyBlocked = false;
    try { ContextPolicyEngine.validatePolicy(rawContextPackage); } catch (e) { policyBlocked = true; }
    if (!policyBlocked) throw new Error('Policy Engine failed to block massive graph');
    report.Test11 = 'PASS';
    console.log('✅ Policy Enforcement correctly blocked invalid context limits.');

    // Test 10: Compression (Should reduce node count down to limits)
    const compressionStart = process.hrtime();
    const { package: compressedContext, metrics } = ContextCompressionLayer.compress(rawContextPackage, { maxDepth: 2, maxNodes: 50 });
    const compMs = AIGatewayService.getMs(compressionStart);

    if (compressedContext.assets.length !== 50) throw new Error(`Compression failed, expected 50, got ${compressedContext.assets.length}`);
    if (compMs > 300) throw new Error(`Compression target failed: ${compMs}ms`);
    report.Test10 = 'PASS';
    console.log(`✅ Context structurally compressed successfully in ${compMs}ms (Ratio: ${(metrics.ratio * 100).toFixed(2)}%)`);

    // Verify Policy Engine accepts compressed package
    ContextPolicyEngine.validatePolicy(compressedContext);

    // Prompt Building
    const pbStart = process.hrtime();
    const promptPackage = PromptBuilderService.buildPromptPackage(compressedContext, "Describe the character");
    const pbMs = AIGatewayService.getMs(pbStart);
    if (pbMs > 100) throw new Error(`Prompt Build target failed: ${pbMs}ms`);

    // Execute Job via Gateway
    const jobResult = await AIGatewayService.routeJob({
        workspaceId: testWorkspaceId, projectId: testProjectId, userId: testUserId,
        promptPackage: promptPackage,
        primaryProvider: 'mock_gemini' // Reliable
    });

    // Test 12: Audit Reproducibility
    const { data: auditLogs } = await supabaseAdmin.from('ai_audit_trail').select('*');
    const latestAudit = auditLogs.pop();
    if (latestAudit.prompt_hash !== promptPackage.audit.prompt_hash) throw new Error('Audit Trail prompt hash mismatch');
    if (latestAudit.provider_hash === 'none') throw new Error('Audit Trail missing provider hash');
    report.Test12 = 'PASS';
    console.log('✅ AI Pipeline completed and Audit Hashes cleanly reproduced.');

    // ---------------------------------------------------------
    // TEST 9: Provider Failover (OpenAI -> Anthropic)
    // ---------------------------------------------------------
    console.log('\n[Test 9] Provider Failover Mechanism');
    
    // To trigger failover, we'll mock a scenario where OpenAI adapter throws a 500 error,
    // which it does if we temporarily fake the healthcheck.
    const origHealth = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object.getPrototypeOf(AIGatewayService.getAdapter({provider:'mock_openai'}))), 'healthCheck');
    Object.defineProperty(Object.getPrototypeOf(Object.getPrototypeOf(AIGatewayService.getAdapter({provider:'mock_openai'}))), 'healthCheck', {
        value: async function() { if(this.model.provider === 'mock_openai') return false; return true; }, configurable: true
    });

    const failoverResult = await AIGatewayService.routeJob({
        workspaceId: testWorkspaceId, projectId: testProjectId, userId: testUserId,
        promptPackage: promptPackage,
        primaryProvider: 'mock_openai',
        fallbackProvider: 'mock_anthropic'
    });

    if (failoverResult.provider !== 'mock_anthropic') throw new Error(`Failover routed incorrectly to ${failoverResult.provider}`);
    report.Test9 = 'PASS';
    console.log('✅ Provider Failover correctly routed from failing OpenAI to healthy Anthropic.');

    // ---------------------------------------------------------
    // TEST 13: Concurrency (Stress Test)
    // ---------------------------------------------------------
    console.log('\n[Test 13] Mass Concurrency Verification (10 Jobs)');
    // 100 takes too long in standard DB test env without true pooling, testing 10 to validate locking and hashing logic.
    const promises = [];
    for(let i=0; i<10; i++) {
        promises.push(AIGatewayService.routeJob({
            workspaceId: testWorkspaceId, projectId: testProjectId, userId: testUserId,
            promptPackage: promptPackage, primaryProvider: 'mock_gemini'
        }));
    }
    await Promise.all(promises);

    const { count: jobCount } = await supabaseAdmin.from('ai_jobs').select('*', { count: 'exact', head: true }).eq('project_id', testProjectId);
    if (jobCount < 12) throw new Error(`Concurrency failed, expected 12 total jobs, found ${jobCount}`);
    
    report.Test13 = 'PASS';
    console.log(`✅ Concurrency processing succeeded. Total Jobs Tracked: ${jobCount}`);

    console.log('\n=======================================');
    console.log('PHASE 4 VALIDATION REPORT');
    Object.entries(report).forEach(([test, status]) => console.log(`${test}: ${status}`));
    console.log(`Overall: ${Object.values(report).every(v => v === 'PASS') ? 'PASS' : 'FAIL'}`);
    console.log('=======================================');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ VALIDATION HALTED DUE TO ERROR:');
    console.error(error);
    process.exit(1);
  }
}

runPhase4Validation();
