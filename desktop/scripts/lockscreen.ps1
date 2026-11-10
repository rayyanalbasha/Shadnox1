param([string]$Src, [switch]$Remove)
$ErrorActionPreference = 'Stop'
$key = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP'
if ($Remove) {
  if (Test-Path $key) {
    Remove-ItemProperty -Path $key -Name LockScreenImagePath -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $key -Name LockScreenImageUrl -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $key -Name LockScreenImageStatus -ErrorAction SilentlyContinue
  }
  exit 0
}
if ([string]::IsNullOrWhiteSpace($Src) -or -not (Test-Path -LiteralPath $Src -PathType Leaf)) { throw 'Lock-screen image was not found.' }
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name LockScreenImagePath -Value $Src -Type String
Set-ItemProperty -Path $key -Name LockScreenImageUrl -Value $Src -Type String
Set-ItemProperty -Path $key -Name LockScreenImageStatus -Value 1 -Type DWord
