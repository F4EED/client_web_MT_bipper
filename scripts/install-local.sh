#!/usr/bin/env bash
# Install local du client web GerMaCrise / Gaulix Bipper (Linux / macOS / WSL / Git Bash).
# Sous Windows natif, préfère : scripts/install-local.ps1
# Doc : docs/install_local.md
#
# IMPORTANT : ce fichier doit être en fins de ligne LF (pas CRLF).
# Si erreur « bash\r » ou « $'\r': command not found » :
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

Options:
  --dir DIR       Dossier projet (défaut: clone dans ~/client_web_MT_bipper
                  ou racine du dépôt si le script est déjà dedans)
  --skip-apt      Ne pas installer git/nodejs via apt/dnf/pacman
  --start-dev     Lancer pnpm --filter meshtastic-web dev après install
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
  if have_cmd git && have_cmd node; then
    local major
    major="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [[ "$major" -ge 20 ]]; then
      return 0
    fi
  fi

  step "Installation dépendances système (git, nodejs)"
  if have_cmd apt-get; then
    sudo apt-get update -y
    sudo apt-get install -y git curl ca-certificates
    if ! have_cmd node || [[ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 20 ]]; then
      if [[ -f /etc/os-release ]]; then
        # Node 20 via NodeSource quand le paquet distro est trop vieux
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
      fi
    fi
  elif have_cmd dnf; then
    sudo dnf install -y git nodejs
  elif have_cmd pacman; then
    sudo pacman -Sy --noconfirm git nodejs npm
  elif have_cmd brew; then
    brew install git node@20 || brew install git node
  else
    # Git Bash / environnement sans apt : on s'appuie sur Git/Node déjà dans le PATH Windows
    echo "Pas d'apt/dnf/pacman (OK sous Git Bash / macOS sans Homebrew)."
    echo "Assurez-vous que Git et Node.js 20+ sont installés et dans le PATH."
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

echo "GerMaCrise / Gaulix Bipper — installation locale"
echo "Doc : docs/install_local.md"

install_packages

if ! have_cmd git; then
  echo "Git est requis." >&2
  exit 1
fi
if ! have_cmd node; then
  echo "Node.js 20+ est requis (https://nodejs.org/)." >&2
  exit 1
fi

node_major="$(node -v | sed 's/^v//' | cut -d. -f1)"
if [[ "$node_major" -lt 20 ]]; then
  echo "Node $(node -v) détecté — version 20+ recommandée." >&2
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

step "Activation pnpm@${PNPM_VERSION}"
PNPM=(pnpm)
if have_cmd pnpm; then
  echo "pnpm déjà disponible : $(pnpm -v)"
elif have_cmd corepack; then
  # Sous Windows, corepack enable peut échouer (EPERM sur Program Files) → repli npx
  if corepack enable >/dev/null 2>&1 && corepack prepare "pnpm@${PNPM_VERSION}" --activate >/dev/null 2>&1 && have_cmd pnpm; then
    echo "pnpm via corepack : $(pnpm -v)"
  else
    echo "corepack indisponible (souvent EPERM sous Windows) — repli npx pnpm@${PNPM_VERSION}"
    PNPM=(npx "pnpm@${PNPM_VERSION}")
  fi
else
  echo "pnpm absent — utilisation de npx pnpm@${PNPM_VERSION}"
  PNPM=(npx "pnpm@${PNPM_VERSION}")
fi
if ! have_cmd pnpm && [[ "${PNPM[0]}" == "pnpm" ]]; then
  PNPM=(npx "pnpm@${PNPM_VERSION}")
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
