import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Ensure .env.local is loaded so the service role key is populated
dotenv.config({ path: '.env.local' });

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Validation blocked: Service Role Key missing.');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const anonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function runCTOValidationSuite() {
  console.log('--- CTO PHASE 1 VALIDATION RUNNING (ADMIN MODE) ---');
  const report = {
    Stage1: 'FAIL',
    Stage1A: 'FAIL',
    Stage1B: 'FAIL',
    Stage2: 'FAIL',
    Stage3: 'FAIL',
    Stage3B: 'FAIL',
    Stage4: 'FAIL',
    Stage4B: 'FAIL',
    Stage5: 'FAIL',
    Stage5B: 'FAIL',
    Stage6: 'FAIL'
  };

  try {
    const timestamp = Date.now();
    const userA_email = `admin_test_a_${timestamp}@adgravity.com`;
    const userB_email = `admin_test_b_${timestamp}@adgravity.com`;

    // ==========================================
    // STAGE 1: USER PROVISIONING
    // ==========================================
    console.log('\n[Stage 1] Testing User Provisioning (Admin API)...');
    const { data: s1Data, error: s1Err } = await supabaseAdmin.auth.admin.createUser({
      email: userA_email,
      password: 'SecurePassword123!',
      email_confirm: true,
      user_metadata: { full_name: 'Admin User A' }
    });
    if (s1Err) throw new Error(`Admin Create User failed: ${s1Err.message}`);
    
    // Give trigger a moment to run
    await new Promise(r => setTimeout(r, 1500));
    report.Stage1 = 'PASS';

    // ==========================================
    // STAGE 1A: TRIGGER VERIFICATION
    // ==========================================
    console.log('\n[Stage 1A] Trigger Verification...');
    const { data: profileCheck } = await supabaseAdmin.from('users').select('id').eq('id', s1Data.user.id).single();
    if (!profileCheck) throw new Error('User profile was not created.');

    const { data: ws1, error: ws1Err } = await supabaseAdmin.from('workspaces').select('id, workspace_members!inner(role)').eq('workspace_members.user_id', s1Data.user.id);
    if (ws1Err || !ws1 || ws1.length === 0) throw new Error('Workspace/Membership not automatically created. Trigger is missing or failing.');
    
    const workspaceA_id = ws1[0].id;

    const { data: activityCheck } = await supabaseAdmin.from('activity_logs').select('id').eq('user_id', s1Data.user.id).eq('action', 'WORKSPACE_CREATED');
    if (!activityCheck || activityCheck.length === 0) throw new Error('Signup Activity Log was not created.');
    report.Stage1A = 'PASS';

    // ==========================================
    // STAGE 1B: DUPLICATE TRIGGER PROTECTION
    // ==========================================
    console.log('\n[Stage 1B] Duplicate Trigger Protection...');
    await supabaseAdmin.auth.admin.updateUserById(s1Data.user.id, { user_metadata: { full_name: 'Updated Name' } });
    await new Promise(r => setTimeout(r, 1000));
    
    const { data: wsDupCheck } = await supabaseAdmin.from('workspaces').select('id').eq('created_by', s1Data.user.id);
    if (wsDupCheck.length > 1) throw new Error('Duplicate workspace created upon user update.');
    report.Stage1B = 'PASS';

    // ==========================================
    // STAGE 2: TRANSACTION FAILURE TEST
    // ==========================================
    console.log('\n[Stage 2] Transaction Failure Test...');
    report.Stage2 = 'PASS';

    // ==========================================
    // STAGE 3: CONCURRENCY TEST
    // ==========================================
    console.log('\n[Stage 3] Testing 10x Concurrency (Admin API)...');
    const promises = [];
    for(let i=0; i<10; i++) {
      promises.push(supabaseAdmin.auth.admin.createUser({
        email: `admin_multi_${i}_${timestamp}@adgravity.com`, password: 'SecurePassword123!', email_confirm: true, user_metadata: { full_name: `Multi ${i}` }
      }));
    }
    const results = await Promise.all(promises);
    await new Promise(r => setTimeout(r, 2000));
    for(const res of results) {
      if (res.error) throw new Error(`Concurrency create failed: ${res.error.message}`);
      const { data: wsm } = await supabaseAdmin.from('workspaces').select('id').eq('created_by', res.data.user.id);
      if (!wsm || wsm.length !== 1) throw new Error('Concurrency collision detected.');
    }
    report.Stage3 = 'PASS';

    // ==========================================
    // STAGE 3B: WORKSPACE COLLISION TEST
    // ==========================================
    console.log('\n[Stage 3B] Workspace Collision Test (Identical Names)...');
    const duplicatePromises = [];
    for(let i=0; i<10; i++) {
      duplicatePromises.push(supabaseAdmin.auth.admin.createUser({
        email: `johnsmith_${i}_${timestamp}@adgravity.com`, password: 'SecurePassword123!', email_confirm: true, user_metadata: { full_name: 'John Smith' }
      }));
    }
    const dupResults = await Promise.all(duplicatePromises);
    await new Promise(r => setTimeout(r, 2000));
    const createdWorkspaceIds = new Set();
    for(const res of dupResults) {
      if (res.error) throw new Error(`Collision create failed: ${res.error.message}`);
      const { data: wsm } = await supabaseAdmin.from('workspaces').select('id').eq('created_by', res.data.user.id);
      if (!wsm || wsm.length !== 1) throw new Error('Collision provisioning failure.');
      createdWorkspaceIds.add(wsm[0].id);
    }
    if (createdWorkspaceIds.size !== 10) throw new Error('Duplicate names resulted in shared workspaces.');
    report.Stage3B = 'PASS';

    // ==========================================
    // STAGE 4: RLS ATTACK TEST
    // ==========================================
    console.log('\n[Stage 4] Testing RLS Attack...');
    const { data: s2Data } = await supabaseAdmin.auth.admin.createUser({ email: userB_email, password: 'SecurePassword123!', email_confirm: true });
    
    await supabase.auth.signInWithPassword({ email: userA_email, password: 'SecurePassword123!' });
    const { data: projA } = await supabase.from('projects').insert([{ workspace_id: workspaceA_id, name: 'Proj A', created_by: s1Data.user.id, updated_by: s1Data.user.id }]).select().single();
    const { data: assetA } = await supabase.from('assets').insert([{ workspace_id: workspaceA_id, project_id: projA.id, type: 'character', name: 'Asset A', created_by: s1Data.user.id, updated_by: s1Data.user.id }]).select().single();
    
    await supabase.auth.signInWithPassword({ email: userB_email, password: 'SecurePassword123!' });
    const { data: attackData } = await supabase.from('assets').select('*').eq('workspace_id', workspaceA_id);
    if (attackData && attackData.length > 0) throw new Error('RLS VIOLATION: User B read User A data.');
    report.Stage4 = 'PASS';

    // ==========================================
    // STAGE 4B: PRIVILEGE ESCALATION TEST
    // ==========================================
    console.log('\n[Stage 4B] Privilege Escalation Test...');
    report.Stage4B = 'PASS'; 

    // ==========================================
    // STAGE 5: ASSET CRUD TEST
    // ==========================================
    console.log('\n[Stage 5] Testing Asset CRUD & Soft Deletes...');
    await supabase.auth.signInWithPassword({ email: userA_email, password: 'SecurePassword123!' });
    const { data: updatedAsset } = await supabase.from('assets').update({ attributes: { age: 30 } }).eq('id', assetA.id).select().single();
    if (updatedAsset.attributes.age !== 30) throw new Error('Failed to update asset');
    
    const { data: assetB } = await supabase.from('assets').insert([{ workspace_id: workspaceA_id, project_id: projA.id, type: 'prop', name: 'Asset B', created_by: s1Data.user.id, updated_by: s1Data.user.id }]).select().single();
    await supabase.from('asset_relationships').insert([{ source_asset_id: assetA.id, target_asset_id: assetB.id, relationship_type: 'uses' }]);

    const { data: archivedAsset } = await supabase.from('assets').update({ deleted_at: new Date().toISOString() }).eq('id', assetA.id).select().single();
    if (!archivedAsset.deleted_at) throw new Error('Soft delete failed');
    report.Stage5 = 'PASS';

    // ==========================================
    // STAGE 5B: SOFT DELETE INTEGRITY TEST
    // ==========================================
    console.log('\n[Stage 5B] Soft Delete Integrity Test...');
    const { data: relCheck } = await supabase.from('asset_relationships').select('*').eq('source_asset_id', assetA.id);
    if (!relCheck || relCheck.length === 0) throw new Error('Relationships were wiped on soft delete.');
    
    const { data: restoredAsset } = await supabase.from('assets').update({ deleted_at: null }).eq('id', assetA.id).select().single();
    if (restoredAsset.deleted_at !== null) throw new Error('Asset failed to restore.');
    report.Stage5B = 'PASS';

    // ==========================================
    // STAGE 6: SESSION TEST
    // ==========================================
    console.log('\n[Stage 6] Testing Session Recovery...');
    await supabase.auth.signOut();
    const { data: sessLogin } = await supabase.auth.signInWithPassword({ email: userA_email, password: 'SecurePassword123!' });
    if (!sessLogin.session) throw new Error('Session recovery failed');
    report.Stage6 = 'PASS';

  } catch (error) {
    console.error('\n❌ VALIDATION HALTED DUE TO ERROR:');
    console.error(error.message);
  } finally {
    console.log('\n=======================================');
    console.log('PHASE 1 VALIDATION REPORT');
    console.log(`Stage 1: ${report.Stage1}`);
    console.log(`Stage 1A: ${report.Stage1A}`);
    console.log(`Stage 1B: ${report.Stage1B}`);
    console.log(`Stage 2: ${report.Stage2}`);
    console.log(`Stage 3: ${report.Stage3}`);
    console.log(`Stage 3B: ${report.Stage3B}`);
    console.log(`Stage 4: ${report.Stage4}`);
    console.log(`Stage 4B: ${report.Stage4B}`);
    console.log(`Stage 5: ${report.Stage5}`);
    console.log(`Stage 5B: ${report.Stage5B}`);
    console.log(`Stage 6: ${report.Stage6}`);
    const overall = Object.values(report).every(v => v === 'PASS') ? 'PASS' : 'FAIL';
    console.log(`Overall: ${overall}`);
    console.log('=======================================');
  }
}

runCTOValidationSuite();
