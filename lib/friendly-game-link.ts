export function friendlyGamePath(title:string,startsAt:string):string|null{
 const type=/\b(coed|co-ed)\b/i.test(title)?'coed':/\b(mens|men's|men)\b/i.test(title)?'mens':null;
 if(!type)return null;
 const date=new Date(startsAt);
 if(Number.isNaN(date.getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'}).formatToParts(date);
 const month=parts.find(p=>p.type==='month')?.value.toLowerCase();
 const day=parts.find(p=>p.type==='day')?.value;
 const year=parts.find(p=>p.type==='year')?.value;
 if(!month||!day||!year)return null;
 return '/play/'+type+'-'+month+'-'+day+'-'+year;
}
