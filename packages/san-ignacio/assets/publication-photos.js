export function publicationPhotos(data = {}) {
  return Array.isArray(data.photos) ? data.photos : data.image ? [{image:data.image,alt:data.alt || data.title || ''}] : [];
}

// Only the public gallery is restricted to photographs; other content can use either archive.
export const imagePickerMode = type => type === 'gallery' ? 'single' : 'multiple';
