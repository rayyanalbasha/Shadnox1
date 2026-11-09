# Runs elevated (administrator). Sets or removes the lock screen picture.
param([string]$Src = '', [switch]$Remove)
$ErrorActionPreference = 'Stop'

$csp = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\PersonalizationCSP'
$pol = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization'

try {
  if ($Remove) {
    Remove-ItemProperty -Path $csp -Name LockScreenImagePath, LockScreenImageUrl, LockScreenImageStatus -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path $pol -Name LockScreenImage -ErrorAction SilentlyContinue
    exit 0
  }

  if (-not (Test-Path -LiteralPath $Src)) { throw 'Source image not found.' }

  # Copy somewhere the system account can read
  $dir = Join-Path $env:ProgramData 'Shadnox'
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  $dest = Join-Path $dir ('lockscreen' + [IO.Path]::GetExtension($Src))
  Copy-Item -LiteralPath $Src -Destination $dest -Force

  New-Item -Path $csp -Force | Out-Null
  Set-ItemProperty -Path $csp -Name LockScreenImagePath -Value $dest -Type String
  Set-ItemProperty -Path $csp -Name LockScreenImageUrl -Value $dest -Type String
  Set-ItemProperty -Path $csp -Name LockScreenImageStatus -Value 1 -Type DWord

  New-Item -Path $pol -Force | Out-Null
  Set-ItemProperty -Path $pol -Name LockScreenImage -Value $dest -Type String
  exit 0
} catch {
  exit 2
}
