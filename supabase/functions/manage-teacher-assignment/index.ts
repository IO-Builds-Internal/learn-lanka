import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ManageTeacherAction = 'promote' | 'set_subject' | 'set_image' | 'remove';

interface ManageTeacherRequest {
  action: ManageTeacherAction;
  userId: string;
  subjectId?: string;
  teacherImageUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: callerUser },
    } = await userClient.auth.getUser();

    if (!callerUser) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerRoles, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .in('role', ['admin', 'moderator']);

    if (roleError) throw roleError;

    if (!callerRoles?.length) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, subjectId, teacherImageUrl }: ManageTeacherRequest = await req.json();

    if (!action || !userId) {
      return new Response(JSON.stringify({ success: false, error: 'action and userId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === 'promote') {
      if (!subjectId || !teacherImageUrl) {
        throw new Error('subjectId and teacherImageUrl are required to promote a teacher');
      }

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ subject_id: subjectId, teacher_image_url: teacherImageUrl })
        .eq('id', userId);

      if (profileError) throw profileError;

      const { error: roleInsertError } = await adminClient
        .from('user_roles')
        .upsert({ user_id: userId, role: 'teacher' }, { onConflict: 'user_id,role' });

      if (roleInsertError) throw roleInsertError;
    }

    if (action === 'set_subject') {
      if (!subjectId) {
        throw new Error('subjectId is required to update teacher subject');
      }

      const { error } = await adminClient
        .from('profiles')
        .update({ subject_id: subjectId })
        .eq('id', userId);

      if (error) throw error;
    }

    if (action === 'set_image') {
      if (!teacherImageUrl) {
        throw new Error('teacherImageUrl is required to update teacher image');
      }

      const { error } = await adminClient
        .from('profiles')
        .update({ teacher_image_url: teacherImageUrl })
        .eq('id', userId);

      if (error) throw error;
    }

    if (action === 'remove') {
      const { error: removeRoleError } = await adminClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'teacher');

      if (removeRoleError) throw removeRoleError;

      const { error: clearProfileError } = await adminClient
        .from('profiles')
        .update({ subject_id: null })
        .eq('id', userId);

      if (clearProfileError) throw clearProfileError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('manage-teacher-assignment error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});