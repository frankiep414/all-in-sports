import {gamePublishedEmail} from '../../../../lib/notification-email-templates';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview')return new Response('Not found',{status:404});
 const site=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
 const game='b96b1b29-4a1f-4e7e-ae2c-a923a656364e';
 const register=site+'/play?game='+encodeURIComponent(game);
 const email=gamePublishedEmail({title:'TEST - All In Sports Notification',venue:'STAGING ONLY - NOT A REAL GAME',startsAt:'Sunday, November 1, 2026 at 12:47 AM',registerUrl:register,unsubscribeUrl:site+'/unsubscribe?token=PREVIEW_ONLY'});
 return new Response(email.html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}