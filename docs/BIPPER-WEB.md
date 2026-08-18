# Client web Gaulix Bipper

| | |
|:--|:--|
| **Dépôt** | [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper) |
| **Base** | Fork [meshtastic/web](https://github.com/meshtastic/web) |
| **Firmware cible** | Gaulix Bipper **v1.12.5+** (pagers L1/M1/M2 · PC crise XIAO S3+SX1262 · PC crise ThinkNode M2) |
| **Chemin local** | `C:\client web mesthastic_bipper` |
| **Install** | [install_local.md](install_local.md) — **Debian / Ubuntu** : `install.sh` · **Windows 10 / 11** : `install.ps1` (ou `install.bat`) · raccourci : `install.ps1 -Icone` · [INSTALL-SRV-WEB.md](INSTALL-SRV-WEB.md) · [INSTALL-DOCKER.md](INSTALL-DOCKER.md) |
| **Écosystème** | Firmware + Android — voir firmware [`docs/ECOSYSTEME-GAULIX.md`](https://github.com/F4EED/Bipper_L1Pro/blob/develop/docs/ECOSYSTEME-GAULIX.md) · install APK Android : [`BIPPER-ANDROID.md`](https://github.com/F4EED/bipper_android/blob/main/docs/BIPPER-ANDROID.md#installation-sur-téléphone) |

> **Règle** : ce client évolue **en même temps** que le firmware et l’app Android (protocole, tags, docs).

---

## Rôle

SPA Vite/React pour **connecter** un nœud Meshtastic (USB Serial / Web Bluetooth) et :

1. **Gérer les alertes** Gaulix (composer `#alerte` / `#secours` / `#vigilance` / `#info` / `#fin`, suivi local, ACK lecture) ;
   - côté **Android** : Morse **SOS SOS** anxiogène + sirène US/SAMU + vibreur + overlay rouge + ACK « J'ai pris connaissance » (`#ack` / DM émetteur) — voir `BIPPER-ANDROID.md` ;
2. **Paramétrer un Bipper** (tags T1–T10, code, `#status`, `#ack`, bips) ;
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

## Protocole (partagé Android / firmware) — v1.12.5

Implémentation cible : `apps/web/src/lib/bipper/alertCommands.ts` (+ `serviceTags.ts`, `pagerStatus.ts`, `parsePagerAck.ts`).

```text
#alerte|#secours|#vigilance|#info [N] <texte> [#entité…]
#fin [N] [#entité]
Pager ACK alerte [#N] JJ/MM HH:MM[ — text][ | latN/S lonE/W]
#ack
```

ACK lecture bipper (firmware **≥ v1.12.5**) :

- Bouton bip **ou** commande locale `#ack` (client téléphone) → `acknowledgeAlert()` : broadcast canal **Alerte** + DM émetteur + GPS Fr_Balise.
- Filaire reçu / affiché dans l’onglet ACK :

```text
Pager ACK alerte [#N] JJ/MM HH:MM[ — text][ | latN/S lonE/W]
```

Côté **Android** (réception alerte) : Morse **SOS SOS** anxiogène + sirène américaine type SAMU (wail/yelp) + vibreur ; bouton « J'ai pris connaissance » → `#ack` local sur bipper connecté (même procédure que l’appui bouton) sinon `Pager ACK` broadcast Alerte + DM émetteur.

Exemples :

```text
#alerte 42 incendie hall #SDIS42 #test
#fin 42
#tagset T1=SDIS42,T2=test,T10=UDIOM42
#ack
Pager ACK alerte #42 31/07 10:30 — incendie hall | 45.12345N 4.56789E
```

| Règle | Détail |
|:------|:-------|
| `N` | Numéro d’alerte optionnel |
| Multi `#entité` | OU — le bip réagit s’il appartient à au moins une |
| Sans `#entité` | Tous les bippers |
| `#fin N` | Clôture l’alerte N uniquement |
| Appartenance locale | Slots **T1–T10** |
| `#ack` | DM local → bip : simule bouton (firmware ≥ v1.12.5) |
| ACK | Corrélé au nº `#N` si présent, sinon alerte ouverte récente + extrait texte |

Source de vérité détaillée : firmware `docs/ECOSYSTEME-GAULIX.md`.

> **État code web** : aligné protocole **v1.12** (nº d’alerte, multi-entités, T1–T10, `#tagset`, `#fin N`, parsing ACK) — pas d’alarme RX téléphone (rôle coordinateur). Android / firmware : **v1.12.5** (`#ack`, Morse SOS).
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

Installation utilisateur : **[install_local.md](install_local.md)** — un script par OS : `install.sh` (Debian / Ubuntu), `install.ps1` (Windows 10 / 11, aussi `install.bat`). Raccourci Bureau Windows : `install.ps1 -Icone`.

```bash
# Debian / Ubuntu (tout-en-un)
wget -O install.sh https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.sh
bash install.sh
```

```powershell
# Windows 10 / 11 (tout-en-un)
irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex
```

Si sous Windows l’icône Bureau échoue avec `No module named 'meshtastic'` : recreer le lanceur (`install.ps1 -Icone`) — détail dans [install_local.md](install_local.md).

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

- Ouvrir le port série **reboote** souvent le MCU (pulse DTR/RTS Windows). L’ouverture suit le client Meshtastic officiel (`port.open` + retries) — pas de manip DTR/RTS ni wake `0x94×4` avant le handshake (ça cassait la config sur plusieurs cartes).
- Un seul onglet / une seule app sur le COM (pas Chrome + Edge + CLI Meshtastic en même temps).
- Symptôme « Connexion échouée / Chargement… / Noeuds (0) » : handshake incomplet — débrancher/rebrancer, fermer les autres apps série, reconnecter sous Chrome ou Edge sur `http://localhost:5173` (pas une IP LAN).
- Après config OK : `set_time_only` force l’horloge radio sur l’heure du PC (retries 0 / 2 / 8 s). Firmware Gaulix applique avec `forceUpdate` (ignore le throttle NTP/GPS).

Web Bluetooth (BLE) : **Firefox n’a pas cette API** (aucun OS). En USB, onglet **Serial** (Firefox ≥ 151). Safari : non.

| Navigateur / OS | BLE (Web Bluetooth) | Notes |
|:----------------|:--------------------|:------|
| **Chrome / Edge sous Windows** | ✅ natif | Aucun flag. Ouvrir `http://localhost:5173` (pas l’IP du PC). PIN **123456**. Ne pas appairer dans Paramètres Windows → Bluetooth avant le navigateur. |
| **Chrome / Chromium (apt) sous Linux** via icône GerMaCrise | ✅ | Le lanceur passe `--enable-blink-features=WebBluetooth` et un profil `~/.config/germa-crise-chromium`. Fermer **toutes** les fenêtres Chromium/Chrome avant, sinon le flag est ignoré. Pas le Snap. BlueZ + groupe `bluetooth`. |
| **Chromium / Chrome Linux ouverts à la main** | ❌ tant que le flag n’est pas là | `navigator.bluetooth` reste absent → *Web Bluetooth non pris en charge*. Relancer GerMaCrise, ou `bash scripts/lancer-navigateur-bluetooth.sh`. |
| **Firefox** (Windows et Linux) | ❌ BLE | Pas d’API native. USB : onglet **Serial** (Firefox ≥ 151). HTTP si le nœud a le Wi‑Fi. |
| Safari | ❌ | Pas de Web Bluetooth |

Sous **Linux**, BlueZ n’expose souvent pas l’UUID GATT Meshtastic dans les publicités BLE : le sélecteur filtré est **vide**. Le client bascule alors sur `acceptAllDevices` (tous les appareils BLE proches) + `optionalServices`. Ne **pas** appairer le nœud dans les réglages Bluetooth GNOME/KDE (ni Windows) avant le navigateur.

Ouvrez **`http://localhost:5173`** (pas l’IP LAN, pas `http://0.0.0.0`) : hors localhost/HTTPS, le navigateur masque aussi Web Bluetooth.

**Pièges BLE (ThinkNode M1 / L1 / pagers nRF)** :

- PIN usine Gaulix : **`123456`** (FIXED_PIN). Sans appairage navigateur correct → *Device does not advertise the Meshtastic GATT service*.
- Un seul client à la fois (fermer GerMaCrise Android / autre PC avant de connecter le navigateur).
- Contexte sécurisé : `http://localhost` / `127.0.0.1` ou **HTTPS** — pas `http://IP-LAN`.
- **Windows** : Chrome ou Edge (natif). Firefox = *Web Bluetooth non pris en charge*. Ne pas appairer dans Paramètres → Bluetooth avant.
- **Linux** : après `usermod -aG bluetooth`, **déconnexion / reconnexion** de session. Adapter allumé (`bluetoothctl power on`). Relancer GerMaCrise (pas un Chromium déjà ouvert).

### Messages / canaux (historique local)

Les fils **Fr_Balise** (0), **Fr_EMCOM** (1), **Fr_BlaBla** (2), etc. sont isolés par **index de canal** (hash LoRa nom+PSK). Un même paquet ne doit apparaître que dans **un** onglet.

Si le **même** texte (auteur + heure) se répète sur plusieurs canaux alors que GerMaCrise Android (USB) est correct sur le même nœud : bug d’historique local web (OPFS/SQLite) — corrigé (migration schéma messages v3, dédup par `id` paquet). Après `git pull` : **Ctrl+F5** ; en cas de résidu, effacer les données du site pour `localhost`.

Référence Android (pas de rebuild APK pour ce fix) : `BIPPER-ANDROID.md`.

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
4. Firmware Bipper **v1.12.5+**.

---

## Fichiers clés

| Chemin | Rôle |
|:-------|:-----|
| `apps/web/src/pages/BipperSend/` | UI Gestion des alertes (Signalement / Message / Alertes / ACK) |
| `apps/web/src/lib/bipper/reportTypes.ts` | Types POI + emoji / codepoints Unicode (aligné Android) |
| `apps/web/src/core/stores/alertManagerStore/` | Suivi local + `localStorage` |
| `packages/sdk-storage-sqlocal/` | Historique chat OPFS (PK `device_id`+`id`, migration v3) |
| `packages/sdk/src/features/chat/` | Buckets `channel:<n>` + dédup paquet |
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
| `scripts/lancer-navigateur-bluetooth.sh` | Linux : Chromium + Web Bluetooth (profil GerMaCrise) |
| `.cursor/rules/gaulix-ecosystem-sync.mdc` | Sync 3 projets |
