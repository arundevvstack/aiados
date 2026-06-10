import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pyzwkvcbfyssxobzeuml.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z-7h5-hxPvMC3UURhPRxjQ_NPabsBSe';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Starting enterprise seed process...');
  
  // 1. Create Workspace
  const { data: workspace, error: wErr } = await supabase.from('workspaces').insert([
    { name: 'AdGravity Default Agency', tier: 'enterprise' }
  ]).select().single();
  
  if (wErr || !workspace) {
    console.error('Failed to create workspace:', wErr);
    return;
  }
  console.log('Workspace created:', workspace.id);

  // 2. Create Project
  const { data: project, error: pErr } = await supabase.from('projects').insert([
    { workspace_id: workspace.id, name: 'Nike Campaign 2027', status: 'In Progress' }
  ]).select().single();
  
  if (pErr || !project) {
    console.error('Failed to create project:', pErr);
    return;
  }
  console.log('Project created:', project.id);

  // 3. Create Story
  await supabase.from('stories').insert([
    { 
      project_id: project.id, 
      version: 1,
      title: 'The Edge of Tomorrow', 
      concept: 'A high-octane journey through the desert showcasing the unyielding spirit of innovation.', 
      tagline: 'Defy gravity.' 
    }
  ]);

  // 4. Create Living Assets
  const assetsToInsert = [
    { id: '@amara', project_id: project.id, type: 'character', name: 'Amara', attributes: { age: 28, appearance: 'Elegant, tall, short dark hair', costume: 'Black Suit' } },
    { id: '@ceo', project_id: project.id, type: 'character', name: 'The CEO', attributes: { age: 55, appearance: 'Silver hair, sharp features', costume: 'Tailored Navy Suit' } },
    { id: '@dubai_desert', project_id: project.id, type: 'location', name: 'Dubai Desert', attributes: { mood: 'Warm, vast, luxurious', timeOfDay: 'Golden Hour' } },
    { id: '@perfume_bottle', project_id: project.id, type: 'prop', name: 'Perfume Bottle', attributes: { materials: 'Crystal, Gold', brand: 'Luxury Brand' } },
    { id: '@rolls_royce', project_id: project.id, type: 'prop', name: 'Rolls Royce', attributes: { color: 'Midnight Black' } },
    { id: '@black_suit', project_id: project.id, type: 'wardrobe', name: 'Black Suit', attributes: { fabric: 'Silk blend', designer: 'Custom' } }
  ];
  
  await supabase.from('assets').insert(assetsToInsert);

  // 5. Create Script
  const { data: script, error: sErr } = await supabase.from('scripts').insert([
    { 
      project_id: project.id, 
      scene_number: 1, 
      location_id: '@dubai_desert', 
      action: 'Camera follows @amara walking through @dubai_desert holding @perfume_bottle.',
      status: 'draft'
    }
  ]).select().single();

  if (script) {
    // 6. Map Assets to Script (Many-to-Many)
    await supabase.from('script_assets').insert([
      { script_id: script.id, asset_id: '@amara', usage_type: 'character_present' },
      { script_id: script.id, asset_id: '@perfume_bottle', usage_type: 'prop_used' }
    ]);
  }

  // 7. Audit Log Entry
  await supabase.from('audit_logs').insert([
    {
      workspace_id: workspace.id,
      entity_type: 'project',
      entity_id: project.id,
      action: 'PROJECT_CREATED'
    }
  ]);

  console.log('Enterprise seed process complete!');
}

seed();
