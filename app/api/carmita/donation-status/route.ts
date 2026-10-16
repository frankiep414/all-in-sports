import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('session_id');
 if(!id||!/^cs_(?:test_|live_)?[A-Za-z0-9_]{10,}$/.test(id))return NextResponse.json({error:'Invalid session'},{status:400});
 const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)return NextResponse.json({error:'Unavailable'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from('carmita_donations').select('amount_cents,payment_status').eq('stripe_checkout_session_id',id).maybeSingle();
 if(error)return NextResponse.json({error:'Unable to check donation'},{status:503});
 if(!data)return NextResponse.json({error:'Donation not found'},{status:404});
 return NextResponse.json({status:data.payment_status==='paid'?'confirmed':data.payment_status==='pending'?'processing':'not_confirmed',...(data.payment_status==='paid'?{amountCents:data.amount_cents}:{})},{headers:{'Cache-Control':'no-store, private','X-Robots-Tag':'noindex'}});
}
