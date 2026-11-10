param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'Wallpaper image was not found.' }
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WallpaperNative {
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool SystemParametersInfo(int action, int param, string value, int winIni);
}
'@
if (-not [WallpaperNative]::SystemParametersInfo(20, 0, $Path, 3)) { throw 'Windows could not apply the wallpaper.' }
