param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'

# Fill the screen, no tiling
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name WallpaperStyle -Value '10'
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name TileWallpaper -Value '0'

Add-Type -TypeDefinition @'
using System.Runtime.InteropServices;
public class ShadnoxWall {
  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
'@

# 20 = SPI_SETDESKWALLPAPER, 3 = save to profile + notify (so it survives restarts)
$r = [ShadnoxWall]::SystemParametersInfo(20, 0, $Path, 3)
if ($r -eq 0) { throw 'Windows refused to change the wallpaper.' }
