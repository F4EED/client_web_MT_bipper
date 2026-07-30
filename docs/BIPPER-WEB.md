# Client web Gaulix Bipper

| | |
|:--|:--|
| **Dépôt** | [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper) |
| **Base** | Fork [meshtastic/web](https://github.com/meshtastic/web) |
| **Firmware cible** | Gaulix Bipper **v1.11.0+** (L1 Pro · ThinkNode M1 · ThinkNode M2) |
| **Chemin local** | `C:\client web mesthastic_bipper` |
| **Install** | [INSTALL-SRV-WEB.md](INSTALL-SRV-WEB.md) · [INSTALL-DOCKER.md](INSTALL-DOCKER.md) |
| **Écosystème** | Firmware + Android — voir firmware [`docs/ECOSYSTEME-GAULIX.md`](https://github.com/F4EED/Bipper_L1Pro/blob/develop/docs/ECOSYSTEME-GAULIX.md) |

> **Règle** : ce client évolue **en même temps** que le firmware et l’app Android (protocole, tags, docs).

---

## Rôle

SPA Vite/React pour **connecter** un nœud Meshtastic (USB Serial / Web Bluetooth) et :

1. **Envoyer des alertes** Gaulix (`#alerte`, `#secours`, `#vigilance`, `#info`, `#fin`) ;
2. **Paramétrer un Bipper** (tags T1–T10, code, `#status`, bips) ;
3. (prévu) afficher waypoints **SOS** et page **Signaler POI**.

Aucun backend Node n’est requis en production : build → fichiers statiques dans `apps/web/dist/`.

---

## Pages Gaulix

| Route | Écran | Contenu |
|:------|:------|:--------|
| `/alerts` | **Envoi alerte** | Composeur (type, **nº**, texte, **multi-appartenances**, destination) |
| `/settings/bipper` | **Paramétrer le Bipper** | Status, tags **T1–T10**, code, bips |
| (prévu) | **Signaler POI** | Envoi waypoint / objet POI |
| `/map` | Carte | Waypoints mesh (dont SOS à styliser) |

---

## Protocole (partagé Android / firmware) — v1.11

Implémentation cible : `apps/web/src/lib/bipper/alertCommands.ts` (+ `serviceTags.ts`, `pagerStatus.ts`).

```text
#alerte|#secours|#vigilance|#info [N] <texte> [#entité…]
#fin [N] [#entité]
```

Exemples :

```text
#alerte 42 incendie hall #SDIS42 #test
#fin 42
#tagset T1=SDIS42,T2=test,T10=UDIOM42
```

| Règle | Détail |
|:------|:-------|
| `N` | Numéro d’alerte optionnel |
| Multi `#entité` | OU — le bip réagit s’il appartient à au moins une |
| Sans `#entité` | Tous les bippers |
| `#fin N` | Clôture l’alerte N uniquement |
| Appartenance locale | Slots **T1–T10** |

Source de vérité détaillée : firmware `docs/ECOSYSTEME-GAULIX.md`.

> **État code web** : aligné protocole **v1.11** (nº d’alerte, multi-entités, T1–T10, `#tagset`, `#fin N`).

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
4. Firmware Bipper **v1.11.0+**.

---

## Fichiers clés

| Chemin | Rôle |
|:-------|:-----|
| `apps/web/src/pages/BipperSend/` | UI envoi alerte |
| `apps/web/src/pages/Settings/BipperConfig.tsx` | Config pager |
| `apps/web/src/components/PageComponents/Settings/Bipper/` | Panneaux Gaulix |
| `apps/web/src/lib/bipper/alertCommands.ts` | Format filaire |
| `apps/web/src/lib/bipper/serviceTags.ts` | T1–T10 / `#tagset` |
| `apps/web/src/core/hooks/useBipperPager.ts` | Commandes locales |
| `public/i18n/locales/*/bipper.json` | i18n |
| `.cursor/rules/gaulix-ecosystem-sync.mdc` | Sync 3 projets |
