import {BadRequestException,PayloadTooLargeException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {MAX_MEDIA_BYTES} from '@unihood/contracts';
sharp.concurrency(1);
sharp.cache(false);
export function imageMime(buffer:Buffer){if(buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'image/jpeg';if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'image/webp';return null;}
export async function sanitizeImage(buffer:Buffer,declaredMime:string){if(buffer.length>MAX_MEDIA_BYTES)throw new PayloadTooLargeException();const mime=imageMime(buffer);if(!mime||mime!==declaredMime)throw new BadRequestException();
 try{const input=sharp(buffer,{limitInputPixels:16*1024*1024,failOn:'error',sequentialRead:true});const metadata=await input.metadata();if(!metadata.width||!metadata.height||metadata.width>16384||metadata.height>16384||(metadata.pages??1)>1||mime!==`image/${metadata.format==='jpeg'?'jpeg':metadata.format}`)throw new Error();
  // No keepMetadata/withExif: original bytes, filename and GPS never persist.
  const result=await input.rotate().resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:82}).timeout({seconds:3}).toBuffer({resolveWithObject:true});if(result.data.length>MAX_MEDIA_BYTES)throw new PayloadTooLargeException();
  const after=await sharp(result.data).metadata();if(after.exif||after.xmp||after.iptc||after.icc||after.orientation)throw new Error();return {buffer:result.data,width:result.info.width,height:result.info.height,checksum:createHash('sha256').update(result.data).digest('hex')};
 }catch(error){if(error instanceof PayloadTooLargeException)throw error;throw new BadRequestException();}
}
