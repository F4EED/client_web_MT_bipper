#!/usr/bin/env bash
# =============================================================================
# GerMaCrise — installation simple (Debian)
#
#   wget -O install.sh https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.sh
#   bash install.sh
#
# Puis ouvrir Chrome sur http://localhost:5173
# Relancer plus tard :  ~/demarrer-GerMaCrise.sh
# =============================================================================
set -euo pipefail

REPO_URL="https://github.com/F4EED/client_web_MT_bipper.git"
PNPM_VERSION="11.9.0"
PORT="5173"

# Si lancé depuis une copie du dépôt déjà présente, on l'utilise
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(cd "$(dirname "${SCRIPT_PATH}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/package.json" && -f "${SCRIPT_DIR}/pnpm-workspace.yaml" ]]; then
  INSTALL_DIR="${SCRIPT_DIR}"
else
  INSTALL_DIR="${HOME}/GerMaCrise"
fi

echo ""
echo "========================================"
echo "  GerMaCrise — installation"
echo "========================================"
echo "  Dossier : ${INSTALL_DIR}"
echo "  (quelques minutes, mot de passe possible)"
echo "========================================"
echo ""

say() { printf '\n>> %s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

# --- 1. Outils ---
say "1/4 — Préparation de l'ordinateur"
if ! have sudo; then
  echo "Il faut un compte avec sudo. Demandez de l'aide à un administrateur."
  exit 1
fi
sudo apt-get update -y >/dev/null
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates gnupg wget >/dev/null

if ! have node || [[ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 22 ]]; then
  say "Installation du moteur (Node.js)…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi

# --- 2. pnpm (sans corepack) ---
say "2/4 — Outils GerMaCrise"
if ! have pnpm || ! pnpm -v >/dev/null 2>&1; then
  sudo npm install -g "pnpm@${PNPM_VERSION}"
  hash -r 2>/dev/null || true
fi
if ! have pnpm || ! pnpm -v >/dev/null 2>&1; then
  echo "Échec. Vérifiez Internet et réessayez : bash install.sh"
  exit 1
fi

# --- 3. Code ---
say "3/4 — Téléchargement"
if [[ -f "${INSTALL_DIR}/package.json" && -f "${INSTALL_DIR}/pnpm-workspace.yaml" ]]; then
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    git -C "${INSTALL_DIR}" pull --ff-only || true
  fi
else
  if [[ -e "${INSTALL_DIR}" ]]; then
    echo "Le dossier ${INSTALL_DIR} existe déjà. Renommez-le puis relancez."
    exit 1
  fi
  git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

# --- 4. Install + lanceurs (script + icône Bureau) ---
say "4/4 — Installation des composants (patientez)…"
cd "${INSTALL_DIR}"
pnpm install

ICON_PNG="${INSTALL_DIR}/apps/web/public/images/germacrise_icon.png"
DESKTOP_DIR="${HOME}/Bureau"
[[ -d "${DESKTOP_DIR}" ]] || DESKTOP_DIR="${HOME}/Desktop"
APPS_DIR="${HOME}/.local/share/applications"
mkdir -p "${APPS_DIR}"
[[ -d "${DESKTOP_DIR}" ]] || mkdir -p "${DESKTOP_DIR}"

# Script de démarrage (terminal)
cat > "${INSTALL_DIR}/demarrer.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "${INSTALL_DIR}"
echo ""
echo "========================================"
echo "  GerMaCrise — serveur local"
echo "========================================"
echo "  Ouvrez Chrome / Chromium :"
echo "    http://localhost:${PORT}"
echo "  Laissez cette fenêtre ouverte."
echo "  Ctrl+C pour arrêter."
echo "========================================"
echo ""
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 3 && xdg-open "http://localhost:${PORT}" >/dev/null 2>&1) &
fi
exec pnpm --filter meshtastic-web exec vite -- --host 0.0.0.0 --port ${PORT}
EOF
chmod +x "${INSTALL_DIR}/demarrer.sh"
ln -sfn "${INSTALL_DIR}/demarrer.sh" "${HOME}/demarrer-GerMaCrise.sh"

# Fichier .desktop (icône cliquable)
DESKTOP_FILE="${INSTALL_DIR}/GerMaCrise.desktop"
cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=GerMaCrise
Comment=Démarrer le serveur web GerMaCrise
Exec=${INSTALL_DIR}/demarrer.sh
Path=${INSTALL_DIR}
Icon=${ICON_PNG}
Terminal=true
Categories=Network;Utility;
StartupNotify=true
EOF
chmod +x "${DESKTOP_FILE}"

# Copie Bureau + menu Applications
cp -f "${DESKTOP_FILE}" "${DESKTOP_DIR}/GerMaCrise.desktop"
chmod +x "${DESKTOP_DIR}/GerMaCrise.desktop"
cp -f "${DESKTOP_FILE}" "${APPS_DIR}/germa-crise.desktop"
chmod +x "${APPS_DIR}/germa-crise.desktop"

# GNOME / Cinnamon : autoriser le lancement depuis le Bureau
if have gio; then
  gio set "${DESKTOP_DIR}/GerMaCrise.desktop" metadata::trusted true 2>/dev/null || true
fi
if have update-desktop-database; then
  update-desktop-database "${APPS_DIR}" 2>/dev/null || true
fi

# Script pour recréer l'icône plus tard
cat > "${INSTALL_DIR}/creer-icone.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
INSTALL_DIR="${INSTALL_DIR}"
ICON_PNG="${ICON_PNG}"
DESKTOP_DIR="${HOME}/Bureau"
[[ -d "\${DESKTOP_DIR}" ]] || DESKTOP_DIR="${HOME}/Desktop"
APPS_DIR="${HOME}/.local/share/applications"
mkdir -p "\${APPS_DIR}" "\${DESKTOP_DIR}"
cp -f "\${INSTALL_DIR}/GerMaCrise.desktop" "\${DESKTOP_DIR}/GerMaCrise.desktop"
cp -f "\${INSTALL_DIR}/GerMaCrise.desktop" "\${APPS_DIR}/germa-crise.desktop"
chmod +x "\${DESKTOP_DIR}/GerMaCrise.desktop" "\${APPS_DIR}/germa-crise.desktop"
command -v gio >/dev/null && gio set "\${DESKTOP_DIR}/GerMaCrise.desktop" metadata::trusted true 2>/dev/null || true
echo "Icône créée sur le Bureau : \${DESKTOP_DIR}/GerMaCrise.desktop"
echo "Si le double-clic est bloqué : clic droit → Autoriser le lancement."
EOF
chmod +x "${INSTALL_DIR}/creer-icone.sh"

echo ""
echo "========================================"
echo "  C'est prêt."
echo ""
echo "  → Ouvrez Chrome / Chromium :"
echo "       http://localhost:${PORT}"
echo ""
echo "  → Relancer plus tard :"
echo "       • Icône « GerMaCrise » sur le Bureau"
echo "       • ou menu Applications → GerMaCrise"
echo "       • ou : ~/demarrer-GerMaCrise.sh"
echo ""
echo "  Si l'icône Bureau refuse de démarrer :"
echo "       clic droit → Autoriser le lancement"
echo "  (ou : ${INSTALL_DIR}/creer-icone.sh )"
echo "========================================"
echo ""
echo "Démarrage… (fenêtre à laisser ouverte)"
echo ""

if have xdg-open; then
  (sleep 4 && xdg-open "http://localhost:${PORT}" >/dev/null 2>&1) &
fi

exec pnpm --filter meshtastic-web exec vite -- --host 0.0.0.0 --port "${PORT}"
