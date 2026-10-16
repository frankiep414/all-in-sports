const inbox='allinsports.imom@gmail.com';
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
export async function sendAdminRegistrationAlert(input:{kind:'pickup'|'league'|'event';id:string;name:string;email:string;title:string;status:string;details?:string[]}):Promise<boolean>{
 const key=process.env.RESEND_API_KEY||process.env.CARMITA_RESEND_API_KEY;
 if(!key){console.error('Admin registration alert email key missing');return false;}
 const label=input.kind==='pickup'?'Pickup game':input.kind==='league'?'League':'Event';
 const lines=[`Type: ${label}`,`Activity: ${input.title}`,`Name: ${input.name}`,`Email: ${input.email}`,`Status: ${input.status}`,`Registration ID: ${input.id}`,...(input.details||[])];
 try{
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`all-in-admin-${input.kind}-${input.id}`},body:JSON.stringify({from:'All In Sports <noreply@allinsportsnj.com>',to:[inbox],subject:`New ${label} registration: ${input.title.replace(/[\r\n]/g,' ').slice(0,100)}`,text:lines.join('\n'),html:`<h2>New ${label} registration</h2><ul>${lines.map(line=>`<li>${escapeHtml(line)}</li>`).join('')}</ul>`}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok){console.error('Admin registration alert failed',r.status);return false;}
  return true;
 }catch(e){console.error('Admin registration alert request failed',e);return false;}
}
