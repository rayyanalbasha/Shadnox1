param([ValidateSet('loop','off')][string]$Mode='off', [int]$ParentPid=0)
$ErrorActionPreference = 'SilentlyContinue'
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
if ($Mode -eq 'off') {
  New-ItemProperty -Path $key -Name EnableTransparency -Value 1 -PropertyType DWord -Force | Out-Null
  Stop-Process -Name explorer -Force
  Start-Process explorer.exe
  exit 0
}
New-ItemProperty -Path $key -Name EnableTransparency -Value 1 -PropertyType DWord -Force | Out-Null
while ($true) {
  if ($ParentPid -gt 0 -and -not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Seconds 5
}
