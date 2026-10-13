$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$frontend=Join-Path $root 'frontend'
if(Get-NetTCPConnection -LocalPort 5175 -State Listen -ErrorAction SilentlyContinue){throw '5175 포트가 사용 중입니다.'}
$runtime=Join-Path $root '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$p=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @((Join-Path $frontend 'node_modules\vite\bin\vite.js'),'--host','127.0.0.1','--port','5175','--strictPort') -WorkingDirectory $frontend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'frontend.log') -RedirectStandardError (Join-Path $runtime 'frontend-error.log')
Write-Output "OOG frontend process=$($p.Id) http://127.0.0.1:5175"
