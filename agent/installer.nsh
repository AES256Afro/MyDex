; MyDex Agent NSIS installer customization
; Adds registry key for auto-start after installation

!macro customInstall
  ; Add to Windows startup registry
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MyDexAgent" '"$INSTDIR\MyDex Agent.exe" --hidden'
!macroend

!macro customUnInstall
  ; Remove startup registry entry on uninstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MyDexAgent"
  ; Remove scheduled task if it exists
  nsExec::ExecToLog 'schtasks /Delete /TN "MyDex Agent" /F'
!macroend
