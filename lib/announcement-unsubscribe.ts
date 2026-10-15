import {createHmac,timingSafeEqual} from 'node:crypto';
const purpose='all-in-email-unsubscribe-v1';
function secret(){const s=process.env.ANNOUNCEMENT_UNSUBSCRIBE_SECRET;if(!s||s.length<32)throw new Error('Unsubscribe signing secret missing');return s;}
export function unsubscribeToken(userId:string){
 const signature=createHmac('sha256',secret()).update(purpose+':'+userId).digest('hex');
 return userId+'.'+signature;
}
export function verifyUnsubscribeToken(token:string):string|null{
 const match=/^([0-9a-f-]{36})\.([0-9a-f]{64})$/i.exec(token);
 if(!match)return null;
 const expected=createHmac('sha256',secret()).update(purpose+':'+match[1]).digest();
 const actual=Buffer.from(match[2],'hex');
 return actual.length===expected.length&&timingSafeEqual(actual,expected)?match[1]:null;
}
