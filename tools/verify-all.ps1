param([switch]$SkipBuild)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$python='C:\Users\circl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$dbLine=Get-Content -LiteralPath (Join-Path $root 'backend/.env') | Where-Object {$_ -match '^DB_URL='} | Select-Object -First 1
if($dbLine -notmatch '/oog(?:\?.*)?$'){throw '검증은 독립 oog DB에서만 실행합니다.'}
function Invoke-Checked([string]$directory,[string]$executable,[string[]]$toolArgs){
 Push-Location -LiteralPath $directory
 try{& $executable @toolArgs;if($LASTEXITCODE -ne 0){throw "검사가 실패했습니다: $executable"}}finally{Pop-Location}
}
if(-not $SkipBuild){
 $env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.12.1'
 $env:GRADLE_USER_HOME=Join-Path $root '.gradle-cache'
 Invoke-Checked (Join-Path $root 'backend') '.\gradlew.bat' @('build','--no-daemon')
 Invoke-Checked (Join-Path $root 'frontend') 'npm.cmd' @('run','build')
}
& (Join-Path $PSScriptRoot 'start-oog.ps1') -Restart
if(-not(Get-NetTCPConnection -LocalPort 8003 -State Listen -ErrorAction SilentlyContinue)){& (Join-Path $PSScriptRoot 'start-optimizer.ps1')}
$env:PYTHONPATH=(Join-Path $root 'optimizer/.packages')+';'+(Join-Path $root 'tools/.packages')
Invoke-Checked (Join-Path $root 'frontend') 'npm.cmd' @('test','--','--reporter=dot','--reporter=json','--outputFile=../docs/verification-frontend-code-raw.json')
Invoke-Checked $root $python @((Join-Path $PSScriptRoot 'record-frontend-code.py'))
Invoke-Checked (Join-Path $root 'optimizer') $python @('-m','unittest','-v')
foreach($script in @('verify-foundation.py','verify-parallel.py','verify-core.py','verify-master-pdf.py','verify-auto-import.py','verify-multifr.py','verify-quotation.py','verify-engineering.py','verify-engineering-calculation.py','verify-expanded-engineering.py','verify-import-templates.py','verify-comparison-exports.py','verify-optimization.py','verify-status.py')){
 Invoke-Checked $root $python @((Join-Path $PSScriptRoot $script))
}
Write-Output 'OOG 코드/빌드/DB/API 검사 완료. 브라우저 미사용. docs/verification-suite.json 확인.'
