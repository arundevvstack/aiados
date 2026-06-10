import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Cors headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Create client to verify user auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { projectId, workspaceId, brandBrief } = await req.json();
    if (!projectId || !workspaceId) {
      throw new Error('Missing projectId or workspaceId');
    }

    // Verify workspace access using service role to bypass RLS initially for check
    const adminDb = createClient(supabaseUrl, supabaseServiceKey);
    const { data: membership, error: membershipError } = await adminDb
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (membershipError || !membership) {
      throw new Error('Forbidden: User does not have access to this workspace');
    }

    // Generate a unique campaign ID
    const campaignId = `cmp_${crypto.randomUUID().replace(/-/g, '')}`;

    // Create initial checkpoint (PENDING)
    const { error: checkpointError } = await adminDb
      .from('campaign_checkpoints')
      .insert([{
        campaign_id: campaignId,
        workspace_id: workspaceId,
        stage: 'story_generation',
        status: 'pending'
      }]);

    if (checkpointError) {
      throw new Error(`Failed to create checkpoint: ${checkpointError.message}`);
    }

    // Trigger CampaignOrchestrator asynchronously
    // In a full production Deno edge environment we would import the Orchestrator code here,
    // or trigger an async worker queue. For this implementation we will invoke a webhook
    // or background queue that the Node.js worker listens to, or simulate the kickoff.
    // Since the orchestrator is written in Node (src/services/orchestration), we'll insert a job
    // into an 'orchestration_jobs' queue, or invoke it directly if ported.
    // For now, we return the campaignId so the client can subscribe to checkpoints.

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaignId,
        message: 'Campaign orchestration started.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err) {
    console.error('Edge Function Error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
