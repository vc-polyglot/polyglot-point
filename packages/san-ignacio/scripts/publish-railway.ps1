$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$safeRepository = $repository.Replace('\','/')
$reviewBranch = 'review/san-ignacio-local-20261028'
$site = 'https://san-ignacio-production.up.railway.app'
function Invoke-RepoGit {
    param([string[]]$GitArguments)
    & git -c "safe.directory=$safeRepository" -C $repository @GitArguments
    if ($LASTEXITCODE -ne 0) { throw 'Git no pudo completar la operacion. No se fuerza ninguna rama.' }
}
$branch = (Invoke-RepoGit -GitArguments @('branch','--show-current')).Trim()
if ($branch -ne $reviewBranch) { throw 'No se esta ejecutando desde la rama de revision esperada.' }
$remote = (Invoke-RepoGit -GitArguments @('config','--get','remote.origin.url')).Trim()
if ($remote -ne 'https://github.com/vc-polyglot/polyglot-point.git') { throw 'El repositorio remoto no coincide con el autorizado.' }
$pending = Invoke-RepoGit -GitArguments @('status','--porcelain')
if ($pending) { throw 'Hay archivos sin guardar en un commit. Se cancela la subida.' }
$commit = (Invoke-RepoGit -GitArguments @('rev-parse','HEAD')).Trim()
$changedFiles = Invoke-RepoGit -GitArguments @('diff','--name-only','cecb8f2','HEAD')
foreach ($file in $changedFiles) {
    if (-not ($file.StartsWith('packages/san-ignacio/') -or $file -eq 'Dockerfile.san-ignacio')) { throw "Hay cambios fuera de San Ignacio: $file" }
}
Write-Host 'Comprobando que la rama de Railway no haya recibido cambios posteriores...'
Invoke-RepoGit -GitArguments @('fetch','origin','feature/san-ignacio')
Invoke-RepoGit -GitArguments @('merge-base','--is-ancestor','origin/feature/san-ignacio','HEAD')
Write-Host 'Subiendo la version revisada y activando el despliegue de San Ignacio...'
Invoke-RepoGit -GitArguments @('push','origin',"HEAD:refs/heads/$reviewBranch",'HEAD:refs/heads/feature/san-ignacio')
Write-Host "Push aceptado: $commit. Esperando la nueva version de Railway..."
$deadline = (Get-Date).AddMinutes(10)
$healthy = $false
$attempt = 0
while ((Get-Date) -lt $deadline) {
    try {
        $health = Invoke-RestMethod -Uri "$site/health?deploy=$commit" -TimeoutSec 15
        $matchesCommit = -not $health.commit -or $health.commit -eq $commit
        if ($health.release -eq 'editorial-20261028' -and $health.ok -eq $true -and $health.storage -eq 'postgresql' -and $health.redis -eq $true -and $matchesCommit) { $healthy = $true; break }
    } catch { }
    if ($attempt % 5 -eq 0) { Write-Host 'Railway sigue construyendo o iniciando la version nueva...' }
    $attempt++
    Start-Sleep -Seconds 6
}
if (-not $healthy) { throw 'El push se completo, pero no se pudo confirmar la nueva version en diez minutos. Revisar Build Logs y Deploy Logs en Railway.' }
foreach ($route in @('/','/vida-liturgica','/sacramentos','/pastoral','/comunidad','/musica','/nosotros','/agua-de-san-ignacio','/historia','/galeria','/contacto','/admin')) {
    $page = Invoke-WebRequest -Uri ($site + $route) -UseBasicParsing -TimeoutSec 20
    if ($page.StatusCode -ne 200) { throw "La pagina no responde correctamente: $route" }
    if ($route -eq '/' -and $page.Content -notmatch 'data-replay-intro') { throw 'La portada no contiene la presentacion repetible.' }
    if ($route -eq '/admin' -and $page.Content -notmatch 'login-form') { throw 'La consola no muestra su formulario de acceso.' }
}
$css = Invoke-WebRequest -Uri "$site/assets/site.css?deploy=$commit" -UseBasicParsing -TimeoutSec 20
if ($css.Content -notmatch 'si-intro-curtain 4500ms') { throw 'No se recibieron los estilos nuevos de la presentacion.' }
Write-Host ''
Write-Host "DESPLIEGUE COMPROBADO: $site"
Write-Host 'PostgreSQL y Redis disponibles. Doce paginas y estilos nuevos comprobados.'
Write-Host "Consola: $site/admin (usar la cuenta existente)."
Write-Host 'No se cambiaron planes, replicas ni recursos contratados.'
