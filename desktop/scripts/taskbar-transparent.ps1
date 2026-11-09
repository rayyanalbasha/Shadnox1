param(
  [ValidateSet('loop', 'off')][string]$Mode = 'loop',
  [int]$ParentPid = 0
)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ShadnoxTaskbar {
  [StructLayout(LayoutKind.Sequential)]
  public struct ACCENTPOLICY { public int AccentState; public int AccentFlags; public int GradientColor; public int AnimationId; }
  [StructLayout(LayoutKind.Sequential)]
  public struct WINCOMPATTRDATA { public int Attribute; public IntPtr Data; public int SizeOfData; }

  [DllImport("user32.dll")]
  public static extern int SetWindowCompositionAttribute(IntPtr hwnd, ref WINCOMPATTRDATA data);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);

  public static void Apply(IntPtr hwnd, int state) {
    ACCENTPOLICY policy = new ACCENTPOLICY();
    policy.AccentState = state;
    policy.AccentFlags = 2;
    policy.GradientColor = 0;
    policy.AnimationId = 0;
    int size = Marshal.SizeOf(policy);
    IntPtr ptr = Marshal.AllocHGlobal(size);
    Marshal.StructureToPtr(policy, ptr, false);
    WINCOMPATTRDATA data = new WINCOMPATTRDATA();
    data.Attribute = 19;
    data.Data = ptr;
    data.SizeOfData = size;
    SetWindowCompositionAttribute(hwnd, ref data);
    Marshal.FreeHGlobal(ptr);
  }

  public static void ApplyAll(int state) {
    IntPtr main = FindWindow("Shell_TrayWnd", null);
    if (main != IntPtr.Zero) Apply(main, state);
    IntPtr sec = IntPtr.Zero;
    while ((sec = FindWindowEx(IntPtr.Zero, sec, "Shell_SecondaryTrayWnd", null)) != IntPtr.Zero) Apply(sec, state);
  }
}
'@

if ($Mode -eq 'off') {
  [ShadnoxTaskbar]::ApplyAll(0)
  exit 0
}

# Windows keeps resetting the taskbar, so keep re-applying while Shadnox is alive.
while ($true) {
  if ($ParentPid -gt 0 -and -not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) {
    [ShadnoxTaskbar]::ApplyAll(0)
    exit 0
  }
  [ShadnoxTaskbar]::ApplyAll(2)
  Start-Sleep -Milliseconds 400
}
