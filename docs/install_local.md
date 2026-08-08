# Installation locale — GerMaCrise (simple)

Sans Cursor, sans Docker. **Deux commandes** sur Debian, ou un double-clic sous Windows.

---

## Debian (PC crise)

Dans un terminal :

```bash
wget -O install.sh https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.sh
bash install.sh
```

1. Saisir le mot de passe si demandé  
2. Attendre la fin (quelques minutes)  
3. Ouvrir **Chrome** ou **Chromium** sur : **http://localhost:5173**

### Relancer plus tard

```bash
~/demarrer-GerMaCrise.sh
```

---

## Windows

1. Télécharger le dépôt (ZIP GitHub) ou le cloner  
2. Double-cliquer sur **`install.bat`** à la racine  
3. Ouvrir **Chrome** ou **Edge** sur : **http://localhost:5173**

Relancer : double-clic sur **`demarrer-GerMaCrise.bat`** (dossier utilisateur) ou **`GerMaCrise.bat`** sur le Bureau.

---

## Important

| | |
|:--|:--|
| Navigateur | **Chrome / Chromium / Edge** (USB radio) |
| Fenêtre terminal | **À laisser ouverte** pendant l’utilisation |
| Arrêt | `Ctrl+C` dans le terminal |

Si `install.sh` affiche `<!DOCTYPE html>` : mauvaise URL. Recopier **exactement** la commande `wget` ci-dessus (lien `raw.githubusercontent.com`).

---

## Pour les administrateurs

Détail technique (Node 22, pnpm, build serveur, Docker) :

- [BIPPER-WEB.md](./BIPPER-WEB.md)
- [INSTALL-SRV-WEB.md](./INSTALL-SRV-WEB.md)
- [INSTALL-DOCKER.md](./INSTALL-DOCKER.md)

Fichiers :

| Fichier | Rôle |
|:--------|:-----|
| [`install.sh`](../install.sh) | Install + démarrage Debian |
| [`install.bat`](../install.bat) | Install Windows |
| `~/GerMaCrise/demarrer.sh` | Relance Debian |
| `demarrer-GerMaCrise.bat` | Relance Windows |
