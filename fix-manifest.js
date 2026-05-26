// fix-manifest.js
const fs = require('fs');
const path = require('path');

const f = path.join(process.cwd(), 'packages/temperament-lab/android/app/src/main/AndroidManifest.xml');
let c = fs.readFileSync(f, 'utf8');

// Limpiar basura del intento anterior
c = c.replace(/`n\s*/g, '\n');

// Eliminar duplicados de RECORD_AUDIO
c = c.replace(/\s*<uses-permission android:name="android\.permission\.RECORD_AUDIO" \/>/g, '');

// Insertar RECORD_AUDIO después de INTERNET
c = c.replace(
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />'
);

fs.writeFileSync(f, c, 'utf8');
console.log('OK');

// Verificar
const lines = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.includes('permission'));
lines.forEach(l => console.log(l.trim()));
