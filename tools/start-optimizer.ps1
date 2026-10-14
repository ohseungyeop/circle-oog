param([switch]$Restart)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$optimizer=Join-Path $root 'optimizer'
$python='C:\Users\circl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PYTHONPATH=Join-Path $optimizer '.packages'
$listeners=Get-NetTCPConnection -LocalPort 8003 -State Listen -ErrorAction SilentlyContinue
if($listeners){
 if(!$Restart){throw '8003 포트가 사용 중입니다. OOG optimizer 재시작은 -Restart 옵션을 사용하세요.'}
 foreach($listener in $listeners){
  $owner=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
  if(!$owner -or $owner.ExecutablePath -ne $python -or $owner.CommandLine -notmatch 'uvicorn\s+main:app' -or $owner.CommandLine -notmatch '--port\s+8003'){throw '8003 소유 프로세스를 OOG optimizer로 확인할 수 없습니다.'}
  $health=Invoke-RestMethod 'http://127.0.0.1:8003/health' -TimeoutSec 3
  if($health.product -ne 'circle-oog-optimizer'){throw 'OOG optimizer identity를 확인할 수 없어 자동 종료하지 않습니다.'}
  Stop-Process -Id $listener.OwningProcess -Force
 }
 Start-Sleep -Milliseconds 500
}
$runtime=Join-Path $root '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$p=Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','main:app','--app-dir',('"'+$optimizer+'"'),'--host','127.0.0.1','--port','8003') -WorkingDirectory $optimizer -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'optimizer.log') -RedirectStandardError (Join-Path $runtime 'optimizer-error.log')
Write-Output "OOG optimizer process=$($p.Id) port=8003"
