// Original flat-color synthetic fixture, not a property photograph.
// Deliberately embeds arbitrary GPS/XMP privacy canaries; never publish the input.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const sharp=createRequire(new URL('../../../apps/api/package.json',import.meta.url))('sharp');
const tiff=Buffer.alloc(128);
tiff.write('II',0,'ascii');tiff.writeUInt16LE(42,2);tiff.writeUInt32LE(8,4);
tiff.writeUInt16LE(1,8);tiff.writeUInt16LE(0x8825,10);tiff.writeUInt16LE(4,12);tiff.writeUInt32LE(1,14);tiff.writeUInt32LE(26,18);
tiff.writeUInt16LE(4,26);
function entry(offset,tag,type,count,value){tiff.writeUInt16LE(tag,offset);tiff.writeUInt16LE(type,offset+2);tiff.writeUInt32LE(count,offset+4);tiff.writeUInt32LE(value,offset+8);}
entry(28,1,2,2,78);entry(40,2,5,3,80);entry(52,3,2,2,69);entry(64,4,5,3,104);
for(const [base,values] of [[80,[42,7,1]],[104,[43,5,1]]])for(let i=0;i<3;i++){tiff.writeUInt32LE(values[i],base+i*8);tiff.writeUInt32LE(1,base+i*8+4);}
function app1(payload){const header=Buffer.from([255,225,0,0]);header.writeUInt16BE(payload.length+2,2);return Buffer.concat([header,payload]);}
const exif=app1(Buffer.concat([Buffer.from('Exif\0\0','binary'),tiff]));
const xmp=app1(Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0','binary'),Buffer.from('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" exif:GPSLatitude="42,7,1N" exif:GPSLongitude="43,5,1E" dc:description="SYNTHETIC_PRIVATE_CANARY"/></rdf:RDF></x:xmpmeta>')]));
const image=await sharp({create:{width:24,height:16,channels:3,background:{r:8,g:126,b:121}}}).jpeg().toBuffer();
const output=Buffer.concat([image.subarray(0,2),exif,xmp,image.subarray(2)]);
await writeFile(process.argv[2]??new URL('boarding-media.synthetic.jpg',import.meta.url),output,{flag:'wx'});
console.log('Created synthetic metadata-canary fixture; no real photograph or location.');
