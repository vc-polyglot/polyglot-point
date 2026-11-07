// The only web console is for daily secretarial work. Permanent content is maintained in code.
export const secretaryFields = {
  event: ['title','startsAt','endsAt','location','body','image','alt','photos','url'],
  notice: ['title','body','startsAt','endsAt','image','alt','photos','url'],
  gallery: ['title','image','alt','summary'],
  program: ['title','category','time','body','detail','image','alt','photos','cover'],
  schedule: ['day','time','detail'],
  settings: ['address','email','phone','office','facebook']
};
const creativeTypes = ['event','notice','gallery','program'];
export const canManage = doc => !!doc && (creativeTypes.includes(doc.type) || doc.type === 'schedule' || doc.type === 'settings' && doc.id === 'contacto');
const forbidden = () => {const error = new Error('Esta acción no está disponible en la secretaría.'); error.status = 403; throw error;};

export function secretaryDocument(doc) {
  if (!canManage(doc)) return null;
  const keys = ['title', ...secretaryFields[doc.type]];
  const project = data => data && Object.fromEntries(keys.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  return {id:doc.id,type:doc.type,version:doc.version,archived:!!doc.archived,
    updatedAt:doc.updatedAt,draft:project(doc.draft),published:project(doc.published)};
}

export function prepareSecretaryChange(input, previous, documents) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) forbidden();
  const action = input.action || 'draft';
  if (previous) {
    if (!canManage(previous) || input.type !== previous.type) forbidden();
  } else if (!creativeTypes.includes(input.type) || input.id) forbidden();
  if (!['draft','publish','archive','restore','unpublish'].includes(action)) forbidden();
  if (!creativeTypes.includes(input.type) && !['draft','publish'].includes(action)) forbidden();
  if (action !== 'draft' && action !== 'publish') return {id:input.id,type:input.type,version:input.version,action};
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) forbidden();
  const allowed = secretaryFields[input.type];
  if (Object.keys(input.data).some(key => !allowed.includes(key))) forbidden();
  const data = {...(previous?.draft || previous?.published || {}), ...input.data};
  if (!previous) {
    data.order = Math.max(0, ...documents.filter(doc => doc.type === input.type).map(doc => Number(doc.draft?.order) || 0)) + 10;
  }
  if(input.type==='program'){
    if(!previous && !data.category)data.category='comunidad';
    if(Object.hasOwn(input.data,'category')&&!['catecismo','formacion','comunidad'].includes(input.data.category)) {const error=new Error('Elige el apartado de Pastoral.');error.status=400;throw error;}
    if(['catecismo','catecismo-confirmacion'].includes(previous?.id)&&input.data.category&&input.data.category!=='catecismo') {const error=new Error('Esta ficha pertenece a Catecismo.');error.status=400;throw error;}
    if(Object.hasOwn(input.data,'body'))data.summary='';
  }
  // Never let a stale event teaser override the description edited in the simple form.
  if (input.type === 'event' && Object.hasOwn(input.data,'body')) data.summary = '';
  return {id:input.id,type:input.type,version:input.version,action,data};
}
