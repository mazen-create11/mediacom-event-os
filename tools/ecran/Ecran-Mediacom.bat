@echo off
rem Ordinateur du mur LED (Nolan) : ouvre la sortie ecran en kiosque, plein ecran, sans barre ni dialogue.
rem 1. Remplacer l'adresse ci-dessous par celle du hub du stand (ex. http://192.168.1.20:3000/ecran)
rem    ou de la demo en ligne. /ecran suit la tablette ; /ecran/noir, /ecran/sondage... restent figes.
rem 2. Mettre ce fichier dans Demarrer > Executer > shell:startup pour un lancement automatique.
rem 3. Desactiver la mise en veille de Windows (Alimentation > Ecran : jamais) : la page empeche
rem    la veille tant qu'elle est au premier plan, Windows peut l'ignorer apres une mise a jour.
set URL=https://mediacom-event-os.pages.dev/ecran
set PROFIL=%LOCALAPPDATA%\Mediacom-Ecran

set CHROME="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

start "" %CHROME% --kiosk --user-data-dir="%PROFIL%" --no-first-run --noerrdialogs --disable-session-crashed-bubble --disable-infobars --disable-translate --autoplay-policy=no-user-gesture-required --overscroll-history-navigation=0 --disable-pinch --check-for-update-interval=31536000 "%URL%"
