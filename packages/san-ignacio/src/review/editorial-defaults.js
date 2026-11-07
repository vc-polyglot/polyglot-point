import fs from 'node:fs';

const history = JSON.parse(fs.readFileSync(new URL('./data/history-institutional.json', import.meta.url), 'utf8'));
const albums = JSON.parse(fs.readFileSync(new URL('./data/program-albums.json', import.meta.url), 'utf8')).groups;
export const chapterCategory = 'history-chapter';
export const chapterRecordId = id => 'historia-' + id;
export const isInstitutionalChapter = doc => doc?.type === 'content' && history.chapters.some(c => chapterRecordId(c.id) === doc.id);

// Read-through defaults: opening the console never seeds or overwrites the database.
export function chapterDefaults() {
  return history.chapters.map((chapter, index) => {
    const data = {title: chapter.title, category: chapterCategory, period: chapter.period,
      body: chapter.paragraphs.join('\n\n'), order: (index + 1) * 10};
    return {id: chapterRecordId(chapter.id), type: 'content', draft: data, published: data,
      version: 0, history: [], createdAt: '2026-11-04T00:00:00Z', updatedAt: '2026-11-04T00:00:00Z', updatedBy: 'Contenido institucional'};
  });
}

export function withEditorialDefaults(documents) {
  const ids = new Set(documents.map(doc => doc.id));
  return [...documents, ...chapterDefaults().filter(doc => !ids.has(doc.id))];
}

export function albumFor(id) {
  return albums.find(album => album.id === id);
}

export function withAlbumDefaults(doc) {
  const album = doc.type === 'program' && albumFor(doc.id);
  if (!album) return doc;
  const fill = data => data && {photos: album.photos, cover: album.cover, ...data};
  return {...doc, draft: fill(doc.draft), published: fill(doc.published)};
}

export function publicChapters(docs) {
  return history.chapters.map((chapter, index) => {
    const data = docs.find(doc => doc.id === chapterRecordId(chapter.id) && doc.type === 'content' && doc.category === chapterCategory);
    return data ? {...chapter, title: data.title, period: data.period, paragraphs: String(data.body || '').split(/\n\s*\n/).filter(Boolean), order: data.order}
      : {...chapter, order: (index + 1) * 10};
  }).sort((a, b) => a.order - b.order);
}
