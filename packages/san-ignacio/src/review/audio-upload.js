import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
function invalid(message,status=400){const error=new Error(message);error.status=status;throw error;}
function audioFormat(buffer){
 if(buffer.length<16)return null;
 if(buffer.toString('ascii',0,3)==='ID3'||buffer[0]===255&&(buffer[1]&224)===224)return 'mp3';
 if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WAVE')return 'wav';
 if(buffer.toString('ascii',4,8)==='ftyp')return 'mov';
 if(buffer.toString('ascii',0,4)==='OggS')return 'ogg';
 if(buffer.toString('ascii',0,4)==='fLaC')return 'flac';
 if(buffer.subarray(0,16).equals(Buffer.from('3026b2758e66cf11a6d900aa0062ce6c','hex')))return 'asf';
 return null;
}
export async function saveAudioUpload(file,{local,dataPath,user,saveDocument,cloudinaryClient}={}){
 if(!file)invalid('Selecciona un archivo de audio.');
 const format=audioFormat(file.buffer);if(!format)invalid('Usa un archivo de audio MP3, WAV, M4A, OGG, FLAC o WMA válido.');
 if(!local&&!cloudinaryClient&&(!process.env.CLOUDINARY_CLOUD_NAME||!process.env.CLOUDINARY_API_KEY||!process.env.CLOUDINARY_API_SECRET))invalid('El almacenamiento remoto de audios todavía no está configurado.',503);
 const temporary=await fsp.mkdtemp(path.join(os.tmpdir(),'san-ignacio-audio-')),input=path.join(temporary,'input'),output=path.join(temporary,'audio.mp3'),id='audio-'+crypto.randomBytes(16).toString('hex');
 let localFile;
 try{
  await fsp.writeFile(input,file.buffer);
  try{await exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-protocol_whitelist','file,pipe','-f',format,'-i',input,'-map','0:a:0','-vn','-map_metadata','-1','-af','asetpts=N/SR/TB','-t','7201','-c:a','libmp3lame','-b:a','192k',output],{windowsHide:true,timeout:120000,maxBuffer:1024*1024});}
  catch(error){if(error.code==='ENOENT')invalid('El conversor de audio no está disponible en el servidor.',503);invalid('No se pudo leer el audio. Comprueba el archivo o prueba con un MP3.');}
  const {stdout}=await exec('ffprobe',['-v','error','-show_entries','format=duration','-of','json',output],{windowsHide:true,timeout:15000});
  const duration=Number(JSON.parse(stdout).format?.duration);if(!Number.isFinite(duration)||duration<0.1||duration>7200)invalid('La grabación debe durar entre un segundo y dos horas.');
  if((await fsp.stat(output)).size>100*1024*1024)invalid('La copia MP3 supera los 100 MB. Divide la grabación en pistas más cortas.');
  let src;
  if(local){const directory=path.join(dataPath,'uploads');await fsp.mkdir(directory,{recursive:true});localFile=path.join(directory,id+'.mp3');await fsp.copyFile(output,localFile,fs.constants.COPYFILE_EXCL);src='/uploads/'+id+'.mp3';}
  else{
   let client=cloudinaryClient;
   if(!client){const {v2}=await import('cloudinary');v2.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});client=v2;}
   const result=await new Promise((resolve,reject)=>{const upload=client.uploader.upload_stream({resource_type:'video',folder:'san-ignacio/audio',public_id:id,overwrite:false},(error,value)=>error?reject(error):resolve(value));upload.on('error',reject);fs.createReadStream(output).on('error',reject).pipe(upload);});
   src=result.secure_url;if(!/^https:\/\/res\.cloudinary\.com\//.test(src))invalid('No se recibió una dirección válida para el audio.',502);
  }
  let filename=file.originalname||'Nueva grabación';if([...filename].every(character=>character.charCodeAt(0)<=255)){const decoded=Buffer.from(filename,'latin1').toString('utf8');if(!decoded.includes('\uFFFD'))filename=decoded;}
  const title=path.basename(filename).replace(/\.[^.]+$/,'').slice(0,240)||'Nueva grabación',now=new Date().toISOString(),track={id,src,title,detail:'',enabled:true};
  await saveDocument({id,type:'audio',draft:{src,title,duration},published:null,version:1,history:[],createdAt:now,updatedAt:now,updatedBy:user.name});
  return {track,duration};
 }catch(error){if(localFile)await fsp.rm(localFile,{force:true});throw error;}
 finally{await fsp.rm(temporary,{recursive:true,force:true});}
}
