param([switch]$Restart)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root 'backend'
Get-Content -LiteralPath (Join-Path $backend '.env') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}
if ($env:DB_URL -notmatch '/oog(?:\?.*)?$') { throw 'OOG 데이터베이스 설정만 허용됩니다.' }
$runtime = Join-Path $root '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$listener=Get-NetTCPConnection -LocalPort 8083 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    if (!$Restart) { throw '8083 포트가 사용 중입니다.' }
    $existing=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    if ($existing.Name -ne 'java.exe' -or $existing.CommandLine -notlike '*circle-oog*circle-oog-0.1.0.jar*') { throw 'OOG 소유 프로세스가 아닙니다.' }
    Stop-Process -Id $existing.ProcessId
    Wait-Process -Id $existing.ProcessId -Timeout 20 -ErrorAction SilentlyContinue
}
$jar = Join-Path $backend 'build\libs\circle-oog-0.1.0.jar'
if (!(Test-Path -LiteralPath $jar)) { throw '백엔드를 먼저 빌드하세요.' }
$java = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { 'C:\Program Files\Java\jdk-21.0.12.1\bin\java.exe' }
$p = Start-Process -FilePath $java -ArgumentList @('-jar', $jar) -WorkingDirectory $backend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'backend.log') -RedirectStandardError (Join-Path $runtime 'backend-error.log')
Write-Output "OOG API process=$($p.Id) port=8083"
