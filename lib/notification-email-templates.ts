// Pure email templates. This module never sends email or schedules delivery.
// All player-controlled fields are escaped before inclusion in HTML.
export type EmailTemplate={subject:string;html:string;text:string};
function escapeHtml(value:string):string{
 return value.replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[char]||char));
}
function shell(heading:string,body:string):string{
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
 '<body style="font-family:Arial,sans-serif;background:#0b1018;color:#f4f7fb;padding:24px">'+
 '<main style="max-width:560px;margin:auto"><h1 style="color:#a9dbff">ALL IN SPORTS</h1>'+
 '<h2>'+escapeHtml(heading)+'</h2>'+body+
 '<p style="color:#a7b4c4;font-size:13px">All In Sports NJ · This is an automated message. Never send money based only on an email.</p></main></body></html>';
}
export function registrationEmail(input:{
 playerName:string;gameTitle:string;venue:string;startsAt:string;
 paymentReference:string;status:'pending_payment'|'waitlisted'|'offered';
}):EmailTemplate{
 const name=input.playerName.trim()||'Player';
 const waiting=input.status==='waitlisted';
 const subject=waiting?'All In Sports — You joined the waitlist':'All In Sports — Registration received';
 const details=`Game: ${input.gameTitle}\nVenue: ${input.venue}\nStart: ${input.startsAt}\nReference: ${input.paymentReference}`;
 const note=waiting
  ?'You are on the waitlist. A spot is not guaranteed.'
  :'Your registration has been received. Your spot is not confirmed as paid. Payment collection is not enabled in this test.';
 const profileUrl='https://allinsportsnj.com/my-all-in';
 const text=`Hi ${name},\n\n${note}\n\n${details}\n\nView your registration: ${profileUrl}\n\nAll In Sports NJ`;
 const html=shell(subject,
  '<p style="font-size:17px;line-height:1.6">Hi '+escapeHtml(name)+',</p>'+
  '<p style="font-size:17px;line-height:1.6">'+escapeHtml(note)+'</p>'+
  '<section style="padding:20px;background:#172434;border:1px solid #34485d;border-radius:12px;margin:22px 0">'+
  '<h3 style="margin:0 0 14px;color:#a9dbff;font-size:20px">YOUR GAME DETAILS</h3>'+
  '<p style="font-size:16px;line-height:1.9;margin:0"><strong>Game:</strong> '+escapeHtml(input.gameTitle)+'<br>'+
  '<strong>Venue:</strong> '+escapeHtml(input.venue)+'<br>'+
  '<strong>Start:</strong> '+escapeHtml(input.startsAt)+'<br>'+
  '<strong>Reference:</strong> '+escapeHtml(input.paymentReference)+'</p></section>'+
  '<p style="margin:26px 0"><a href="'+profileUrl+'" style="display:inline-block;background:#a9dbff;color:#07111d;text-decoration:none;padding:15px 24px;border-radius:10px;font-size:17px;font-weight:700">VIEW MY REGISTRATION →</a></p>');
 return {subject,html,text};
}
export function gamePublishedEmail(input:{title:string;venue:string;startsAt:string}):EmailTemplate{
 const subject='New All In Sports game: '+input.title;
 const text=`A new game has been posted.\nGame: ${input.title}\nVenue: ${input.venue}\nStart: ${input.startsAt}\n\nAll In Sports NJ`;
 const html=shell('New game posted','<p>A new game has been posted.</p><p><strong>Game:</strong> '+
  escapeHtml(input.title)+'<br><strong>Venue:</strong> '+escapeHtml(input.venue)+
  '<br><strong>Start:</strong> '+escapeHtml(input.startsAt)+'</p>');
 return {subject,html,text};
}


export function pickupPaymentConfirmedEmail(input:{
 gameTitle:string;venue:string;startsAt:string;amountCents:number;reference:string;
}):EmailTemplate{
 const amount='$'+(input.amountCents/100).toFixed(2);
 const profileUrl='https://allinsportsnj.com/my-all-in';
 const subject='All In Sports — Payment confirmed: '+input.gameTitle;
 const details='Game: '+input.gameTitle+'\nVenue: '+input.venue+'\nStart: '+input.startsAt+'\nAmount paid: '+amount+'\nReference: '+input.reference;
 const text='Your pickup payment was confirmed and your spot is reserved.\n\n'+details+'\n\nView your registration: '+profileUrl+'\n\nAll In Sports NJ';
 const html=shell('Payment confirmed — you’re in!',
  '<p>Your pickup payment was confirmed and your spot is reserved.</p>'+
  '<section style="padding:20px;background:#172434;border:1px solid #34485d;border-radius:12px;margin:22px 0">'+
  '<p style="line-height:1.9;margin:0"><strong>Game:</strong> '+escapeHtml(input.gameTitle)+'<br>'+
  '<strong>Venue:</strong> '+escapeHtml(input.venue)+'<br>'+
  '<strong>Start:</strong> '+escapeHtml(input.startsAt)+'<br>'+
  '<strong>Amount paid:</strong> '+escapeHtml(amount)+'<br>'+
  '<strong>Reference:</strong> '+escapeHtml(input.reference)+'</p></section>'+
  '<p><a href="'+profileUrl+'" style="display:inline-block;background:#a9dbff;color:#07111d;padding:14px 22px;border-radius:9px;font-weight:bold;text-decoration:none">VIEW MY ALL IN →</a></p>');
 return {subject,html,text};
}
