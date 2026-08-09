# Client web Gaulix Bipper

| | |
|:--|:--|
| **Dépôt** | [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper) |
| **Base** | Fork [meshtastic/web](https://github.com/meshtastic/web) |
| **Firmware cible** | Gaulix Bipper **v1.12+** (pagers L1/M1/M2 · PC crise XIAO S3+SX1262 · PC crise ThinkNode M2) |
| **Chemin local** | `C:\client web mesthastic_bipper` |
| **Install** | [install_local.md](install_local.md) — Debian : `wget` + `bash install.sh` · Windows : `install.bat` · [INSTALL-SRV-WEB.md](INSTALL-SRV-WEB.md) · [INSTALL-DOCKER.md](INSTALL-DOCKER.md) |
| **Écosystème** | Firmware + Android — voir firmware [`docs/ECOSYSTEME-GAULIX.md`](https://github.com/F4EED/Bipper_L1Pro/blob/develop/docs/ECOSYSTEME-GAULIX.md) · install APK Android : [`BIPPER-ANDROID.md`](https://github.com/F4EED/bipper_android/blob/main/docs/BIPPER-ANDROID.md#installation-sur-téléphone) |

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
| `/alerts` | **GerMaCrise** | 4 onglets : **Signalement** (Routes / Status / SDIS / Météo / Secourisme / Crise / ADRASEC — matrice Excel + Météo), **Message**, **Alertes**, **ACK lecture** |
| `/settings/bipper` | **Paramétrer le Bipper** | Status, tags **T1–T10**, code, bips |
| (prévu) | **Signaler POI** | Envoi waypoint / objet POI |
| `/map` | Carte | Waypoints mesh (dont SOS à styliser) |

Persistance locale (session coordinateur) : clé `localStorage` `gaulix.alertManager.v1` (store Zustand).

### Signalement — objets Alerte + Fr_Balise

Tous les boutons → **waypoint** `WAYPOINT_APP` (PortNum 8), GPS obligatoire, priorité **`ALERT`**, double envoi (`wantAck=false`, pause 500 ms) :

1. **Fr_Balise** (canal 0)  
2. **Alerte** (canal 7)

Code : `ReportTab.tsx` + `lib/bipper/reportTypes.ts`. Ami hors LoRa = MQTT uniquement ; si seul Alerte arrive, vérifier l’uplink **Primary** de la passerelle.

Catégories : **Routes / Status / SDIS / Météo / Secourisme / Crise / ADRASEC**.  
Onglet **Météo** : Pluie, Pluie forte, Orage, Fort orage, Brouillard, Neige, Grêle, Vent fort, Canicule, Gel, Verglas (même dual TX waypoint).

**MQTT** : ce n’est pas un bug UI si un objet n’apparaît pas sur le broker — le **PC crise** ne publie pas MQTT en usine ; l’uplink passe par une **passerelle MQTT dédiée** (MQTT activé + uplink canal + portée LoRa). Checklist : firmware `docs/ECOSYSTEME-GAULIX.md` § Checklist diagnostic MQTT.

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

## Matériels firmware (connexion USB / BLE / Wi‑Fi)

### Pagers (`GAULIX_PAGER=1`) — paramétrage tags + alertes

| Matériel | Env PlatformIO | Usage côté web |
|:---------|:---------------|:---------------|
| Seeed Wio Tracker L1 Pro | `seeed_wio_tracker_L1` | Paramétrer le Bipper + GerMaCrise (alertes / signalement) |
| Seeed Wio Tracker L1 E-Ink | `seeed_wio_tracker_L1_eink` | Idem |
| Elecrow ThinkNode M1 | `thinknode_m1` | Idem |
| Elecrow ThinkNode M2 | `thinknode_m2` | Idem (bipper OLED) |

Détection HW pager : `SEEED_WIO_TRACKER_L1` / `_EINK` / `THINKNODE_M1` / `THINKNODE_M2`.

### Nœuds PC de crise (`GAULIX_PC_NODE=1`) — radio coordinateur

| Matériel | Env PlatformIO | Connexion | Notes |
|:---------|:---------------|:----------|:------|
| Seeed XIAO ESP32-S3 + Wio-SX1262 | `seeed-xiao-s3-gaulix` | USB / BLE / Wi‑Fi | Sans écran — GerMaCrise (alertes / signalement) ; pas de tags pager locaux |
| Elecrow ThinkNode M2 | `thinknode_m2-gaulix` | USB / BLE / Wi‑Fi | **OLED** statut Meshtastic ; pas d’UI pager — distinct de `thinknode_m2` (bipper) |

Usine PC crise (`GAULIX_PC_NODE`) :

| Champ | Valeur usine |
|:------|:-------------|
| Nom long | **Gaulix PC Crise** (souvent renommé opérationnellement, ex. `GMC - PC Gestion Crise`) |
| Nom court | **🔴** (cercle rouge, emoji UTF-8 4 octets — limite Meshtastic) |
| Rôle | **CLIENT** |
| Rebroadcast | **LOCAL_ONLY** |
| Radio | EU868 / canaux Gaulix |

Flash M2 PC crise : `pio run -e thinknode_m2-gaulix -t upload --upload-port COMx` (CH340, ex. COM45).

### Branding GerMaCrise (client)

Portail / POC : [germacrise.wordpress.com](https://germacrise.wordpress.com/).

| Élément | Valeur |
|:--------|:-------|
| Titre UI | **GerMaCrise-meshtastic** |
| Icône app / favicon / PWA | `public/images/germacrise_icon.png` — mesh + antenne + alerte, fond orange `#E85D04`, motif bleu nuit `#0F172A` (pas de G Gaulix) |
| PWA `short_name` | **🔴** (même symbole que le nom court radio PC crise) |
| Master 1024 | `docs/assets/germacrise-icon-1024.png` |

---

## Développement local

Installation utilisateur : **[install_local.md](install_local.md)** (`install.sh` / `install.bat`).

```bash
# Debian (tout-en-un)
wget -O install.sh https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.sh
bash install.sh
```

Développeur (déjà cloné) :

```bash
pnpm install
pnpm --filter meshtastic-web dev
```

Build production :

```bash
pnpm --filter meshtastic-web build
# → apps/web/dist/
```

**Contexte sécurisé** obligatoire pour USB/BLE : `https://` ou `http://localhost`.

### Navigateurs et Web Serial (USB)

La connexion USB passe par l’API **Web Serial** (`navigator.serial`). Sans elle, le client affiche *Web Serial not supported* et le handshake ne démarre pas.

| Navigateur | USB (Web Serial) | Notes |
|:-----------|:-----------------|:------|
| **Chrome** / **Edge** (Chromium) | ✅ recommandé | Support stable depuis longtemps — **cible PC crise** |
| **Firefox** ≥ **151** | ✅ possible | API ajoutée en 151 ; permissions un peu différentes de Chrome. En cas de doute, utiliser Chrome/Edge |
| Firefox < 151 | ❌ | Pas d’API série |
| Safari | ❌ | Pas de Web Serial |

**Pièges USB / ESP32 (CH340, ThinkNode M2, XIAO…)** :

- Ouvrir le port série **reboote** souvent le MCU (pulse DTR/RTS) — le client attend ~5 s puis envoie un wake `0x94×4` avant `wantConfigId`.
- Un seul onglet / une seule app sur le COM (pas Chrome + Edge + CLI Meshtastic en même temps).
- Symptôme « Connexion échouée / Chargement… / Noeuds (0) » : handshake incomplet — débrancher/rebrancer, fermer les autres apps série, reconnecter sous Chrome ou Edge.

Web Bluetooth (BLE) : Chromium surtout ; Firefox/Safari limités ou absents selon version.

---

## Déploiement

| Guide | Usage |
|:------|:------|
| [install_local.md](install_local.md) | PC local Windows / Linux (scripts inclus) |
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
| `public/images/germacrise_icon.png` | Icône GerMaCrise (favicons / sidebar / PWA) — orange / mesh |
| `public/site.webmanifest` | PWA : `short_name` = **🔴** |
| `.cursor/rules/gaulix-ecosystem-sync.mdc` | Sync 3 projets |
