param(
  [string]$Hex = '',
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [switch]$Restore
)
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ShadnoxBroadcast {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
}
'@

function Send-ColorChange {
  $res = [UIntPtr]::Zero
  [ShadnoxBroadcast]::SendMessageTimeout([IntPtr]0xffff, 0x1A, [UIntPtr]::Zero, 'ImmersiveColorSet', 2, 5000, [ref]$res) | Out-Null
}

function Set-Dword($path, $name, $value) {
  if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
  New-ItemProperty -Path $path -Name $name -Value $value -PropertyType DWord -Force | Out-Null
}

$dwm = 'HKCU:\Software\Microsoft\Windows\DWM'
$acc = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent'
$per = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
$desk = 'HKCU:\Control Panel\Desktop'

if ($Restore) {
  if (Test-Path -LiteralPath $BackupFile) {
    $saved = @(Get-Content -LiteralPath $BackupFile -Raw | ConvertFrom-Json)
    foreach ($e in $saved) {
      if ($null -eq $e.value) {
        Remove-ItemProperty -Path $e.path -Name $e.name -ErrorAction SilentlyContinue
      } else {
        Set-Dword $e.path $e.name ([int]$e.value)
      }
    }
    Remove-Item -LiteralPath $BackupFile -Force
  } else {
    # nothing saved: fall back to Windows defaults
    Set-Dword $per 'ColorPrevalence' 0
    Set-Dword $dwm 'ColorPrevalence' 0
  }
  Send-ColorChange
  exit 0
}

$Hex = $Hex.TrimStart('#')
if ($Hex -notmatch '^[0-9a-fA-F]{6}$') { throw 'Bad colour value.' }
$r = [Convert]::ToInt32($Hex.Substring(0, 2), 16)
$g = [Convert]::ToInt32($Hex.Substring(2, 2), 16)
$b = [Convert]::ToInt32($Hex.Substring(4, 2), 16)
$abgr = [BitConverter]::ToInt32([byte[]]@($r, $g, $b, 255), 0)
$argb = [BitConverter]::ToInt32([byte[]]@($b, $g, $r, 255), 0)

$items = @(
  @($dwm,  'AccentColor',          $abgr),
  @($dwm,  'ColorizationColor',    $argb),
  @($dwm,  'ColorPrevalence',      1),
  @($acc,  'AccentColorMenu',      $abgr),
  @($acc,  'StartColorMenu',       $abgr),
  @($per,  'ColorPrevalence',      1),
  @($per,  'SystemUsesLightTheme', 0),
  @($desk, 'AutoColorization',     0)
)

# Save the original values once, so "Reset" can put them back
if (-not (Test-Path -LiteralPath $BackupFile)) {
  $backup = @()
  foreach ($i in $items) {
    $cur = $null
    try { $cur = (Get-ItemProperty -Path $i[0] -Name $i[1] -ErrorAction Stop).($i[1]) } catch { }
    $backup += [pscustomobject]@{ path = $i[0]; name = $i[1]; value = $cur }
  }
  ConvertTo-Json -InputObject $backup | Set-Content -LiteralPath $BackupFile -Encoding UTF8
}

foreach ($i in $items) { Set-Dword $i[0] $i[1] $i[2] }
Send-ColorChange
