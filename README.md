# Meshtastic Web Monorepo — fork **Gaulix Bipper**

> **Fork Gaulix** : [F4EED/client_web_MT_bipper](https://github.com/F4EED/client_web_MT_bipper)  
> Doc produit : **[docs/BIPPER-WEB.md](docs/BIPPER-WEB.md)** · Install local : [install_local.md](docs/install_local.md) · Serveur : [INSTALL-SRV-WEB](docs/INSTALL-SRV-WEB.md) · Docker : [INSTALL-DOCKER](docs/INSTALL-DOCKER.md)  
> Firmware cible : **v1.12+** — [F4EED/Bipper_L1Pro](https://github.com/F4EED/Bipper_L1Pro)  
> Matériels : pagers L1 / M1 / M2 · PC crise XIAO S3+SX1262 (`seeed-xiao-s3-gaulix`) · PC crise ThinkNode M2 (`thinknode_m2-gaulix`, OLED)  


> App Android : [F4EED/bipper_android](https://github.com/F4EED/bipper_android)

Pages ajoutées : `/alerts` (envoi alerte), `/settings/bipper` (paramétrage pager).

## Installation (PC crise)

Sans Cursor, sans Docker. Guide pas à pas : **[docs/install_local.md](docs/install_local.md)**.  
Serveur Nginx/Apache ou image Docker : [INSTALL-SRV-WEB.md](docs/INSTALL-SRV-WEB.md) · [INSTALL-DOCKER.md](docs/INSTALL-DOCKER.md).

Après install : **http://localhost:5173** — laisser la fenêtre du serveur ouverte (`Ctrl+C` pour arrêter).

### Scripts

| Fichier | OS | Rôle |
|:--------|:---|:-----|
| [`install.sh`](install.sh) | **Debian**, **Ubuntu** (et dérivés apt) | Install recommandée : Git, Node, BlueZ, clone, lanceur Bureau |
| [`install.ps1`](install.ps1) | **Windows 10 / 11** | **Seul script** : install (`irm … \| iex` ou `install.bat`) et raccourci (`-Icone`) |
| [`install.bat`](install.bat) | **Windows 10 / 11** | Double-clic : appelle `install.ps1` |
| [`creer-icone.sh`](creer-icone.sh) | Debian / Ubuntu | Recréer l’icône Bureau + entrée menu **GerMaCrise** |
| [`scripts/lancer-navigateur-bluetooth.sh`](scripts/lancer-navigateur-bluetooth.sh) | Debian / Ubuntu | Ouvre Chromium avec Web Bluetooth (profil GerMaCrise) |
| `~/demarrer-GerMaCrise.sh` | Debian / Ubuntu | Relancer le serveur (créé par l’install) |
| `%USERPROFILE%\demarrer-GerMaCrise.bat` | Windows 10 / 11 | Relancer le serveur (créé par `install.ps1`) |
| [`scripts/install-local.sh`](scripts/install-local.sh) | Linux | Ancien nom → `install.sh` |
| [`scripts/install-simple.ps1`](scripts/install-simple.ps1) · [`scripts/install-local.ps1`](scripts/install-local.ps1) / [`install-local.bat`](scripts/install-local.bat) | Windows | Anciens noms → `install.ps1` |
| [`creer-icone.ps1`](creer-icone.ps1) | Windows | Ancien nom → `install.ps1 -Icone` |

### Debian / Ubuntu

```bash
wget -O install.sh https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.sh
bash install.sh
```

Depuis un clone du dépôt : `bash install.sh` (ou `bash scripts/install-local.sh`).

Puis l’icône **GerMaCrise** ouvre **Chromium** (Bluetooth) sur **http://localhost:5173**.  
Relancer : icône **GerMaCrise** sur le Bureau, menu Applications, ou `~/demarrer-GerMaCrise.sh`.

Recréer l’icône / le menu :

```bash
cd ~/GerMaCrise && git pull && bash creer-icone.sh
```

**Bluetooth Linux** : le script installe BlueZ (experimental), ajoute l’utilisateur aux groupes `bluetooth` et `dialout`, et ouvre **Chromium/Chrome avec Web Bluetooth** (profil GerMaCrise). **Déconnexion / reconnexion** ensuite. Firefox n’a pas Web Bluetooth (USB = onglet Serial). PIN Gaulix **123456**. Ne pas appairer le nœud dans les réglages Bluetooth du bureau. URL : **http://localhost:5173** (pas l’IP du PC).

### Windows 10 / 11

**Recommandé** — Terminal (PowerShell) :

```powershell
irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex
```

**Variante double-clic** : ZIP GitHub → `install.bat`.

Puis **Chrome** ou **Edge** → **http://localhost:5173** (Firefox : USB seulement, pas de BLE).  
Relancer : **GerMaCrise.lnk** ou **GerMaCrise.bat** sur le Bureau, ou `%USERPROFILE%\demarrer-GerMaCrise.bat`.

Recréer le raccourci :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\GerMaCrise\install.ps1" -Icone
```

**Bluetooth Windows** : Chrome / Edge **natif** (aucun flag). Firefox n’a pas Web Bluetooth (USB = onglet Serial). PIN **123456**. Ne pas appairer dans Paramètres → Bluetooth avant le navigateur. URL : **http://localhost:5173** (pas l’IP du PC).

Si l’icône affiche `No module named 'meshtastic'` : un `meshtastic.exe` Python pollue le PATH — ce n’est **pas** le client web. Recréer le lanceur (`install.ps1 -Icone`) ou voir [install_local.md](docs/install_local.md) § Erreur Python.

---

# Meshtastic Web Monorepo (upstream base)

[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/web/ci.yml?branch=main&label=Web%20CI&logo=github&color=yellow)](https://github.com/meshtastic/web/actions/workflows/ci.yml)
[![CI](https://img.shields.io/github/actions/workflow/status/meshtastic/js/ci.yml?branch=master&label=JS%20CI&logo=github&color=yellow)](https://github.com/meshtastic/js/actions/workflows/ci.yml)
[![CLA assistant](https://cla-assistant.io/readme/badge/meshtastic/web)](https://cla-assistant.io/meshtastic/web)
[![Fiscal Contributors](https://opencollective.com/meshtastic/tiers/badge.svg?label=Fiscal%20Contributors&color=deeppink)](https://opencollective.com/meshtastic/)
[![Vercel](https://img.shields.io/static/v1?label=Powered%20by&message=Vercel&style=flat&logo=vercel&color=000000)](https://vercel.com?utm_source=meshtastic&utm_campaign=oss)

## Overview

This monorepo consolidates the official [Meshtastic](https://meshtastic.org) web
interface, the domain-driven JavaScript SDK that drives it, and a set of
runtime-specific transport packages. Everything you need to read state from or
send commands to a Meshtastic device lives here.

> [!NOTE]
> You can find the main Meshtastic documentation at https://meshtastic.org/docs/introduction/.

## Packages

All projects live under `packages/`.

| Package | Purpose |
| --- | --- |
| `packages/sdk` | Framework-agnostic TypeScript SDK. Domain-driven feature slices (device, chat, nodes, channels, config, telemetry, position, traceroute, files) built around a `MeshClient` orchestrator with `@preact/signals-core` reactive state. |
| `packages/sdk-react` | React hooks + `MeshProvider` on top of `@meshtastic/sdk`. Wraps signals in `useSyncExternalStore` for concurrent-safe renders. |
| `apps/web` | Reference React web client. Hosted at [client.meshtastic.org](https://client.meshtastic.org). |
| `packages/ui` | Shared Radix + Tailwind component library. |
| `packages/protobufs` | Generated TypeScript stubs from [`meshtastic/protobufs`](https://github.com/meshtastic/protobufs), produced via `buf generate`. Source of truth for every wire-level type. |
| `packages/transport-http` | HTTP transport for devices exposing a network interface. |
| `packages/transport-web-bluetooth` | Web Bluetooth transport for BLE-capable devices (browsers). |
| `packages/transport-web-serial` | Web Serial transport for USB-serial devices (browsers). |
| `packages/transport-node` | TCP transport for Node.js. |
| `packages/transport-node-serial` | Serial transport for Node.js. |
| `packages/transport-deno` | TCP transport for Deno. |
| `packages/transport-mock` | In-memory transport for tests. |

All publishable packages ship to both [JSR](https://jsr.io/@meshtastic) and [NPM](https://www.npmjs.com/org/meshtastic).

## Architecture

`@meshtastic/sdk` organises its source by feature slice. Each slice follows the
same DDD layout:

```
features/<slice>/
  domain/          # entities & value objects — pure TypeScript types
  application/     # use-cases (SendTextUseCase, FavoriteNodeUseCase, …)
  infrastructure/  # protobuf ↔ domain mappers, admin-message adapters
  state/           # signals-backed reactive stores
  <Slice>Client.ts # public facade exposing readable signals + command methods
  index.ts
```

The shared kernel under `packages/sdk/src/core/` owns:

- **`client/`** — `MeshClient`, the thin orchestrator that owns the transport, queue, event bus, and one instance of every slice client.
- **`transport/`** — the `Transport` interface every `transport-*` package implements.
- **`event-bus/`** — typed pub/sub channels populated by the packet codec.
- **`packet-codec/`** — frame parser (0x94 0xC3), `FromRadio` decoder, portnum router.
- **`queue/`**, **`xmodem/`** — packet ack/timeout pipeline and file-transfer protocol.
- **`signals/`** — signal and keyed-collection helpers consumed by every slice.
- **`logging/`** — `tslog` factory used consistently by every class.
- **`identifiers/`**, **`errors/`** — small primitives shared across slices.

The protobuf boundary is strict: wire messages enter through the packet codec,
get mapped into domain entities inside `features/*/infrastructure/*Mapper.ts`,
and signals only ever expose the domain shape.

```
 Transport   ─▶   Packet codec   ─▶   EventBus   ─▶   Slice infrastructure
                                                            │
                                                            ▼
                                                    Signals (state)  ─▶  sdk-react hooks  ─▶  UI
                                                            ▲
                                                            │
 Slice application (use-cases)  ─▶   MeshClient.sendPacket  ─▶   Queue   ─▶   Transport
```

Expected domain errors are returned as `Result<T, E>` via [`better-result`](https://www.npmjs.com/package/better-result); exceptions are reserved for programmer errors and truly exceptional conditions.

## Getting Started

### Prerequisites

You need [pnpm](https://pnpm.io/) installed. If you plan to regenerate
protobufs, also install the [Buf CLI](https://buf.build/docs/cli/installation/).

### Setup

```bash
git clone https://github.com/meshtastic/web.git
cd web
pnpm install
```

### Run the web client

```bash
pnpm --filter @meshtastic/web dev
```

### Build everything

```bash
pnpm -r build
```

### Run tests

```bash
pnpm -r test
```

### Lint + format

```bash
pnpm check
pnpm check:fix
```

## Developing

### Adding a new feature slice to `@meshtastic/sdk`

1. Create `packages/sdk/src/features/<slice>/` with `domain/`, `application/`, `infrastructure/`, `state/` subdirectories plus an `index.ts` barrel.
2. Implement a signals-backed store in `state/`.
3. Subscribe to the relevant `EventBus` channel(s) inside a `<Slice>Client.ts` class and write mapped domain entities to the store.
4. Wire the new client into `MeshClient` and re-export types from `packages/sdk/mod.ts`.
5. Add vitest coverage: domain invariants, use-cases against `createFakeTransport()`, and round-trip mapper fixtures.
6. If the slice has React callers, add a matching hook under `packages/sdk-react/src/hooks/`.

### Adding a new transport

Implement the `Transport` interface exported from `@meshtastic/sdk/transport`:

```ts
interface Transport {
  toDevice: WritableStream<Uint8Array>;
  fromDevice: ReadableStream<DeviceOutput>;
  disconnect(): Promise<void>;
}
```

The SDK does the framing and decoding — transports only supply raw bytes.

### Testing

Vitest is wired at the repo root and picks up `packages/*` projects. The SDK
ships `@meshtastic/sdk/testing` with `createFakeTransport()` for wiring tests
without real hardware.

## Publishing

Each publishable package has `build:npm` / `publish:npm` / `prepare:jsr` /
`publish:jsr` scripts. See each package's `package.json` for details.

## Repository activity

| Project        | Repobeats                                                                                                             |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Meshtastic Web | ![Alt](https://repobeats.axiom.co/api/embed/e5b062db986cb005d83e81724c00cb2b9cce8e4c.svg "Repobeats analytics image") |

## Feedback

If you encounter any issues, please report them in our
[issues tracker](https://github.com/meshtastic/web/issues). Your feedback helps
improve the stability of future releases.

## Star history

<a href="https://star-history.com/#meshtastic/web&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=meshtastic/web&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=meshtastic/web&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=meshtastic/web&type=Date" width="100%" />
 </picture>
</a>

## Contributors

<a href="https://github.com/meshtastic/web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=meshtastic/web" width="100%"/>
</a>

## License

GPL-3.0-only. See [LICENSE](LICENSE).
