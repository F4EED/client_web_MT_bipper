# Client web Gaulix Bipper

| | |
|:--|:--|
| **Dépôt** | [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper) |
| **Base** | Fork [meshtastic/web](https://github.com/meshtastic/web) |
| **Firmware cible** | Gaulix Bipper **v1.11.0+** (L1 Pro · ThinkNode M1/M2 · PC crise XIAO S3+SX1262) |
| **Chemin local** | `C:\client web mesthastic_bipper` |
| **Install** | [INSTALL-SRV-WEB.md](INSTALL-SRV-WEB.md) · [INSTALL-DOCKER.md](INSTALL-DOCKER.md) |
| **Écosystème** | Firmware + Android — voir firmware [`docs/ECOSYSTEME-GAULIX.md`](https://github.com/F4EED/Bipper_L1Pro/blob/develop/docs/ECOSYSTEME-GAULIX.md) |

> **Règle** : ce client évolue **en même temps** que le firmware et l’app Android (protocole, tags, docs).

---

## Rôle

SPA Vite/React pour **connecter** un nœud Meshtastic (USB Serial / Web Bluetooth) et :

1. **Gérer les alertes** Gaulix (composer `#alerte` / `#secours` / `#vigilance` / `#info` / `#fin`, suivi local, ACK lecture) ;
2. **Paramétrer un Bipper** (tags T1–T10, code, `#status`, bips) ;
3. (prévu) afficher waypoints **SOS** et page **Signaler POI**.

Aucun backend Node n’est requis en production : build → fichiers statiques dans `apps/web/dist/`.

---

## Pages Gaulix

| Route | Écran | Contenu |
|:------|:------|:--------|
| `/alerts` | **Gestion des alertes** | 4 onglets : **Signalement** (1er, waypoints POI → Fr_Balise), **Message**, **Alertes**, **ACK lecture** |
| `/settings/bipper` | **Paramétrer le Bipper** | Status, tags **T1–T10**, code, bips |
| (prévu) | **Signaler POI** | Envoi waypoint / objet POI |
| `/map` | Carte | Waypoints mesh (dont SOS à styliser) |

Persistance locale (session coordinateur) : clé `localStorage` `gaulix.alertManager.v1` (store Zustand).

---

## Protocole (partagé Android / firmware) — v1.11

Implémentation cible : `apps/web/src/lib/bipper/alertCommands.ts` (+ `serviceTags.ts`, `pagerStatus.ts`, `parsePagerAck.ts`).

```text
#alerte|#secours|#vigilance|#info [N] <texte> [#entité…]
#fin [N] [#entité]
```

ACK lecture bipper (firmware **v1.12**) :

```text
Pager ACK alerte [#N] JJ/MM HH:MM[ — text][ | latN/S lonE/W]
```

Exemples :

```text
#alerte 42 incendie hall #SDIS42 #test
#fin 42
#tagset T1=SDIS42,T2=test,T10=UDIOM42
Pager ACK alerte #42 31/07 10:30 — incendie hall | 45.12345N 4.56789E
```

| Règle | Détail |
|:------|:-------|
| `N` | Numéro d’alerte optionnel |
| Multi `#entité` | OU — le bip réagit s’il appartient à au moins une |
| Sans `#entité` | Tous les bippers |
| `#fin N` | Clôture l’alerte N uniquement |
| Appartenance locale | Slots **T1–T10** |
| ACK | Corrélé au nº `#N` si présent, sinon alerte ouverte récente + extrait texte |

Source de vérité détaillée : firmware `docs/ECOSYSTEME-GAULIX.md`.

> **État code web** : aligné protocole **v1.11** (nº d’alerte, multi-entités, T1–T10, `#tagset`, `#fin N`) + parsing ACK **v1.12**.

## Matériels firmware (connexion USB / BLE)

| Matériel | Env | Usage côté web |
|:---------|:----|:---------------|
| Seeed Wio Tracker L1 Pro | `seeed_wio_tracker_L1` | Paramétrer le Bipper + gestion des alertes |
| Seeed Wio Tracker L1 E-Ink | `seeed_wio_tracker_L1_eink` | Idem |
| Elecrow ThinkNode M1 | `thinknode_m1` | Idem |
| Elecrow ThinkNode M2 | `thinknode_m2` | Idem |
| Seeed XIAO ESP32-S3 + Wio-SX1262 | `seeed-xiao-s3-gaulix` | Radio **PC crise** (coordinateur) — gestion des alertes ; pas de tags pager locaux |

Détection HW pager : `SEEED_WIO_TRACKER_L1` / `_EINK` / `THINKNODE_M1` / `THINKNODE_M2`.

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
| `apps/web/src/pages/BipperSend/` | UI Gestion des alertes (Signalement / Message / Alertes / ACK) |
| `apps/web/src/lib/bipper/reportTypes.ts` | Types POI + emoji / codepoints Unicode (aligné Android) |
| `apps/web/src/core/stores/alertManagerStore/` | Suivi local + `localStorage` |
| `apps/web/src/pages/Settings/BipperConfig.tsx` | Config pager |
| `apps/web/src/components/PageComponents/Settings/Bipper/` | Panneaux Gaulix |
| `apps/web/src/lib/bipper/alertCommands.ts` | Format filaire |
| `apps/web/src/lib/bipper/parsePagerAck.ts` | Parse ACK lecture v1.12 |
| `apps/web/src/lib/bipper/serviceTags.ts` | T1–T10 / `#tagset` |
| `apps/web/src/core/hooks/useBipperPager.ts` | Commandes locales |
| `apps/web/src/core/hooks/usePagerAckIngest.ts` | Ingestion DM `Pager ACK` |
| `public/i18n/locales/*/bipper.json` | i18n |
| `.cursor/rules/gaulix-ecosystem-sync.mdc` | Sync 3 projets |
