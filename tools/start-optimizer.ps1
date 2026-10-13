$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$optimizer=Join-Path $root 'optimizer'
$python='C:\Users\circl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$env:PYTHONPATH=Join-Path $optimizer '.packages'
if(Get-NetTCPConnection -LocalPort 8003 -State Listen -ErrorAction SilentlyContinue){throw '8003 포트가 사용 중입니다.'}
$runtime=Join-Path $root '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$p=Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','main:app','--host','127.0.0.1','--port','8003') -WorkingDirectory $optimizer -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'optimizer.log') -RedirectStandardError (Join-Path $runtime 'optimizer-error.log')
Write-Output "OOG optimizer process=$($p.Id) port=8003"
