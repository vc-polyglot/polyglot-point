import test from 'node:test';
import assert from 'node:assert/strict';
import {Writable} from 'node:stream';
import {initialTracks,readPlaylist,playlistRecord,publicPlaylist} from '../src/review/music-playlist.js';
import {musicPlayer} from '../src/review/music-player.js';
import {MusicAdmin} from '../assets/admin-music.js';
import {saveAudioUpload} from '../src/review/audio-upload.js';
import {waveFixture} from './audio-fixture.mjs';

test('La lista inicial sólo se usa sin configuración y una lista vacía se conserva vacía',()=>{
 assert.equal(readPlaylist([]).tracks.length,4);const record=playlistRecord({version:0,tracks:[]},[],{name:'QA'});assert.equal(record.version,1);assert.equal(readPlaylist([record]).tracks.length,0);assert.deepEqual(publicPlaylist([{...record,...record.published}]),[]);assert.equal(musicPlayer([{...record,...record.published}]),'');
 const input=initialTracks();input[0].enabled=false;const selected=playlistRecord({version:0,tracks:input},[],{name:'QA'});assert.equal(publicPlaylist([{...selected,...selected.published}]).length,3);
 assert.throws(()=>playlistRecord({version:0,tracks:input},[selected],{name:'QA'}),{status:409});
 assert.throws(()=>playlistRecord({version:0,tracks:[{...input[0],src:'https://attacker.invalid/audio.mp3'}]},[],{name:'QA'}),{status:400});
});

test('El panel reordena y retira sin guardar hasta pulsar Guardar lista; un conflicto conserva los cambios',async()=>{
 const notes={},flags=[],messages=[];let saved;
 const host={querySelector(selector){if(selector.includes(':invalid'))return null;return notes[selector]??={textContent:'',focus(){}};},querySelectorAll(){return [];}};
 const admin=new MusicAdmin({api:async(_url,options)=>{saved=JSON.parse(options.body);return {...saved,version:1};},status:text=>messages.push(text),onDirty:value=>flags.push(value)});Object.assign(admin,{host,playlist:{version:0,tracks:initialTracks()}});
 const second=admin.playlist.tracks[1].id;admin.action('up',1);assert.equal(admin.playlist.tracks[0].id,second);admin.action('toggle',0);assert.equal(admin.playlist.tracks[0].enabled,false);assert.equal(saved,undefined);assert.equal(flags.at(-1),true);
 await admin.save();assert.equal(saved.tracks[0].id,second);assert.equal(flags.at(-1),false);assert.equal(admin.playlist.version,1);
 admin.action('toggle',0);admin.api=async()=>{throw Error('Otra sesión cambió la lista');};await admin.save();assert.equal(admin.playlist.tracks[0].enabled,true);assert.equal(flags.at(-1),true);assert.match(messages.at(-1),/Otra sesión/);
});

test('La subida remota convierte WAV a MP3 y almacena el audio usando Cloudinary como video',async()=>{
 let options,record;const bytes=[];const cloudinaryClient={uploader:{upload_stream(config,callback){options=config;return new Writable({write(chunk,_encoding,next){bytes.push(chunk);next();},final(next){callback(null,{secure_url:'https://res.cloudinary.com/demo/video/upload/v1/san-ignacio/audio/qa.mp3'});next();}});}}};
 const result=await saveAudioUpload({buffer:waveFixture(),originalname:'Meditación QA.wav'},{local:false,cloudinaryClient,user:{name:'QA'},saveDocument:async value=>{record=value;}});
 assert.equal(options.resource_type,'video');assert.equal(options.folder,'san-ignacio/audio');assert.ok(Buffer.concat(bytes).length>1000);assert.match(result.track.src,/^https:\/\/res\.cloudinary\.com\//);assert.equal(result.track.title,'Meditación QA');assert.equal(record.published,null);assert.equal(record.type,'audio');
 const playlist=playlistRecord({version:0,tracks:[result.track]},[record],{name:'QA'});assert.equal(playlist.published.tracks[0].src,result.track.src);
});
