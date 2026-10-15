import { createClient } from '@supabase/supabase-js';

export async function GET(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return Response.json({isAdmin:false},{headers:{'Cache-Control':'private, no-store'}});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||!secret)return Response.json({isAdmin:false},{headers:{'Cache-Control':'private, no-store'}});
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await auth.auth.getUser(token);
 if(error||!user?.email_confirmed_at)return Response.json({isAdmin:false},{headers:{'Cache-Control':'private, no-store'}});
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:role,error:roleError}=await admin.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError)return Response.json({isAdmin:false},{status:503,headers:{'Cache-Control':'private, no-store'}});
 return Response.json({isAdmin:!!role},{headers:{'Cache-Control':'private, no-store'}});
}
