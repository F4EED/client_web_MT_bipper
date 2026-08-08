#!/usr/bin/env bash
# Install local du client web GerMaCrise / Gaulix Bipper
# Cible principale : Debian (et dérivés Ubuntu).
# Sous Windows : utiliser scripts/install-local.ps1 (pas ce fichier).
# Doc : docs/install_local.md
#
# IMPORTANT : fins de ligne LF (pas CRLF). Si erreur « bash\r » :
#   sed -i 's/\r$//' scripts/install-local.sh && chmod +x scripts/install-local.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/F4EED/client_web_MT_bipper.git}"
PNPM_VERSION="11.9.0"
TARGET_DIR=""
SKIP_PKG=0
START_DEV=0
DO_BUILD=0
NO_CLONE=0

usage() {
  cat <<'EOF'
Usage: ./scripts/install-local.sh [options]

Cible : Debian (apt). Sous Windows, utiliser install-local.ps1.

Exemples (Debian) :
  ./scripts/install-local.sh --start-dev
  ./scripts/install-local.sh --build

Options:
  --dir DIR       Dossier projet (défaut: clone dans ~/client_web_MT_bipper
                  ou racine du dépôt si le script est déjà dedans)
  --skip-apt      Ne pas installer git/nodejs via apt
  --start-dev     Lancer le serveur Vite après install
  --build         Build production (apps/web/dist)
  --no-clone      Échouer si le dossier n'est pas déjà le monorepo
  -h, --help      Aide
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) TARGET_DIR="$2"; shift 2 ;;
    --skip-apt) SKIP_PKG=1; shift ;;
    --start-dev) START_DEV=1; shift ;;
    --build) DO_BUILD=1; shift ;;
    --no-clone) NO_CLONE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Option inconnue: $1" >&2; usage; exit 1 ;;
  esac
done

step() { printf '\n==> %s\n' "$*"; }

have_cmd() { command -v "$1" >/dev/null 2>&1; }

install_packages() {
  if [[ "$SKIP_PKG" -eq 1 ]]; then
    echo "skip-apt : installation manuelle de git / nodejs si besoin"
    return 0
  fi

  local need_git=0 need_node=0
  have_cmd git || need_git=1
  if ! have_cmd node; then
    need_node=1
  else
    local major
    major="$(node -v | sed 's/^v//' | cut -d. -f1)"
    # Node 20 + corepack + pnpm 11 → ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING
    # On installe Node 22 LTS pour les installs neuves / trop anciennes.
    if [[ "$major" -lt 22 ]]; then
      need_node=1
    fi
  fi

  if [[ "$need_git" -eq 0 && "$need_node" -eq 0 ]]; then
    return 0
  fi

  step "Installation dépendances système (git, curl, Node.js 22) — Debian/apt"
  if ! have_cmd apt-get; then
    echo "apt-get introuvable. Ce script cible Debian (ou Ubuntu)." >&2
    echo "Installez Git + Node.js 22+ manuellement, puis relancez avec --skip-apt." >&2
    return 0
  fi
  if ! have_cmd sudo; then
    echo "sudo est requis pour apt-get (ou lancez en root)." >&2
    exit 1
  fi
  sudo apt-get update -y
  sudo apt-get install -y git curl ca-certificates gnupg
  if [[ "$need_node" -eq 1 ]]; then
    # NodeSource 22.x (évite le bug corepack/pnpm 11 sous Node 20)
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_from_script="$(cd "${script_dir}/.." && pwd)"

resolve_repo_root() {
  if [[ -n "$TARGET_DIR" ]]; then
    # Chemin absolu sans créer le dossier (le clone s'en charge)
    if [[ "$TARGET_DIR" = /* ]]; then
      echo "$TARGET_DIR"
    else
      echo "$(pwd)/$TARGET_DIR"
    fi
    return
  fi
  if [[ -f "${repo_from_script}/package.json" && -f "${repo_from_script}/pnpm-workspace.yaml" ]]; then
    echo "$repo_from_script"
    return
  fi
  echo "${HOME}/client_web_MT_bipper"
}

echo "GerMaCrise / Gaulix Bipper — installation locale (Debian)"
echo "Doc : docs/install_local.md"

install_packages

if ! have_cmd git; then
  echo "Git est requis." >&2
  exit 1
fi
if ! have_cmd node; then
  echo "Node.js 22+ est requis (https://nodejs.org/)." >&2
  exit 1
fi

node_major="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [[ "$node_major" -lt 20 ]]; then
  echo "Node $(node -v) détecté — trop ancien (minimum 20, recommandé 22)." >&2
  exit 1
fi
if [[ "$node_major" -eq 20 ]]; then
  echo "Avertissement : Node 20 + corepack/pnpm 11 peut échouer (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING)." >&2
  echo "Le script installera pnpm via npm (sans corepack). Préférez Node 22 si possible." >&2
fi

echo "Node : $(node -v) | npm : $(npm -v) | Git : $(git --version)"

REPO_ROOT="$(resolve_repo_root)"
step "Répertoire projet : ${REPO_ROOT}"

if [[ ! -f "${REPO_ROOT}/package.json" || ! -f "${REPO_ROOT}/pnpm-workspace.yaml" ]]; then
  if [[ "$NO_CLONE" -eq 1 ]]; then
    echo "Pas de monorepo dans ${REPO_ROOT}." >&2
    exit 1
  fi
  if [[ -d "$REPO_ROOT/.git" ]]; then
    echo "Dépôt git présent mais monorepo incomplet : ${REPO_ROOT}" >&2
    exit 1
  fi
  if [[ -e "$REPO_ROOT" ]]; then
    if [[ -n "$(ls -A "$REPO_ROOT" 2>/dev/null || true)" ]]; then
      echo "Le chemin existe déjà et n'est pas vide : ${REPO_ROOT}" >&2
      exit 1
    fi
    rmdir "$REPO_ROOT"
  fi
  step "Clone ${REPO_URL}"
  mkdir -p "$(dirname "$REPO_ROOT")"
  git clone "$REPO_URL" "$REPO_ROOT"
fi

cd "$REPO_ROOT"

# corepack + pnpm 11 sous Node 20 → ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING
# On installe pnpm avec npm -g (ou npx), sans passer par corepack.
step "Activation pnpm@${PNPM_VERSION} (sans corepack)"
PNPM=(pnpm)
pnpm_ok=0
if have_cmd pnpm && pnpm -v >/dev/null 2>&1; then
  echo "pnpm déjà disponible : $(pnpm -v)"
  pnpm_ok=1
fi
if [[ "$pnpm_ok" -eq 0 ]]; then
  echo "Installation de pnpm@${PNPM_VERSION} via npm -g …"
  if have_cmd sudo; then
    sudo npm install -g "pnpm@${PNPM_VERSION}" || npm install -g "pnpm@${PNPM_VERSION}" || true
  else
    npm install -g "pnpm@${PNPM_VERSION}" || true
  fi
  hash -r 2>/dev/null || true
  if have_cmd pnpm && pnpm -v >/dev/null 2>&1; then
    echo "pnpm via npm -g : $(pnpm -v)"
    pnpm_ok=1
  fi
fi
if [[ "$pnpm_ok" -eq 0 ]]; then
  echo "Repli : npx pnpm@${PNPM_VERSION}"
  PNPM=(npx --yes "pnpm@${PNPM_VERSION}")
fi

step "pnpm install (peut prendre plusieurs minutes)"
"${PNPM[@]}" install

if [[ "$DO_BUILD" -eq 1 ]]; then
  step "Build production (meshtastic-web → apps/web/dist)"
  "${PNPM[@]}" --filter meshtastic-web build
  echo "Build OK : ${REPO_ROOT}/apps/web/dist"
fi

echo ""
echo "Installation terminée."
echo "Lancer le client :"
echo "  cd \"${REPO_ROOT}\""
echo "  ${PNPM[*]} --filter meshtastic-web dev"
echo "Puis ouvrir Chrome/Edge sur l'URL affichée (souvent http://localhost:5173)."
echo "Doc : docs/install_local.md"

if [[ "$START_DEV" -eq 1 ]]; then
  step "Démarrage serveur de développement"
  "${PNPM[@]}" --filter meshtastic-web dev
fi
