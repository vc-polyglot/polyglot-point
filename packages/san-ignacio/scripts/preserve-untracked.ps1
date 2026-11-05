function Get-PackageUntrackedConflicts {
    param([string]$PackagePath, [string]$IncomingCommit)
    $incoming = @(& git -C $PackagePath -c core.quotepath=false ls-tree -r --name-only $IncomingCommit -- .)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer la version entrante.' }
    $untracked = @(& git -C $PackagePath -c core.quotepath=false ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron revisar los archivos locales.' }
    $paths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($name in $incoming) { [void]$paths.Add($name) }
    foreach ($name in $untracked) { if ($paths.Contains($name)) { $name } }
}

function Backup-PackageUntrackedConflicts {
    param([string]$PackagePath, [string]$BackupParent, [string[]]$RelativeFiles)
    if ($RelativeFiles.Count -eq 0) { return $null }
    $packageRoot = (Resolve-Path -LiteralPath $PackagePath).Path.TrimEnd('\') + '\'
    $backupParentPath = [System.IO.Path]::GetFullPath($BackupParent)
    if (-not $backupParentPath.StartsWith($packageRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'El respaldo debe permanecer dentro de packages/san-ignacio.'
    }
    $backupPath = Join-Path $backupParentPath ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    $backupRoot = [System.IO.Path]::GetFullPath($backupPath).TrimEnd('\') + '\'
    # Validate every absolute source and destination before moving any file.
    $plan = @(foreach ($relative in $RelativeFiles) {
        $source = [System.IO.Path]::GetFullPath((Join-Path $packageRoot $relative))
        $destination = [System.IO.Path]::GetFullPath((Join-Path $backupRoot $relative))
        if (-not $source.StartsWith($packageRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
            -not $destination.StartsWith($backupRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw 'Se detecto una ruta fuera de la carpeta permitida.'
        }
        $item = Get-Item -LiteralPath $source -ErrorAction Stop
        if ($item.PSIsContainer -or ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
            throw 'Solo se respaldan archivos ordinarios; no se moveran carpetas ni enlaces.'
        }
        [pscustomobject]@{ RelativePath=$relative; Source=$source; Destination=$destination; SHA256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash }
    })
    [void](New-Item -ItemType Directory -Path $backupPath -Force)
    $plan | Select-Object RelativePath,SHA256 | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $backupPath 'manifest.json') -Encoding UTF8
    foreach ($file in $plan) {
        [void](New-Item -ItemType Directory -Path (Split-Path -Parent $file.Destination) -Force)
        Move-Item -LiteralPath $file.Source -Destination $file.Destination -ErrorAction Stop
        if ((Get-FileHash -LiteralPath $file.Destination -Algorithm SHA256).Hash -ne $file.SHA256) {
            throw "No coincide el respaldo de $($file.RelativePath). Se detuvo la publicacion."
        }
    }
    [pscustomobject]@{ Directory=$backupPath; Count=$plan.Count }
}
