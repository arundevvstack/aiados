import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Validation blocked: Service Role Key missing.');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runPhase2Validation() {
  console.log('--- CTO PHASE 2 VALIDATION: SMART ASSET ENGINE ---');
  
  const report = {
    Setup: 'FAIL',
    Test1_Insert100: 'FAIL',
    Test2_Delete20: 'FAIL',
    Test3_VersionCapture: 'FAIL',
    Test4_DuplicatePrevention: 'FAIL',
    Test5_Performance1000: 'FAIL'
  };

  let testWorkspaceId, testProjectId, testScriptId;
  const testAssets = []; // Array of asset IDs

  try {
    const timestamp = Date.now();
    const adminEmail = `p2_test_${timestamp}@adgravity.com`;

    // 1. Setup Environment (User -> Workspace -> Project -> Script)
    console.log('\n[Setup] Provisioning isolated test environment...');
    const { data: s1Data } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: 'SecurePassword123!',
      email_confirm: true,
      user_metadata: { full_name: 'Phase 2 Tester' }
    });
    await new Promise(r => setTimeout(r, 1500)); // wait for trigger

    const { data: ws } = await supabaseAdmin.from('workspaces').select('id').eq('created_by', s1Data.user.id);
    testWorkspaceId = ws[0].id;

    const { data: proj } = await supabaseAdmin.from('projects').insert([{
      workspace_id: testWorkspaceId, name: 'P2 Validation Project', created_by: s1Data.user.id, updated_by: s1Data.user.id
    }]).select().single();
    testProjectId = proj.id;

    const { data: script } = await supabaseAdmin.from('scripts').insert([{
      project_id: testProjectId, content: {}, created_by: s1Data.user.id, updated_by: s1Data.user.id
    }]).select().single();
    testScriptId = script.id;

    // Create 5 Base Assets
    for(let i=0; i<5; i++) {
      const { data: a } = await supabaseAdmin.from('assets').insert([{
        workspace_id: testWorkspaceId, project_id: testProjectId, type: 'character', name: `Asset ${i}`, created_by: s1Data.user.id, updated_by: s1Data.user.id
      }]).select().single();
      testAssets.push(a.id);
    }
    report.Setup = 'PASS';


    // Helper to generate TipTap JSON with N mentions
    const generateTipTapDoc = (numMentions) => {
      const content = [];
      for(let i=0; i<numMentions; i++) {
        // distribute across the 5 test assets
        const assetId = testAssets[i % 5];
        content.push({
          type: 'paragraph',
          content: [{
            type: 'mention',
            attrs: { id: assetId, label: `Asset ${i % 5}`, version: 1 }
          }]
        });
      }
      return { type: 'doc', content };
    };

    // ==========================================
    // TEST 1: INSERT 100 MENTIONS -> SAVE -> VERIFY 100 USAGE RECORDS (Wait, 100 uses of 5 assets should be 5 unique usage records due to constraints!)
    // CTO Note: Unique constraint is (workspace, project, entity_type, entity_id, asset_id)
    // So 100 mentions of 5 assets = 5 usage rows.
    // ==========================================
    console.log('\n[Test 1] Sync 100 Mentions (Distributed over 5 assets)');
    const doc100 = generateTipTapDoc(100);
    const { data: sync1, error: err1 } = await supabaseAdmin.rpc('sync_asset_usage', {
      p_workspace_id: testWorkspaceId,
      p_project_id: testProjectId,
      p_entity_type: 'script',
      p_entity_id: testScriptId, p_user_id: s1Data.user.id,
      p_document_json: doc100
    });
    if (err1) throw new Error(`Sync failed: ${err1.message}`);
    
    const { count: count1 } = await supabaseAdmin.from('asset_usage').select('*', { count: 'exact' }).eq('entity_id', testScriptId);
    if (count1 !== 5) throw new Error(`Expected 5 unique usage records, found ${count1}`);
    report.Test1_Insert100 = 'PASS';

    // ==========================================
    // TEST 2: DELETE 20 MENTIONS -> SAVE (Reduce to 2 unique assets)
    // ==========================================
    console.log('\n[Test 2] Differential Delete Sync');
    const docReduced = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'mention', attrs: { id: testAssets[0], version: 1 } }] },
        { type: 'paragraph', content: [{ type: 'mention', attrs: { id: testAssets[1], version: 1 } }] }
      ]
    };
    await supabaseAdmin.rpc('sync_asset_usage', {
      p_workspace_id: testWorkspaceId, p_project_id: testProjectId, p_entity_type: 'script', p_entity_id: testScriptId, p_user_id: s1Data.user.id, p_document_json: docReduced
    });
    
    const { count: count2 } = await supabaseAdmin.from('asset_usage').select('*', { count: 'exact' }).eq('entity_id', testScriptId);
    if (count2 !== 2) throw new Error(`Expected 2 remaining usage records, found ${count2}`);
    report.Test2_Delete20 = 'PASS';

    // ==========================================
    // TEST 3: CHANGE ASSET VERSION
    // ==========================================
    console.log('\n[Test 3] Version Capture Update');
    const docV2 = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'mention', attrs: { id: testAssets[0], version: 2 } }] }
      ]
    };
    await supabaseAdmin.rpc('sync_asset_usage', {
      p_workspace_id: testWorkspaceId, p_project_id: testProjectId, p_entity_type: 'script', p_entity_id: testScriptId, p_user_id: s1Data.user.id, p_document_json: docV2
    });
    
    const { data: usageRow } = await supabaseAdmin.from('asset_usage').select('inserted_version').eq('asset_id', testAssets[0]).single();
    if (usageRow.inserted_version !== 2) throw new Error(`Expected version 2, got ${usageRow.inserted_version}`);
    report.Test3_VersionCapture = 'PASS';

    // ==========================================
    // TEST 4: DUPLICATE PREVENTION
    // ==========================================
    console.log('\n[Test 4] Database Duplicate Prevention');
    const { error: dupErr } = await supabaseAdmin.from('asset_usage').insert([{
      workspace_id: testWorkspaceId, project_id: testProjectId, asset_id: testAssets[0], entity_type: 'script', entity_id: testScriptId, created_by: s1Data.user.id
    }]);
    if (!dupErr || !dupErr.code.includes('23505')) {
      throw new Error('Unique constraint failed or was missing.');
    }
    report.Test4_DuplicatePrevention = 'PASS';

    // ==========================================
    // TEST 5: 1000 MENTIONS PERFORMANCE SYNC
    // ==========================================
    console.log('\n[Test 5] 1000 Mentions Performance Test');
    // Generate 1000 unique assets
    const bulkAssets = [];
    for(let i=0; i<1000; i++) {
      bulkAssets.push({ workspace_id: testWorkspaceId, project_id: testProjectId, type: 'prop', name: `B${i}`, created_by: s1Data.user.id, updated_by: s1Data.user.id });
    }
    await supabaseAdmin.from('assets').insert(bulkAssets);
    
    // Fetch them to get IDs
    const { data: fetchedAssets } = await supabaseAdmin.from('assets').select('id').like('name', 'B%').limit(1000);
    
    const content1k = fetchedAssets.map(a => ({
      type: 'paragraph', content: [{ type: 'mention', attrs: { id: a.id, version: 1 } }]
    }));
    const doc1k = { type: 'doc', content: content1k };

    const t0 = performance.now();
    await supabaseAdmin.rpc('sync_asset_usage', {
      p_workspace_id: testWorkspaceId, p_project_id: testProjectId, p_entity_type: 'script', p_entity_id: testScriptId, p_user_id: s1Data.user.id, p_document_json: doc1k
    });
    const t1 = performance.now();
    
    const ms = t1 - t0;
    console.log(`Synced 1000 mentions in ${ms.toFixed(2)}ms`);
    if (ms > 5000) throw new Error('Performance degraded significantly (>5s)');
    report.Test5_Performance1000 = 'PASS';

  } catch (error) {
    console.error('\n❌ VALIDATION HALTED DUE TO ERROR:');
    console.error(error);
  } finally {
    console.log('\n=======================================');
    console.log('PHASE 2 VALIDATION REPORT');
    console.log(`Setup: ${report.Setup}`);
    console.log(`Test 1: ${report.Test1_Insert100}`);
    console.log(`Test 2: ${report.Test2_Delete20}`);
    console.log(`Test 3: ${report.Test3_VersionCapture}`);
    console.log(`Test 4: ${report.Test4_DuplicatePrevention}`);
    console.log(`Test 5: ${report.Test5_Performance1000}`);
    const overall = Object.values(report).every(v => v === 'PASS') ? 'PASS' : 'FAIL';
    console.log(`Overall: ${overall}`);
    console.log('=======================================');
  }
}

runPhase2Validation();
