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

L’install crée aussi une **icône GerMaCrise** sur le Bureau et dans le menu Applications.

### Relancer plus tard

| Méthode | Action |
|:--------|:-------|
| **Icône Bureau** | Double-clic sur **GerMaCrise** |
| **Menu Applications** | Chercher **GerMaCrise** |
| **Ligne de commande** | `~/demarrer-GerMaCrise.sh` |

Une fenêtre terminal s’ouvre : **la laisser ouverte** pendant l’utilisation. Arrêt : `Ctrl+C`.

### Icône Bureau — si le double-clic est bloqué

Sur GNOME / Cinnamon, au premier clic :

1. Clic droit sur l’icône **GerMaCrise**  
2. **Autoriser le lancement** (ou *Allow Launching*)

Ou recréer l’icône :

```bash
~/GerMaCrise/creer-icone.sh
```

(adapter si le dossier d’install n’est pas `~/GerMaCrise`)

### Créer l’icône à la main (déjà installé)

```bash
# Si GerMaCrise est dans ~/GerMaCrise :
~/GerMaCrise/creer-icone.sh

# Sinon, depuis le dossier du projet :
bash creer-icone.sh
```

Fichier créé : `~/Bureau/GerMaCrise.desktop` (ou `~/Desktop/…`).

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

- [BIPPER-WEB.md](./BIPPER-WEB.md)
- [INSTALL-SRV-WEB.md](./INSTALL-SRV-WEB.md)
- [INSTALL-DOCKER.md](./INSTALL-DOCKER.md)

| Fichier | Rôle |
|:--------|:-----|
| [`install.sh`](../install.sh) | Install + démarrage + icône Debian |
| [`install.bat`](../install.bat) | Install Windows |
| `~/GerMaCrise/demarrer.sh` | Lance le serveur |
| `~/GerMaCrise/GerMaCrise.desktop` | Raccourci (icône) |
| `~/GerMaCrise/creer-icone.sh` | Recrée l’icône Bureau / menu |
| `demarrer-GerMaCrise.bat` | Relance Windows |
