param([switch]$ValidarSolamente)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'preserve-untracked.ps1')

function Invoke-GitChecked {
    param([string[]]$GitArguments)
    & git @GitArguments
    if ($LASTEXITCODE -ne 0) { throw ('Git se detuvo: ' + ($GitArguments -join ' ')) }
}

$revisionPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ((Split-Path -Leaf $revisionPath) -ne '.local-review-514fa79') {
    throw 'Ejecuta el script desde la carpeta de revision existente.'
}
$packagePath = Split-Path -Parent $revisionPath
$expectedBase = '514fa79e20d35f0344ad3971e6fe5a4268b4adf4'
$folders = @('src', 'assets', 'scripts', 'tests')

Push-Location -LiteralPath $packagePath
try {
    if ((& git branch --show-current) -ne 'feature/san-ignacio') {
        throw 'Debes estar en feature/san-ignacio.'
    }
    foreach ($folder in $folders) {
        $sourcePath = Join-Path $revisionPath $folder
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) { throw "Falta $folder en la revision." }
        $privateFiles = @(Get-ChildItem -LiteralPath $sourcePath -Recurse -File | Where-Object {
            $_.Name -match '^\.env|\.sqlite(?:-wal|-shm)?$|\.zip$|^ACCESO-LOCAL'
        })
        if ($privateFiles.Count -gt 0) { throw 'Se encontro un archivo local que no debe enviarse.' }
    }
    & node --input-type=module -e "import {validatePeopleAssets} from './.local-review-514fa79/src/review/people-publication.js'; validatePeopleAssets();"
    if ($LASTEXITCODE -ne 0) { throw 'Las fotografias aprobadas no estan completas.' }
    if ($ValidarSolamente) {
        $conflicts = @(Get-PackageUntrackedConflicts -PackagePath $packagePath -IncomingCommit $expectedBase)
        Write-Output "Revision valida: codigo, cuatro fotografias y asignaciones. $($conflicts.Count) archivos locales requieren respaldo antes de actualizar."
        Write-Output 'No se movieron archivos ni se ejecuto add, commit, fetch o push.'
        return
    }

    # Stop rather than overwrite unrelated tracked or staged work.
    Invoke-GitChecked -GitArguments @('diff', '--quiet')
    Invoke-GitChecked -GitArguments @('diff', '--cached', '--quiet')
    Invoke-GitChecked -GitArguments @('fetch', 'origin', 'feature/san-ignacio')
    $fetchedBase = & git rev-parse FETCH_HEAD
    if ($fetchedBase -ne $expectedBase) {
        throw 'La rama remota cambio desde la revision. No se movieron archivos ni se hizo push.'
    }
    $conflicts = @(Get-PackageUntrackedConflicts -PackagePath $packagePath -IncomingCommit $expectedBase)
    if ($conflicts.Count -gt 0) {
        $backup = Backup-PackageUntrackedConflicts -PackagePath $packagePath -BackupParent (Join-Path $revisionPath '.local\antes-de-actualizar-git') -RelativeFiles $conflicts
        Write-Output "Se conservaron $($backup.Count) archivos locales en: $($backup.Directory)"
    }
    Invoke-GitChecked -GitArguments @('merge', '--ff-only', $expectedBase)
    $actualBase = & git rev-parse HEAD
    if ($actualBase -ne $expectedBase) {
        throw 'La rama remota tiene una version distinta de la revisada. No se copiaron archivos ni se hizo push.'
    }
    foreach ($folder in $folders) {
        Copy-Item -Path (Join-Path $revisionPath "$folder\*") -Destination (Join-Path $packagePath $folder) -Recurse -Force
    }
    & npm run check
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la comprobacion de sintaxis. No se hizo commit ni push.' }
    # The excluded historical test requires an original logo absent in Downloads.
    & node --test '--test-skip-pattern=^El logotipo conserva el archivo institucional y sus proporciones$' 'tests/*.test.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas. No se hizo commit ni push.' }
    Invoke-GitChecked -GitArguments @('add', '--', 'src', 'assets', 'scripts', 'tests')
    Invoke-GitChecked -GitArguments @('commit', '--only', '-m', 'Actualiza San Ignacio con historia, navegacion y fotografias del directorio', '--', 'src', 'assets', 'scripts', 'tests')
    Invoke-GitChecked -GitArguments @('push', 'origin', 'feature/san-ignacio')
    Write-Output 'Cambios enviados a feature/san-ignacio. La publicacion en Railway puede tardar unos minutos.'
}
finally {
    Pop-Location
}
