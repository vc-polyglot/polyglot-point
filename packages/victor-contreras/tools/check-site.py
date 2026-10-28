"""Check generated pages, local assets, anchors and accessible form labels."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import collections
import json
import xml.etree.ElementTree as ET

PUBLIC = Path(__file__).resolve().parent.parent / 'public'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.errors, self.ids, self.refs, self.fields, self.labels = [], [], [], [], [], []
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'h1':
            self.h1 += 1
        if tag in {'a','link','script','img'}:
            ref = attrs.get('href',attrs.get('src'))
            if ref:
                self.refs.append(ref)
        if tag in {'input','select','textarea'} and attrs.get('type') != 'hidden':
            self.fields.append(attrs.get('id'))
        if tag == 'label':
            self.labels.append(attrs.get('for'))
        if tag == 'img' and 'alt' not in attrs:
            self.errors.append('Image without alt')
        if tag == 'form' and attrs.get('method','get').lower() != 'post':
            self.errors.append('Contact form must use POST')
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f'Unexpected closing {tag} at {self.getpos()}')
        else:
            self.stack.pop()


pages = {}
for filename in ['index.html','cv.html']:
    parser = Page()
    parser.feed((PUBLIC / filename).read_text('utf-8'))
    assert not parser.errors, (filename,parser.errors)
    assert not parser.stack, (filename,parser.stack)
    assert parser.h1 == 1, filename
    assert not [key for key,count in collections.Counter(parser.ids).items() if count > 1], filename
    assert all(field and field in parser.labels for field in parser.fields), filename
    pages[filename] = parser

checked = 0
for filename, page in pages.items():
    for ref in page.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            continue
        target = unquote(url.path).lstrip('/') or filename
        if target == filename and url.fragment:
            assert unquote(url.fragment) in page.ids, (filename,ref)
        else:
            assert (PUBLIC / target).is_file(), (filename,ref)
        checked += 1

for file in (PUBLIC / 'data').glob('*.json'):
    json.loads(file.read_text('utf-8'))
ET.parse(PUBLIC / 'sitemap.xml')
manifest = json.loads((PUBLIC / 'media/manifest.json').read_text('utf-8-sig'))
derivatives = [manifest['hero'],manifest['bio'],manifest['orchestra']]
derivatives += [item[key] for item in manifest['gallery'] for key in ['thumbnail','full']]
for item in derivatives:
    assert item['width'] > 1 and item['height'] > 1, item
    assert (PUBLIC / item['src'].lstrip('/')).stat().st_size == item['bytes'], item
originals = sum((PUBLIC / item['original']).stat().st_size for item in manifest['gallery'])
thumbs = sum(item['thumbnail']['bytes'] for item in manifest['gallery'])
full = sum(item['full']['bytes'] for item in manifest['gallery'])
print(json.dumps({'pages':list(pages),'localReferencesChecked':checked,'derivatives':len(derivatives),'galleryOriginalBytes':originals,'galleryThumbnailBytes':thumbs,'galleryFullBytes':full,'thumbnailReductionPercent':round(100*(1-thumbs/originals),2)},ensure_ascii=True))
