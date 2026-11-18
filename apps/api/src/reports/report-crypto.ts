import {createCipheriv,randomBytes} from 'node:crypto';
export function reportKey(value=process.env.REPORT_ENCRYPTION_KEY_HEX):Buffer|null{return value&&/^[0-9a-fA-F]{64}$/.test(value)?Buffer.from(value,'hex'):null;}
function aad(kind:'case'|'appeal',id:string){return Buffer.from(`unihood:report-evidence:v1:${kind}:${id}`,'utf8');}
export function encryptReportEvidence(kind:'case'|'appeal',id:string,text:string,key:Buffer){if(key.length!==32)throw new Error('Invalid report key');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv,{authTagLength:16});cipher.setAAD(aad(kind,id));return {ciphertext:Buffer.concat([cipher.update(text,'utf8'),cipher.final()]),iv,tag:cipher.getAuthTag()};}
