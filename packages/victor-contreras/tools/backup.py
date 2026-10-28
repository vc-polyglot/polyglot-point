"""Create and verify a source backup outside the repository; never delete or restore files."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess
import zipfile

PACKAGE = Path(__file__).resolve().parents[1]
ROOT = PACKAGE.parent.parent
destination = ROOT.parent / 'victor-catalogo-vivo-backups' / ('backup-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
destination.mkdir(parents=True,exist_ok=False)
files = [file for file in PACKAGE.rglob('*') if file.is_file() and not {'node_modules','__pycache__','.git'}.intersection(file.parts)]
files += [ROOT / name for name in ['Dockerfile.victor-contreras','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','.gitignore']]
manifest = []
with zipfile.ZipFile(destination / 'source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=1) as archive:
    for file in files:
        data = file.read_bytes()
        relative = file.relative_to(ROOT).as_posix()
        archive.writestr(relative,data)
        manifest.append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
with zipfile.ZipFile(destination / 'source.zip') as archive:
    assert archive.testzip() is None
    for item in manifest:
        assert hashlib.sha256(archive.read(item['path'])).hexdigest() == item['sha256']
metadata = {'createdAt':datetime.now(timezone.utc).isoformat(),'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'files':manifest,'scope':'Website sources, original and web images, content and package/deployment manifests. Excludes dependencies, Git history and Railway configuration.'}
(destination / 'manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'verified':True,'directory':str(destination),'files':len(files)},ensure_ascii=True))
