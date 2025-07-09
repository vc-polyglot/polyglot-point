
# fix-imports.ps1
Write-Host "🔧 Iniciando rutina de reparación de imports..." -ForegroundColor Cyan

# Paso 1: Verifica si existe el componente card.tsx, si no lo crea
$cardPath = ".\client\src\components\ui\card.tsx"
if (-not (Test-Path $cardPath)) {
    @'
import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      {children}
    </div>
  );
}
'@ | Out-File -FilePath $cardPath -Encoding utf8
    Write-Host "✅ Componente creado: card.tsx" -ForegroundColor Green
} else {
    Write-Host "✅ El componente card.tsx ya existe." -ForegroundColor Yellow
}

# Paso 2: Limpieza y reinstalación de dependencias
Write-Host "🧹 Eliminando node_modules y package-lock.json..." -ForegroundColor Cyan
cd client
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
cd ..

# Paso 3: Buscar imports rotos
Write-Host "🔍 Buscando imports rotos en @/components/ui/..." -ForegroundColor Cyan
$imports = Get-ChildItem -Path .\client\src -Recurse -Include *.ts,*.tsx |
  Select-String -Pattern "@/components/ui/" |
  Group-Object -Property Filename

foreach ($group in $imports) {
  foreach ($match in $group.Group) {
    $importPath = $match.Line -replace '.*@/components/ui/(.*)["\'].*', '$1'
    $componentPath = ".\client\src\components\ui\$importPath.tsx"
    if (-not (Test-Path $componentPath)) {
      Write-Host "⚠️ Falta componente: $componentPath" -ForegroundColor Red
    }
  }
}

# Paso 4: Ejecutar build
Write-Host "🚀 Ejecutando build final..." -ForegroundColor Cyan
npm run build

Write-Host "✅ Proceso completado." -ForegroundColor Green
