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

### Si ça ne démarre pas

1. Fermer toutes les fenêtres GerMaCrise  
2. Supprimer le dossier `%USERPROFILE%\GerMaCrise` s’il est corrompu  
3. Rouvrir **Terminal** et relancer :

```powershell
irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex
```

4. Vérifier Chrome/Edge  
5. Antivirus : autoriser Node.js / le dossier `GerMaCrise`

### Erreur Python `No module named 'meshtastic'`

Le client web **n’utilise pas** le module Python Meshtastic.  
Si cette erreur apparaît, un autre outil Python (CLI `meshtastic`) gêne souvent l’installation :

```powershell
pip uninstall meshtastic
# ou : pip3 uninstall meshtastic
```

Puis relancer l’install GerMaCrise. Journal détaillé : `%TEMP%\germa-pnpm-install.log`

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
