const normalize=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();
const date=value=>value?new Date(value).toISOString():undefined;
export const legacyTables=['schedules','pastoral_posts','notices','media','music_items','concerts','contact_messages','institutional_sections','institutional_cards','staff_members','editorial_events','gallery_items','site_image_slots','managed_content','pastoral_categories','history_rectors'];
// A deterministic plan: live legacy rows take precedence over reference files.
// Every raw table remains in the migration backup, including fields not displayed.
export function buildDeploymentPlan(tables,references,stamp=new Date().toISOString()){
 const docs=new Map();const messages=[];
 function add(id,type,data,published=true,archived=false){const draft=structuredClone(data);const record={id,type,draft,published:published&&!archived?structuredClone(draft):null,archived,version:1,history:[],createdAt:stamp,updatedAt:stamp,updatedBy:'Migración conservadora de la consola anterior'};docs.set(id,record);return record;}
 for(const ref of references){const record=add(ref.id,ref.type,ref.draft,!!ref.published,ref.archived);record.published=ref.published?structuredClone(ref.published):null;}
 const clear=type=>{for(const [id,d]of docs)if(d.type===type)docs.delete(id);};
 const media=new Map((tables.media||[]).map(m=>[String(m.id),m]));
 const image=id=>{const m=media.get(String(id));return m&&(m.secure_url||m.url)?{image:m.secure_url||m.url,alt:m.alt_text||''}:{};};
 const data=(row,fields)=>{const result={order:row.sort_order||0,source:'Base institucional anterior; original completo conservado en site_migration_backups.'};for(const [target,key]of Object.entries(fields))if(row[key]!=null)result[target]=row[key];return result;};
 if(tables.schedules?.length)clear('schedule');
 for(const r of tables.schedules||[])add('horario-'+r.id,'schedule',data(r,{title:'category',day:'day_label',time:'time_label',detail:'detail'}),r.active);
 for(const r of tables.managed_content||[])add(r.slug,'content',data(r,{title:'title',body:'body',category:'group_key'}),r.published);
 for(const r of tables.pastoral_categories||[]){const match=references.find(d=>d.type==='program'&&(d.id===r.slug||normalize(d.draft.title)===normalize(r.title)));let id=match?.id||r.slug||'programa-'+r.id;const normalized=normalize(r.slug+' '+r.title);if(/confirmacion/.test(normalized))id='catecismo-confirmacion';else if(/primera-comunion|primera comunion/.test(normalized))id='catecismo';add(id,'program',{...data(r,{title:'title',summary:'summary',body:'body',detail:'contact'}),...image(r.media_id),...(['catecismo','catecismo-confirmacion'].includes(id)?{category:'catecismo'}:{})},r.published);}
 if(tables.staff_members?.length)clear('staff');
 for(const r of tables.staff_members||[])add('persona-'+r.id,'staff',{...data(r,{title:'name',role:'role',body:'description'}),...image(r.media_id)},r.published);
 const staff=[...docs.values()].filter(d=>d.type==='staff').sort((a,b)=>a.draft.order-b.draft.order);
 let organist=staff.find(d=>normalize(d.draft.title)==='victor contreras');
 if(!organist){const ref=references.find(d=>d.id==='victor-contreras-organista');if(ref)organist=add(ref.id,'staff',ref.draft,!!ref.published);}
 if(organist){for(const value of [organist.draft,organist.published])if(value)value.role='Organista';const ordered=staff.filter(d=>d!==organist);const index=ordered.findIndex(d=>/sacrist/i.test(d.draft.role||''));ordered.splice(index<0?ordered.length:index,0,organist);ordered.forEach((d,i)=>{d.draft.order=(i+1)*10;if(d.published)d.published.order=d.draft.order;});}
 for(const r of tables.history_rectors||[])add('rector-'+r.id,'content',{...data(r,{title:'name',period:'period',body:'body'}),category:'rector',...image(r.media_id)},r.published);
 for(const r of tables.pastoral_posts||[])add('pastoral-'+r.id,'content',{...data(r,{title:'title',body:'body',summary:'excerpt',url:'youtube_url'}),category:'pastoral',...image(r.image_media_id)},r.status==='published'&&(!r.published_at||Date.parse(r.published_at)<=Date.parse(stamp)));
 for(const r of tables.notices||[])add('aviso-'+r.id,'notice',{...data(r,{title:'title',body:'body'}),startsAt:date(r.starts_at),endsAt:date(r.ends_at),order:100-(r.priority||0),...image(r.image_media_id)},r.active);
 for(const r of tables.editorial_events||[])add('evento-'+r.id,'event',{...data(r,{title:'title',body:'body',summary:'excerpt',location:'location',category:'event_type',url:'youtube_url'}),startsAt:date(r.starts_at),endsAt:date(r.ends_at),...image(r.image_media_id)},r.published,!!r.deleted_at);
 for(const r of tables.concerts||[])add('concierto-'+r.id,'event',{...data(r,{title:'title',body:'description',location:'location'}),startsAt:date(r.starts_at),category:'Concierto'},r.status==='scheduled',r.status==='cancelled');
 for(const r of tables.music_items||[])add('musica-'+r.id,'music',{...data(r,{title:'title',body:'description',url:'youtube_url'}),category:'grabaciones',...image(r.media_id)},r.published);
 if(tables.gallery_items?.length)clear('gallery');
 for(const r of tables.gallery_items||[])add('galeria-'+r.id,'gallery',{...data(r,{summary:'caption'}),title:r.caption||'San Ignacio de Loyola',...image(r.media_id),alt:r.alt_text||image(r.media_id).alt||''},r.published);
 for(const r of tables.institutional_sections||[])if(r.slug==='spirituality')add('espiritualidad','content',{...data(r,{title:'title',body:'body'}),category:'spirituality',...image(r.image_media_id)},r.published);
 for(const r of tables.contact_messages||[])messages.push({id:'legacy-'+r.id,...data(r,{name:'name',email:'email',phone:'phone',subject:'subject',message:'message',status:'status'}),createdAt:date(r.created_at)||stamp});
 // Retain every uploaded medium in the authenticated library, even if unused.
 for(const r of tables.media||[]){const mediaImage=image(r.id);if(!mediaImage.image||r.media_type&&r.media_type!=='image')continue;add('media-legacy-'+r.id,'media',{...mediaImage,url:mediaImage.image,title:r.alt_text||'Imagen del archivo institucional'},false);}
 return {documents:[...docs.values()],messages};
}
