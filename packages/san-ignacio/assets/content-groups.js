// Shared by public Pastoral and the console so both classify and order alike.
export function pastoralArea(doc) {
  const data = doc.draft || doc.published || doc;
  if (data.category === 'catecismo' || ['catecismo','catecismo-confirmacion'].includes(doc.id)) return 'catecismo';
  if (['comunidad','servicio'].includes(data.category)) return 'comunidad';
  if (data.category === 'formacion') return 'pastoral';
  if (/juvenil|inea/i.test(doc.id + ' ' + data.title)) return 'comunidad';
  return 'pastoral';
}
export function communityRank(doc) {
  const data = doc.draft || doc.published || doc;
  const text = doc.id + ' ' + data.title;
  return /inea/i.test(text) ? 3 : /juvenil|joven/i.test(text) ? 0 : /adultos?.*mayores?/i.test(text) ? 1 : 2;
}
