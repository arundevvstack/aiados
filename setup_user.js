import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setup() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    console.log("Setting up user...");
    const email = 'chris@production.com';
    const password = 'password123';
    
    let { data: { user }, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Chris Director' }
    });
    
    if (userError && userError.message.toLowerCase().includes('already')) {
        console.log("User already exists. Updating password...");
        const users = await supabase.auth.admin.listUsers();
        const existingUser = users.data.users.find(u => u.email === email);
        if (existingUser) {
            await supabase.auth.admin.updateUserById(existingUser.id, { password });
            user = existingUser;
        } else {
             console.log("Could not find user in list");
             return;
        }
    } else if (userError) {
        console.error("Failed to create user:", userError);
        return;
    }
    
    console.log("User ready. ID:", user.id);
    
    // Check Workspace Users
    let { data: wu } = await supabase.from('workspace_users').select('workspace_id').eq('user_id', user.id);
    let workspaceId;
    
    if (!wu || wu.length === 0) {
        console.log("Creating workspace...");
        const res = await supabase.from('workspaces').insert([{ name: 'Production Studio' }]).select();
        workspaceId = res.data[0].id;
        await supabase.from('workspace_users').insert([{ workspace_id: workspaceId, user_id: user.id, role: 'owner' }]);
    } else {
        workspaceId = wu[0].workspace_id;
    }
    
    console.log("Workspace ready. ID:", workspaceId);
    
    // Check Project
    let { data: proj } = await supabase.from('projects').select('*').eq('workspace_id', workspaceId);
    if (!proj || proj.length === 0) {
        console.log("Creating project...");
        const res = await supabase.from('projects').insert([{ name: 'Test Campaign', workspace_id: workspaceId }]).select();
        if (res.error) console.error("Project error:", res.error);
    }
    
    console.log("\n✅ Setup complete! You can now login with:\nEmail: chris@production.com\nPassword: password123\n");
}

setup();
