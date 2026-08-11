# Installation locale — GerMaCrise (simple)

Sans Cursor, sans Docker.

---

## Debian (PC crise)

```bash
wget -O install.sh https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.sh
bash install.sh
```

Puis **Chrome / Chromium** → **http://localhost:5173**

Relancer : icône **GerMaCrise** sur le Bureau (ou `~/demarrer-GerMaCrise.sh`).

Recréer l’icône / entrée menu (XFCE, MATE, Cinnamon, GNOME, …) :

```bash
cd ~/GerMaCrise && git pull && bash creer-icone.sh
```

Puis dans le menu Applications, cherchez **GerMaCrise** (ou « crise »).  
Aussi sur le Bureau : **GerMaCrise.desktop** et **GerMaCrise.sh**.

Si le menu ne liste toujours rien :

```bash
sudo cp ~/.local/share/applications/germa-crise.desktop /usr/local/share/applications/
sudo update-desktop-database
```

Puis déconnexion / reconnexion (ou redémarrage du panneau XFCE).

Voir l’environnement graphique :

```bash
echo "${XDG_CURRENT_DESKTOP:-?} / ${DESKTOP_SESSION:-?}"
ls -la ~/.local/share/applications/germa-crise.desktop
```

### AppImage native (alternative au serveur web)

Si une release GitHub Android fournit `GerMaCrise.AppImage` :

```bash
wget -O GerMaCrise.AppImage \
  "https://github.com/F4EED/bipper_android/releases/latest/download/GerMaCrise.AppImage"
chmod +x GerMaCrise.AppImage
./GerMaCrise.AppImage
```

Sinon build local (Docker) depuis le dépôt `bipper_android` : `scripts/build-germacrise-appimage.ps1` / Dockerfile `scripts/Dockerfile.appimage`.

### APK téléphone (Crosscall / Android)

```bash
# Depuis un PC avec adb
wget -O GerMaCrise.apk \
  "https://github.com/F4EED/bipper_android/releases/latest/download/GerMaCrise-fdroid-universal-release.apk"
adb install -r -t GerMaCrise.apk
```

Tags : `germacrise-v*` sur [F4EED/bipper_android/releases](https://github.com/F4EED/bipper_android/releases).

---

## Windows 10 / 11

### Méthode recommandée (une ligne PowerShell)

1. Clic droit sur le menu Démarrer → **Terminal** (ou **Windows PowerShell**)  
2. Coller :

```powershell
irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex
```

3. Valider avec Entrée, saisir si Windows demande une autorisation  
4. Attendre la fin, puis ouvrir **Chrome** ou **Edge** → **http://localhost:5173**

### Variante double-clic

1. Télécharger le ZIP du dépôt GitHub (Code → Download ZIP) et décompresser  
2. Double-cliquer sur **`install.bat`**  
3. Chrome / Edge → **http://localhost:5173**

### Relancer plus tard

| Méthode | Action |
|:--------|:-------|
| **Bureau** | **GerMaCrise.lnk** ou **GerMaCrise.bat** |
| **Dossier utilisateur** | `%USERPROFILE%\demarrer-GerMaCrise.bat` |
| Recréer le raccourci | voir commande ci-dessous |

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\GerMaCrise\creer-icone.ps1"
```

Laisser la fenêtre noire ouverte pendant l’utilisation. Arrêt : fermer la fenêtre ou `Ctrl+C`.

> Windows n’affiche souvent pas une icône PNG sur un `.lnk` : le script utilise un `.ico` et place aussi un `.bat` sur le Bureau (comme sous Linux).

### Réinstallation propre (recommandé après une erreur d’icône)

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\GerMaCrise" -ErrorAction SilentlyContinue
irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex
```

### Si ça ne démarre pas

1. Fermer toutes les fenêtres GerMaCrise  
2. Supprimer le dossier `%USERPROFILE%\GerMaCrise` s’il est corrompu  
3. Rouvrir **Terminal** et relancer la commande `irm … | iex` ci-dessus  
4. Vérifier Chrome/Edge  
5. Antivirus : autoriser Node.js / le dossier `GerMaCrise`

### Messages identiques sur plusieurs canaux (Fr_*)

Si le **même** message apparaît sur Fr_Balise, Fr_EMCOM et Fr_BlaBla, mais pas dans GerMaCrise Android sur le même nœud :

```powershell
cd $env:USERPROFILE\GerMaCrise   # ou le clone local
git pull
```

Puis **Ctrl+F5** dans Chrome/Edge. Si besoin : Paramètres site → effacer les données pour `localhost`. Détail : `docs/BIPPER-WEB.md` § Messages / canaux.

### APK téléphone (depuis Windows)

1. Brancher le téléphone (débogage USB)  
2. Télécharger l’APK depuis [releases bipper_android](https://github.com/F4EED/bipper_android/releases) (`GerMaCrise-fdroid-universal-release.apk`)  
3. Installer :

```bat
adb install -r -t GerMaCrise-fdroid-universal-release.apk
```

(Voir aussi Android `docs/BIPPER-ANDROID.md` — Crosscall Core-X4.)

### Erreur Python `No module named 'meshtastic'`

Le client web **n’utilise pas** le module Python Meshtastic.  
Si l’erreur apparaît **au clic sur l’icône** (alors que l’install avait réussi) : le PATH Windows contient souvent `meshtastic.exe` (pip), qui pollue le lanceur.

1. Recréer le raccourci (lanceur sans Python) :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\GerMaCrise\creer-icone.ps1"
```

Ou, si le dossier n’a pas le script à jour :

```powershell
cd $env:USERPROFILE\GerMaCrise
git pull
powershell -NoProfile -ExecutionPolicy Bypass -File .\creer-icone.ps1
```

2. Optionnel, retirer le conflit Python :

```powershell
pip uninstall meshtastic
```

Journal install : `%TEMP%\germa-pnpm-install.log`

---

## Important

| | |
|:--|:--|
| Navigateur | **Chrome / Chromium / Edge** (USB radio) |
| Fenêtre serveur | **À laisser ouverte** |
| Arrêt | Fermer la fenêtre ou `Ctrl+C` |

---

## Fichiers

| Fichier | Rôle |
|:--------|:-----|
| [`install.sh`](../install.sh) | Install Debian |
| [`install.ps1`](../install.ps1) / [`install.bat`](../install.bat) | Install Windows |
| `creer-icone.sh` / `creer-icone.ps1` | Recréer le raccourci |
| `demarrer.sh` / `demarrer.bat` | Lancer le serveur |

Admin / serveur / Docker : [BIPPER-WEB.md](./BIPPER-WEB.md) · [INSTALL-SRV-WEB.md](./INSTALL-SRV-WEB.md) · [INSTALL-DOCKER.md](./INSTALL-DOCKER.md)
