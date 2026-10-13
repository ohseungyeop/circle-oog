param([string]$DocumentPath = 'D:\vos-products\circle-oog\docs\Circle-OOG-User-Manual.docx', [string]$OutputDirectory = 'D:\vos-products\circle-oog\docs\manual-qa')
$ErrorActionPreference = 'Stop'
$resolvedDocument = (Resolve-Path -LiteralPath $DocumentPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not $resolvedOutput.StartsWith('D:\vos-products\circle-oog\docs\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'QA output must remain in the project docs directory.' }
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$pdfPath = Join-Path $resolvedOutput 'Circle-OOG-User-Manual.pdf'
$wordInstance = $null
$manualDocument = $null
try {
    $wordInstance = New-Object -ComObject Word.Application
    $wordInstance.Visible = $false
    $wordInstance.DisplayAlerts = 0
    $wordInstance.AutomationSecurity = 3
    $manualDocument = $wordInstance.Documents.Open($resolvedDocument, $false, $true, $false)
    $manualDocument.Repaginate()
    $manualDocument.ExportAsFixedFormat($pdfPath, 17)
    if (-not (Test-Path -LiteralPath $pdfPath -PathType Leaf) -or (Get-Item -LiteralPath $pdfPath).Length -eq 0) { throw 'Word did not produce a readable QA PDF.' }
    Write-Output ('Rendered with Microsoft Word: pages={0}' -f $manualDocument.ComputeStatistics(2))
} finally {
    if ($null -ne $manualDocument) { $manualDocument.Close(0); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($manualDocument) }
    if ($null -ne $wordInstance) { $wordInstance.Quit(0); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordInstance) }
}
