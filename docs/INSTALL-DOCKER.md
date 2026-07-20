# Installation Docker — Client web Bipper / Meshtastic

Guide pour déployer le client web Gaulix Bipper (fork Meshtastic) avec Docker
ou Podman. L’image sert les fichiers statiques via **Nginx** (port **8080**).

> Dépôt : [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper)  
> Infra existante : `apps/web/infra/Containerfile` + `apps/web/infra/default.conf`  
> Doc produit : [BIPPER-WEB.md](./BIPPER-WEB.md) · Firmware cible **v1.10.0+**

---

## Prérequis

| Outil | Version |
| --- | --- |
| Docker Engine **ou** Podman | récent |
| (optionnel) Docker Compose | v2+ |
| Pour **construire** l’image depuis les sources | Node.js 20+, pnpm 11.9.0 |

Le navigateur qui ouvre le client a besoin d’un **contexte sécurisé** (HTTPS
ou `localhost`) pour USB Serial / Bluetooth.

---

## Option A — Image préconstruite Meshtastic (upstream)

Utile pour tester rapidement le client Meshtastic officiel (sans les pages
Bipper Gaulix de ce fork) :

```bash
docker run -d \
  -p 8080:8080 \
  --restart unless-stopped \
  --name meshtastic-web \
  ghcr.io/meshtastic/web
```

Puis ouvrir : <http://localhost:8080/>

> Pour le fork Bipper (page **Paramétrer le Bipper**, tags T1–T4, etc.),
> utilisez l’**option B** (build local) ci-dessous.

---

## Option B — Build local du fork Bipper (recommandé)

### 1. Cloner et installer

```bash
git clone https://github.com/F4EED/client_web_MT_bipper.git
cd client_web_MT_bipper

corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install
```

Sous Windows (PowerShell), si `pnpm` n’est pas dans le PATH :

```powershell
npx pnpm@11.9.0 install
```

### 2. Construire le client (Vite → `apps/web/dist`)

Depuis la **racine du monorepo** :

```bash
pnpm --filter meshtastic-web build
```

Ou :

```bash
npx pnpm@11.9.0 --filter meshtastic-web build
```

### 3. Construire l’image Docker

Le `Containerfile` attend le contexte de build à la **racine du monorepo**
(chemins `apps/web/dist` et `apps/web/infra/…`) :

```bash
docker build \
  -t bipper-web:latest \
  -f apps/web/infra/Containerfile \
  .
```

### 4. Lancer le conteneur

```bash
docker run -d \
  -p 8080:8080 \
  --restart unless-stopped \
  --name bipper-web \
  bipper-web:latest
```

| URL | Usage |
| --- | --- |
| <http://localhost:8080/> | Accueil client |
| <http://localhost:8080/alerts> | Envoi alerte Gaulix |
| <http://localhost:8080/settings/bipper> | Paramétrage Bipper / pager Gaulix |

Arrêt / suppression :

```bash
docker stop bipper-web
docker rm bipper-web
```

---

## Option C — Docker Compose

Créer un fichier `docker-compose.yml` à la racine du monorepo (après `pnpm … build`) :

```yaml
services:
  bipper-web:
    build:
      context: .
      dockerfile: apps/web/infra/Containerfile
    image: bipper-web:latest
    container_name: bipper-web
    ports:
      - "8080:8080"
    restart: unless-stopped
```

Puis :

```bash
pnpm --filter meshtastic-web build
docker compose up -d --build
```

Logs :

```bash
docker compose logs -f bipper-web
```

---

## HTTPS (reverse proxy)

Web Serial / Web Bluetooth **exigent HTTPS** hors `localhost`.

Exemple derrière un reverse proxy (Caddy / Traefik / Nginx) :

```text
https://bipper.exemple.local  →  http://127.0.0.1:8080
```

Le conteneur expose uniquement HTTP sur 8080 ; le TLS se termine sur le proxy.

Exemple minimal **Caddy** :

```caddyfile
bipper.exemple.local {
  reverse_proxy 127.0.0.1:8080
}
```

---

## Mise à jour

```bash
cd client_web_MT_bipper
git pull
pnpm install
pnpm --filter meshtastic-web build
docker build -t bipper-web:latest -f apps/web/infra/Containerfile .
docker stop bipper-web && docker rm bipper-web
docker run -d -p 8080:8080 --restart unless-stopped --name bipper-web bipper-web:latest
```

Avec Compose :

```bash
pnpm --filter meshtastic-web build
docker compose up -d --build
```

---

## Dépannage

| Symptôme | Piste |
| --- | --- |
| `ADD failed: … apps/web/dist` | Lancer le build **avant** `docker build`, et utiliser le contexte à la **racine** du monorepo |
| Page blanche / 404 sur refresh | Config Nginx SPA déjà fournie (`try_files … /index.html`) ; ne pas remplacer `default.conf` sans équivalent |
| USB / Bluetooth indisponible | Passer en HTTPS (ou rester sur `localhost`) |
| Port déjà utilisé | Changer le mapping : `-p 3000:8080` |

---

## Fichiers liés

| Fichier | Rôle |
| --- | --- |
| `apps/web/infra/Containerfile` | Image Nginx Alpine + copie de `dist/` |
| `apps/web/infra/default.conf` | Serveur Nginx (SPA, cache, gzip, port 8080) |
| `apps/web/package.json` → `docker:build` | Script de build image (adapter le contexte si besoin) |

Voir aussi : [BIPPER-WEB.md](./BIPPER-WEB.md) · [INSTALL-SRV-WEB.md](./INSTALL-SRV-WEB.md) (Nginx / Apache / Caddy sans Docker).
