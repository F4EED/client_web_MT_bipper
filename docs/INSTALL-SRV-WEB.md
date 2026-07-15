# Installation serveur web — Client web Bipper / Meshtastic

Guide pour déployer le client web Gaulix Bipper (fork Meshtastic) comme
**site statique** sur un serveur classique (Nginx, Apache, Caddy, IIS, etc.).

> Dépôt : [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper)  
> Sortie de build : `apps/web/dist/`  
> Page Bipper : `/settings/bipper`

---

## Principe

Le client est une **SPA** (Single Page Application) Vite/React :

1. On **compile** une fois (sur une machine de build ou sur le serveur).
2. On **copie** le contenu de `apps/web/dist/` vers la racine du site.
3. Le serveur web sert les fichiers et **renvoie `index.html`** pour les routes
   inconnues (ex. `/settings/bipper`).

Aucun backend Node.js n’est requis en production.

---

## Prérequis build

| Outil | Version |
| --- | --- |
| Node.js | 20+ recommandé |
| pnpm | 11.9.0 (`packageManager` du monorepo) |
| Git | pour cloner le dépôt |

---

## 1. Build des fichiers statiques

```bash
git clone https://github.com/F4EED/client_web_MT_bipper.git
cd client_web_MT_bipper

corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install
pnpm --filter meshtastic-web build
```

Sous Windows (PowerShell) :

```powershell
cd "C:\chemin\vers\client_web_MT_bipper"
npx pnpm@11.9.0 install
npx pnpm@11.9.0 --filter meshtastic-web build
```

Résultat attendu :

```text
apps/web/dist/
  index.html
  assets/
  i18n/
  …
```

### Archive pour transfert (optionnel)

Depuis `apps/web` :

```bash
pnpm --filter meshtastic-web package
```

Produit `apps/web/dist/build.tar` (fichiers gzippés prêts à déployer).

Ou archive simple :

```bash
tar -czf bipper-web-dist.tar.gz -C apps/web/dist .
```

---

## 2. Déployer sur le serveur

Exemple (Linux) :

```bash
sudo mkdir -p /var/www/bipper-web
sudo rsync -a --delete apps/web/dist/ /var/www/bipper-web/
# ou : sudo tar -xzf bipper-web-dist.tar.gz -C /var/www/bipper-web
```

Droits typiques Nginx :

```bash
sudo chown -R www-data:www-data /var/www/bipper-web
```

---

## 3. Configuration serveur

### Nginx (recommandé)

Point de départ : la config du dépôt `apps/web/infra/default.conf`
(adaptée ci-dessous pour le port 80 / TLS).

```nginx
server {
  listen 80;
  server_name bipper.exemple.local;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name bipper.exemple.local;

  # ssl_certificate     /etc/letsencrypt/live/bipper.exemple.local/fullchain.pem;
  # ssl_certificate_key /etc/letsencrypt/live/bipper.exemple.local/privkey.pem;

  root /var/www/bipper-web;
  index index.html;

  # Assets versionnés : cache long
  location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|webp|avif|svg|ttf|otf|woff|woff2|map)$ {
    access_log off;
    expires 3M;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  location = /index.html {
    add_header Cache-Control "no-cache";
  }

  # SPA : toutes les routes → index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  gzip on;
  gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

Recharger :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Apache (2.4+)

Activer `mod_rewrite`, puis dans le VirtualHost (ou `.htaccess` à la racine du site) :

```apache
<VirtualHost *:443>
  ServerName bipper.exemple.local
  DocumentRoot /var/www/bipper-web

  <Directory /var/www/bipper-web>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted

    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </Directory>
</VirtualHost>
```

### Caddy

```caddyfile
bipper.exemple.local {
  root * /var/www/bipper-web
  encode gzip
  try_files {path} /index.html
  file_server
}
```

### IIS (Windows Server)

1. Installer le module **URL Rewrite**.
2. Créer un site pointant vers le dossier de `dist`.
3. Ajouter un `web.config` à la racine :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="90.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>
```

---

## 4. HTTPS et API navigateur

| Connexion | Web Serial (USB) | Web Bluetooth |
| --- | --- | --- |
| `https://…` | OK | OK |
| `http://localhost` / `http://127.0.0.1` | OK | OK |
| `http://IP-LAN` | **Refusé** | **Refusé** |

Pour un usage Bipper en USB depuis le LAN, prévoyez un certificat
(Let’s Encrypt, certificat interne, ou reverse proxy TLS).

---

## 5. Vérifications

Après déploiement :

1. Ouvrir `https://bipper.exemple.local/` (ou l’URL choisie).
2. Naviguer vers `/settings/bipper` — la page **Paramétrer le Bipper** doit s’afficher.
3. Connecter un Bipper (USB Serial ou Bluetooth) sous **contexte sécurisé**.
4. Firmware recommandé : Gaulix **v1.10+** (`#alerte texte #entité1 #entité2`).

---

## 6. Mise à jour

Sur la machine de build :

```bash
cd client_web_MT_bipper
git pull
pnpm install
pnpm --filter meshtastic-web build
rsync -a --delete apps/web/dist/ user@serveur:/var/www/bipper-web/
```

Pas besoin de redémarrer Node : seuls les fichiers statiques changent
(recharger Nginx si vous modifiez la conf).

---

## 7. Sous-chemin (ex. `https://exemple.local/bipper/`)

Par défaut le build Vite suppose une publication à la **racine** (`/`).

Pour un sous-chemin, il faut rebuilder avec une `base` Vite adaptée
(ex. `base: '/bipper/'` dans `apps/web/vite.config.ts`), puis déployer
dans `/var/www/…/bipper/`. Sans cela, les assets et le routeur casseront.

---

## Dépannage

| Symptôme | Cause fréquente |
| --- | --- |
| 404 en rechargeant `/settings/bipper` | Fallback SPA manquant (`try_files` / `RewriteRule`) |
| Page blanche | Mauvais `DocumentRoot`, ou build incomplet |
| i18n / textes manquants | Dossier `i18n/` non recopié depuis `dist/` |
| USB / BLE gris | Site en HTTP hors localhost |
| Ancienne UI après update | Cache navigateur / CDN — `index.html` en `no-cache` |

---

## Voir aussi

- [INSTALL-DOCKER.md](./INSTALL-DOCKER.md) — déploiement conteneurisé
- `apps/web/infra/default.conf` — référence Nginx utilisée dans l’image Docker
- Firmware Bipper : dépôt [F4EED/Bipper_L1Pro](https://github.com/F4EED/Bipper_L1Pro)
