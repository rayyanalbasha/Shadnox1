param([string]$Hex, [Parameter(Mandatory=$true)][string]$BackupFile, [switch]$Restore)
$ErrorActionPreference = 'Stop'
$key = 'HKCU:\Software\Microsoft\Windows\DWM'
$personal = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
if ($Restore) {
  if (Test-Path $BackupFile) {
    $backup = Get-Content -LiteralPath $BackupFile -Raw | ConvertFrom-Json
    if ($null -ne $backup.ColorizationColor) { New-ItemProperty -Path $key -Name ColorizationColor -Value ([uint32]$backup.ColorizationColor) -PropertyType DWord -Force | Out-Null }
    if ($null -ne $backup.ColorPrevalence) { New-ItemProperty -Path $key -Name ColorPrevalence -Value ([int]$backup.ColorPrevalence) -PropertyType DWord -Force | Out-Null }
    if ($null -ne $backup.EnableTransparency) { New-ItemProperty -Path $personal -Name EnableTransparency -Value ([int]$backup.EnableTransparency) -PropertyType DWord -Force | Out-Null }
  }
  Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
  Start-Process explorer.exe
  exit 0
}
if ($Hex -notmatch '^[0-9a-fA-F]{6}$') { throw 'Enter a six-digit hex color.' }
if (-not (Test-Path $BackupFile)) {
  $backup = [ordered]@{}
  foreach ($item in @(@($key,'ColorizationColor'),@($key,'ColorPrevalence'),@($personal,'EnableTransparency'))) {
    $value = Get-ItemPropertyValue -Path $item[0] -Name $item[1] -ErrorAction SilentlyContinue
    $backup[$item[1]] = $value
  }
  $backup | ConvertTo-Json | Set-Content -LiteralPath $BackupFile -Encoding UTF8
}
$rgb = [Convert]::ToUInt32($Hex,16)
$color = [uint32](0xC4000000 -bor $rgb)
New-ItemProperty -Path $key -Name ColorizationColor -Value $color -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $key -Name ColorPrevalence -Value 1 -PropertyType DWord -Force | Out-Null
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Process explorer.exe
