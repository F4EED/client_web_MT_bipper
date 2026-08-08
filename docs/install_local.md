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

Si l’icône refuse de démarrer : clic droit → **Autoriser le lancement**.  
Recréer l’icône :

```bash
bash ~/GerMaCrise/creer-icone.sh
```

Sous GNOME, si le Bureau n’affiche aucune icône :

```bash
sudo apt-get install -y gnome-shell-extension-desktop-icons-ng
bash ~/GerMaCrise/creer-icone.sh
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
| **Bureau** | Double-clic sur le raccourci **GerMaCrise** |
| **Dossier utilisateur** | `demarrer-GerMaCrise.bat` |
| Recréer le raccourci | `powershell -File %USERPROFILE%\GerMaCrise\creer-icone.ps1` |

Laisser la fenêtre noire ouverte pendant l’utilisation. Arrêt : fermer la fenêtre ou `Ctrl+C`.

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
