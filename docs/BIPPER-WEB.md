# Client web Gaulix Bipper

| | |
|:--|:--|
| **Dépôt** | [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper) |
| **Base** | Fork [meshtastic/web](https://github.com/meshtastic/web) |
| **Firmware cible** | Gaulix Bipper **v1.10.0+** ([F4EED/Bipper_L1Pro](https://github.com/F4EED/Bipper_L1Pro) — `docs/BIPPER1.md`) |
| **Install** | [INSTALL-SRV-WEB.md](INSTALL-SRV-WEB.md) · [INSTALL-DOCKER.md](INSTALL-DOCKER.md) |
| **Écosystème** | Firmware + Android — voir firmware `docs/ECOSYSTEME-GAULIX.md` |

---

## Rôle

SPA Vite/React pour **connecter** un nœud Meshtastic (USB Serial / Web Bluetooth) et :

1. **Envoyer des alertes** Gaulix (`#alerte`, `#secours`, `#vigilance`, `#info`, `#fin`) ;
2. **Paramétrer un Bipper** (tags T1–T4, code, `#status`, bips).

Aucun backend Node n’est requis en production : build → fichiers statiques dans `apps/web/dist/`.

---

## Pages Gaulix

| Route | Écran | Contenu |
|:------|:------|:--------|
| `/alerts` | **Envoi alerte** | Composeur (type, texte, appartenance, destination canal Alerte ou DM) |
| `/settings/bipper` | **Paramétrer le Bipper** | Onglets Gaulix : status, tags T1–T4, code, bips |

Accès UI :

- Sidebar → entrée **Alertes** (i18n `bipper`) ;
- Settings → **Paramétrer le Bipper**.

Logo Gaulix : `public/images/gaulix_rond.png` (panneau device / branding).

---

## Protocole (partagé Android / firmware)

Implémentation : `apps/web/src/lib/bipper/alertCommands.ts` (+ `serviceTags.ts`, `pagerStatus.ts`).

```text
#alerte|#secours|#vigilance|#info <texte> [#appartenance]
#fin [#appartenance]
```

- **Appartenance** : dernier jeton `#…` ; vide = tous les Bippers.
- À la réception, le firmware compare à **T1–T4**.
- Envoi recommandé sur le canal nommé **Alerte**, sinon DM vers un nœud.

Tests unitaires : `apps/web/src/lib/bipper/alertCommands.test.ts`.

---

## Développement local

```bash
git clone https://github.com/F4EED/client_web_MT_bipper.git
cd client_web_MT_bipper
corepack enable && corepack prepare pnpm@11.9.0 --activate
pnpm install
pnpm --filter meshtastic-web dev
```

Build production :

```bash
pnpm --filter meshtastic-web build
# → apps/web/dist/
```

**Contexte sécurisé** obligatoire pour USB/BLE : `https://` ou `http://localhost`.

---

## Déploiement

| Guide | Usage |
|:------|:------|
| [INSTALL-SRV-WEB.md](INSTALL-SRV-WEB.md) | Nginx / Apache / Caddy / IIS |
| [INSTALL-DOCKER.md](INSTALL-DOCKER.md) | Image Nginx (port 8080) |

Après déploiement, vérifier :

1. `/` charge le client ;
2. `/alerts` et `/settings/bipper` (fallback SPA `index.html`) ;
3. Connexion USB/BLE sous HTTPS ou localhost ;
4. Firmware Bipper **v1.10.0+**.

---

## Fichiers clés

| Chemin | Rôle |
|:-------|:-----|
| `apps/web/src/pages/BipperSend/` | UI envoi alerte |
| `apps/web/src/pages/Settings/BipperConfig.tsx` | Config pager |
| `apps/web/src/components/PageComponents/Settings/Bipper/` | Panneaux Gaulix |
| `apps/web/src/lib/bipper/` | Protocole partagé |
| `apps/web/src/routes.tsx` | Routes `/alerts`, `/settings/bipper` |
| `apps/web/public/locales/*/bipper.json` | i18n |

---

## Voir aussi

- Firmware : [F4EED/Bipper_L1Pro](https://github.com/F4EED/Bipper_L1Pro) — `docs/BIPPER1.md`
- Android : [F4EED/bipper_android](https://github.com/F4EED/bipper_android) — `docs/BIPPER-ANDROID.md`
