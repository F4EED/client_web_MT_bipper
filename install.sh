#!/usr/bin/env bash
# =============================================================================
# GerMaCrise — installation simple (Debian / Ubuntu)
#
#   wget -O install.sh https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.sh
#   bash install.sh
#
# Puis Chromium s'ouvre avec Bluetooth sur http://localhost:5173
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
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates gnupg wget bluez >/dev/null

is_snap_bin() {
  local bin="$1"
  local resolved
  resolved="$(readlink -f "$bin" 2>/dev/null || echo "$bin")"
  [[ "$bin" == /snap/* || "$resolved" == /snap/* ]]
}

browser_bluetooth_ok() {
  local name bin
  for name in google-chrome-stable google-chrome chromium chromium-browser brave-browser microsoft-edge-stable microsoft-edge; do
    bin="$(command -v "$name" 2>/dev/null || true)"
    if [[ -n "$bin" ]] && ! is_snap_bin "$bin"; then
      return 0
    fi
  done
  return 1
}

ensure_chromium() {
  hash -r 2>/dev/null || true
  if browser_bluetooth_ok; then
    echo "Chromium / Chrome déjà installé (Bluetooth OK)."
    return 0
  fi

  say "Chromium n'est pas installé — installation durant le processus…"

  # 1. Paquet Chromium apt (Debian ; parfois Ubuntu)
  echo "  apt install chromium…"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium || true
  hash -r 2>/dev/null || true

  # 2. Si absent ou Snap (Ubuntu) : Google Chrome .deb
  if ! browser_bluetooth_ok; then
    local arch
    arch="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
    if [[ "$arch" == "amd64" ]]; then
      echo "  Chromium apt indisponible ou Snap — installation de Google Chrome…"
      local deb
      deb="$(mktemp --suffix=.deb)"
      if wget -qO "$deb" "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"; then
        sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "$deb" || {
          sudo dpkg -i "$deb" || true
          sudo DEBIAN_FRONTEND=noninteractive apt-get install -f -y || true
        }
      else
        echo "  Téléchargement de Google Chrome impossible (réseau ?)."
      fi
      rm -f "$deb"
      hash -r 2>/dev/null || true
    fi
  fi

  if browser_bluetooth_ok; then
    echo "  Chromium / Chrome installé."
    return 0
  fi

  echo "Aucun Chrome/Chromium (apt) installé — le Bluetooth du navigateur ne marchera pas."
  echo "  Debian : sudo apt install chromium"
  echo "  Ubuntu : installez Google Chrome (.deb), pas le paquet Snap chromium-browser"
  echo "  Firefox n'a pas Web Bluetooth (USB = onglet Serial uniquement)."
}

# Web Bluetooth : groupe bluetooth (Linux Chromium) + USB série (dialout)
CURRENT_USER="$(id -un)"
if getent group bluetooth >/dev/null 2>&1; then
  sudo usermod -aG bluetooth "${CURRENT_USER}" || true
fi
if getent group dialout >/dev/null 2>&1; then
  sudo usermod -aG dialout "${CURRENT_USER}" || true
fi
if command -v snap >/dev/null 2>&1 && snap list chromium >/dev/null 2>&1; then
  sudo snap connect chromium:bluez >/dev/null 2>&1 || true
  echo "Note : Chromium Snap bride souvent le Bluetooth. Préférez Google Chrome ou Chromium (apt)."
fi

# BlueZ : APIs expérimentales (D-Bus) dont Chromium Web Bluetooth a besoin
if [[ -f /etc/bluetooth/main.conf ]]; then
  if grep -qE '^#?Experimental' /etc/bluetooth/main.conf; then
    sudo sed -i -E 's/^#?Experimental.*/Experimental = true/' /etc/bluetooth/main.conf
  else
    printf '\n[General]\nExperimental = true\n' | sudo tee -a /etc/bluetooth/main.conf >/dev/null
  fi
fi
BT_DAEMON=""
for p in /usr/libexec/bluetooth/bluetoothd /usr/lib/bluetooth/bluetoothd; do
  if [[ -x "$p" ]]; then
    BT_DAEMON="$p"
    break
  fi
done
if [[ -n "${BT_DAEMON}" ]]; then
  sudo mkdir -p /etc/systemd/system/bluetooth.service.d
  sudo tee /etc/systemd/system/bluetooth.service.d/germa-crise-experimental.conf >/dev/null <<UNIT
[Service]
ExecStart=
ExecStart=${BT_DAEMON} --experimental
UNIT
  sudo systemctl daemon-reload >/dev/null 2>&1 || true
  sudo systemctl restart bluetooth >/dev/null 2>&1 || true
fi
bluetoothctl power on >/dev/null 2>&1 || true

ensure_chromium

# Chromium Debian : flags persistants (tous les lancements, pas seulement le nôtre)
if [[ -d /etc/chromium.d ]] || sudo mkdir -p /etc/chromium.d 2>/dev/null; then
  sudo tee /etc/chromium.d/germa-crise-bluetooth >/dev/null <<'FLAGS' || true
# GerMaCrise — expose navigator.bluetooth sous Linux
export CHROMIUM_FLAGS="${CHROMIUM_FLAGS} --enable-blink-features=WebBluetooth --enable-features=WebBluetooth,WebBluetoothNewPermissionsBackend --enable-experimental-web-platform-features"
FLAGS
fi
# Paquet apt chromium (wrapper) lit aussi ce fichier
mkdir -p "${HOME}/.config"
printf '%s\n' \
  '--enable-blink-features=WebBluetooth' \
  '--enable-features=WebBluetooth,WebBluetoothNewPermissionsBackend' \
  '--enable-experimental-web-platform-features' \
  > "${HOME}/.config/chromium-flags.conf"


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

# demarrer.sh (aussi créé/rafraîchi par creer-icone.sh)
cat > "${INSTALL_DIR}/demarrer.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "${INSTALL_DIR}"
echo ""
echo "========================================"
echo "  GerMaCrise — serveur local"
echo "========================================"
echo "  Chromium s'ouvre avec Bluetooth activé :"
echo "    http://localhost:${PORT}"
echo "  Laissez cette fenêtre ouverte."
echo "  Ctrl+C pour arrêter."
echo "========================================"
echo ""
if [[ -f "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" ]]; then
  chmod +x "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" || true
  bash "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" --ensure || true
  (sleep 2 && bash "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" "http://localhost:${PORT}" >>"${INSTALL_DIR}/_lancer-navigateur.log" 2>&1) &
fi
exec pnpm --filter meshtastic-web exec vite -- --host 0.0.0.0 --port ${PORT}
EOF
chmod +x "${INSTALL_DIR}/demarrer.sh"
ln -sfn "${INSTALL_DIR}/demarrer.sh" "${HOME}/demarrer-GerMaCrise.sh"

# Icône Bureau / menu — logique unique dans creer-icone.sh
if [[ -f "${INSTALL_DIR}/creer-icone.sh" ]]; then
  say "Création de l'icône Bureau…"
  bash "${INSTALL_DIR}/creer-icone.sh" || true
else
  echo "Avertissement : creer-icone.sh absent — icône non créée."
fi

echo ""
echo "========================================"
echo "  C'est prêt."
echo ""
echo "  → Chromium s'ouvre avec Bluetooth (profil GerMaCrise)."
echo "       URL : http://localhost:${PORT}"
echo ""
echo "  Bluetooth Linux :"
echo "       • Utilisez l'icône GerMaCrise (ouvre Chromium avec Web Bluetooth)"
echo "       • Firefox n'a PAS Web Bluetooth — pour le BLE, utilisez Chromium"
echo "       • USB (câble) : Firefox ≥ 151 ou Chromium, onglet Serial"
echo "       • PIN usine Gaulix : 123456 — ne pas appairer dans les réglages OS"
echo "       • Si vous venez d'être ajouté au groupe bluetooth : déconnexion / reconnexion"
echo "       • Ouvrez toujours http://localhost:${PORT} (pas l'IP du PC)"
echo "       • Journal du navigateur : ${INSTALL_DIR}/_lancer-navigateur.log"
echo ""
echo "  → Relancer plus tard :"
echo "       • Icône « GerMaCrise » sur le Bureau"
echo "       • ou menu Applications → GerMaCrise"
echo "       • ou : ~/demarrer-GerMaCrise.sh"
echo ""
echo "  Si l'icône Bureau refuse de démarrer :"
echo "       clic droit → Autoriser le lancement"
echo "  Recréer l'icône :"
echo "       bash ${INSTALL_DIR}/creer-icone.sh"
echo ""
echo "  APK Android / AppImage :"
echo "       https://github.com/F4EED/bipper_android/releases"
echo "========================================"
echo ""
echo "Démarrage… (fenêtre à laisser ouverte)"
echo ""

if [[ -f "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" ]]; then
  chmod +x "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" || true
  bash "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" --ensure || true
  (sleep 3 && bash "${INSTALL_DIR}/scripts/lancer-navigateur-bluetooth.sh" "http://localhost:${PORT}" >>"${INSTALL_DIR}/_lancer-navigateur.log" 2>&1) &
fi

exec pnpm --filter meshtastic-web exec vite -- --host 0.0.0.0 --port "${PORT}"
