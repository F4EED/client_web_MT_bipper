# Installation locale — Client web GerMaCrise / Gaulix Bipper

Procédure pour installer et lancer le client web sur un PC **sans Cursor**, **sans Docker**, avec uniquement Windows (ou Linux) + outils libres.

> Dépôt : [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper)  
> Doc produit : [BIPPER-WEB.md](./BIPPER-WEB.md)  
> Autres guides : [INSTALL-SRV-WEB.md](./INSTALL-SRV-WEB.md) (serveur) · [INSTALL-DOCKER.md](./INSTALL-DOCKER.md) (Docker)

---

## Ce que vous obtiendrez

- Le client web **GerMaCrise** (pages `/alerts`, `/settings/bipper`, carte, connexion radio)
- En mode **développement** : serveur Vite sur `http://localhost:5173` (ou port indiqué dans le terminal)
- En mode **production locale** : build statique dans `apps/web/dist/` + aperçu local

Aucun backend Node n’est requis pour *utiliser* le client après build : c’est une SPA.  
Node.js + pnpm servent uniquement à **télécharger les dépendances**, **compiler** et éventuellement **servir** en local.

**USB / Bluetooth** : utiliser **Chrome** ou **Edge**. Contexte sécurisé obligatoire (`http://localhost` ou `https://`).

---

## Prérequis

| Outil | Version | Rôle |
|:------|:--------|:-----|
| **Git** | récent | Cloner le dépôt |
| **Node.js** | **20 LTS** ou plus | Runtime JS |
| **pnpm** | **11.9.0** | Gestionnaire de paquets du monorepo |
| Navigateur | Chrome / Edge | Web Serial (USB) + Web Bluetooth |

Espace disque recommandé : **≥ 2 Go** libres (dépendances + build).

---

## Méthode rapide — scripts d’installation

Les scripts installent (si besoin) Git / Node, activent pnpm, clônent le dépôt si nécessaire, puis `pnpm install`.

### Windows (PowerShell)

1. Ouvrir **PowerShell** (pas besoin d’admin si Git et Node sont déjà installés ; `winget` peut demander une élévation).
2. Autoriser l’exécution du script pour la session :

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

3. Télécharger le dépôt **ou** lancer le script depuis une copie déjà présente :

```powershell
# Option A — depuis une copie du dépôt (dossier scripts\ déjà là)
cd "C:\chemin\vers\client_web_MT_bipper"
.\scripts\install-local.ps1

# Option B — tout-en-un : clone dans %USERPROFILE%\client_web_MT_bipper puis install
irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/scripts/install-local.ps1 -OutFile "$env:TEMP\install-local.ps1"
powershell -ExecutionPolicy Bypass -File "$env:TEMP\install-local.ps1"
```

Options utiles :

```powershell
.\scripts\install-local.ps1 -SkipWinget          # ne pas installer Git/Node via winget
.\scripts\install-local.ps1 -StartDev            # lancer le serveur après install
.\scripts\install-local.ps1 -Build               # build production (apps/web/dist)
.\scripts\install-local.ps1 -TargetDir "D:\GerMaCrise\web"
```

Double-clic possible : `scripts\install-local.bat` (appelle le `.ps1`).

### Linux (bash)

```bash
chmod +x scripts/install-local.sh
./scripts/install-local.sh

# Options
./scripts/install-local.sh --skip-apt     # ne pas installer via apt/dnf
./scripts/install-local.sh --start-dev    # lancer le serveur après install
./scripts/install-local.sh --build        # build production
./scripts/install-local.sh --dir ~/GerMaCrise/web
```

---

## Méthode manuelle (Windows — machine neuve)

### 1. Installer Git

1. Télécharger : [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Installer avec les options par défaut (Git dans le PATH).
3. Fermer / rouvrir PowerShell, vérifier :

```powershell
git --version
```

Ou avec **winget** :

```powershell
winget install --id Git.Git -e --source winget
```

### 2. Installer Node.js 20 LTS

1. Télécharger : [https://nodejs.org/](https://nodejs.org/) → **LTS** (20.x ou supérieur)
2. Cocher « Add to PATH » à l’installation.
3. Nouveau PowerShell :

```powershell
node -v    # v20.x ou plus
npm -v
```

Ou :

```powershell
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

### 3. Cloner le dépôt

```powershell
cd $env:USERPROFILE
git clone https://github.com/F4EED/client_web_MT_bipper.git
cd client_web_MT_bipper
```

Sans Git : sur GitHub → **Code** → **Download ZIP** → décompresser, puis `cd` dans le dossier.

### 4. Activer pnpm 11.9.0

```powershell
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm -v
```

Si `corepack` échoue :

```powershell
npx pnpm@11.9.0 -v
# ensuite préfixer les commandes par : npx pnpm@11.9.0 …
```

### 5. Installer les dépendances

```powershell
pnpm install
```

Première fois : plusieurs minutes selon la connexion.

### 6. Lancer le client

**Mode développement** (rechargement à chaud) :

```powershell
pnpm --filter meshtastic-web dev
```

Ouvrir l’URL affichée (souvent `http://localhost:5173`) dans **Chrome** ou **Edge**.

**Build + aperçu production** :

```powershell
pnpm --filter meshtastic-web build
pnpm --filter meshtastic-web preview
```

Les fichiers statiques sont dans `apps\web\dist\` (déployables ensuite via [INSTALL-SRV-WEB.md](./INSTALL-SRV-WEB.md)).

---

## Méthode manuelle (Linux)

### Debian / Ubuntu

```bash
sudo apt update
sudo apt install -y git curl ca-certificates

# Node 20 LTS (NodeSource) — ou installer depuis nodejs.org / nvm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

git clone https://github.com/F4EED/client_web_MT_bipper.git
cd client_web_MT_bipper

corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install
pnpm --filter meshtastic-web dev
```

### Fedora

```bash
sudo dnf install -y git nodejs
# vérifier : node -v ≥ 20
```

Puis mêmes étapes `clone` → `corepack` → `pnpm install` → `dev`.

---

## Vérifications après démarrage

1. La page d’accueil du client s’affiche.
2. Menu / routes **GerMaCrise** : `/alerts`, `/settings/bipper`.
3. Connexion radio USB : Chrome/Edge → choisir le port série du PC crise / bipper.
4. Un seul logiciel à la fois sur le port COM (pas Chrome + autre outil série).

---

## Dépannage

| Problème | Piste |
|:---------|:------|
| `pnpm : commande introuvable` | `corepack enable` puis `corepack prepare pnpm@11.9.0 --activate`, ou `npx pnpm@11.9.0 …` |
| `preinstall: only-allow pnpm` | Ne pas utiliser `npm install` / `yarn` — uniquement **pnpm** |
| `node` / `git` introuvable après install | Fermer le terminal et en ouvrir un nouveau (PATH) |
| `EACCES` / droits npm (Linux) | Éviter `sudo pnpm` ; corriger le préfixe npm ou utiliser nvm |
| `Web Serial not supported` | Chrome ou Edge ; pas Safari ; Firefox ≥ 151 seulement |
| Port déjà utilisé | Arrêter l’autre process, ou noter le port alternatif affiché par Vite |
| `husky` / `prepare` en erreur | Le dépôt doit être un clone Git (pas toujours critique ; réessayer `pnpm install`) |
| Build très lent / antivirus | Ajouter une exclusion sur le dossier du projet (Windows Defender) |

---

## Mise à jour

```bash
cd client_web_MT_bipper
git pull
pnpm install
pnpm --filter meshtastic-web build   # si vous utilisez dist/
```

Ou relancer `scripts/install-local.ps1` / `scripts/install-local.sh` (réinstall des deps sans forcément recloner).

---

## Scripts fournis

| Fichier | Plateforme |
|:--------|:-----------|
| [`scripts/install-local.ps1`](../scripts/install-local.ps1) | Windows (PowerShell) |
| [`scripts/install-local.bat`](../scripts/install-local.bat) | Windows (lanceur) |
| [`scripts/install-local.sh`](../scripts/install-local.sh) | Linux / macOS (bash) |
