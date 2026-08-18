#!/usr/bin/env bash
# Ouvre GerMaCrise dans Chrome/Chromium avec Web Bluetooth réellement activé.
#
# Sous Linux, Chromium cache navigator.bluetooth tant que le flag Blink n'est
# pas passé au démarrage du processus. Un second onglet dans un Chrome déjà
# ouvert ignore les flags — d'où un profil --user-data-dir dédié.
#
# Ne jamais utiliser xdg-open : ça ouvre Firefox, qui n'a pas Web Bluetooth.
#
# Usage :
#   bash scripts/lancer-navigateur-bluetooth.sh [--ensure] [URL]
#   --ensure  : installe Chromium s'il manque, puis quitte (sans ouvrir l'URL)
set -euo pipefail

ENSURE_ONLY=0
if [[ "${1:-}" == "--ensure" ]]; then
  ENSURE_ONLY=1
  shift
fi

URL="${1:-http://localhost:5173}"
PROFILE="${HOME}/.config/germa-crise-chromium"
BT_FLAGS=(
  --enable-blink-features=WebBluetooth
  --enable-features=WebBluetooth,WebBluetoothNewPermissionsBackend
  --enable-experimental-web-platform-features
  --no-first-run
  --no-default-browser-check
)

is_snap() {
  local bin="$1"
  local resolved
  resolved="$(readlink -f "$bin" 2>/dev/null || echo "$bin")"
  [[ "$bin" == /snap/* || "$resolved" == /snap/* ]]
}

find_chromium() {
  local candidate name
  local names=(
    google-chrome-stable
    google-chrome
    chromium
    chromium-browser
    brave-browser
    microsoft-edge-stable
    microsoft-edge
  )
  for name in "${names[@]}"; do
    candidate="$(command -v "$name" 2>/dev/null || true)"
    if [[ -z "$candidate" ]]; then
      continue
    fi
    if is_snap "$candidate"; then
      echo "Note : ${name} est un Snap (Bluetooth souvent bloqué) — ignoré." >&2
      continue
    fi
    echo "$candidate"
    return 0
  done
  for candidate in \
    /opt/google/chrome/google-chrome \
    /usr/bin/google-chrome-stable \
    /usr/bin/google-chrome \
    /usr/bin/chromium \
    /usr/bin/chromium-browser
  do
    if [[ -x "$candidate" ]] && ! is_snap "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

install_chromium() {
  echo "Chromium n'est pas installé — installation…"
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo introuvable : impossible d'installer Chromium automatiquement." >&2
    return 1
  fi
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "apt-get introuvable : installez Chromium manuellement." >&2
    return 1
  fi

  sudo apt-get update -y || true
  echo "  apt install chromium…"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y chromium || true
  hash -r 2>/dev/null || true

  if find_chromium >/dev/null; then
    echo "  Chromium installé."
    return 0
  fi

  local arch
  arch="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
  if [[ "$arch" != "amd64" ]]; then
    return 1
  fi
  if ! command -v wget >/dev/null 2>&1; then
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y wget || true
  fi
  echo "  Chromium apt indisponible ou Snap — installation de Google Chrome…"
  local deb
  deb="$(mktemp --suffix=.deb)"
  if wget -qO "$deb" "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb"; then
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "$deb" || {
      sudo dpkg -i "$deb" || true
      sudo DEBIAN_FRONTEND=noninteractive apt-get install -f -y || true
    }
  else
    echo "  Téléchargement de Google Chrome impossible (réseau ?)." >&2
  fi
  rm -f "$deb"
  hash -r 2>/dev/null || true
  if find_chromium >/dev/null; then
    echo "  Google Chrome installé."
    return 0
  fi
  return 1
}

ensure_chromium() {
  hash -r 2>/dev/null || true
  if find_chromium >/dev/null; then
    return 0
  fi
  install_chromium || return 1
}

wait_for_url() {
  local url="$1"
  local i=0
  while (( i < 50 )); do
    if command -v curl >/dev/null 2>&1 && curl -fsS -o /dev/null --max-time 1 "$url" 2>/dev/null; then
      return 0
    fi
    sleep 0.4
    i=$((i + 1))
  done
  return 0
}

if ! ensure_chromium; then
  echo "" >&2
  echo "Aucun Chrome/Chromium (apt) détecté. Firefox n'a PAS Web Bluetooth." >&2
  echo "  Debian :  sudo apt install chromium" >&2
  echo "  Ubuntu :  installez Google Chrome (.deb), pas le Snap chromium-browser" >&2
  echo "Puis relancez l'icône GerMaCrise, ou :" >&2
  echo "  bash \"${HOME}/GerMaCrise/scripts/lancer-navigateur-bluetooth.sh\" ${URL}" >&2
  echo "" >&2
  if command -v notify-send >/dev/null 2>&1; then
    notify-send "GerMaCrise" "Installez Google Chrome ou Chromium (apt) pour le Bluetooth. Firefox ne fonctionne pas." || true
  fi
  exit 1
fi

if [[ "${ENSURE_ONLY}" -eq 1 ]]; then
  echo "Chromium / Chrome prêt pour le Bluetooth."
  exit 0
fi

bluetoothctl power on >/dev/null 2>&1 || true

echo "Attente de ${URL}…"
wait_for_url "$URL"

BROWSER="$(find_chromium)"
mkdir -p "${PROFILE}"
echo "Bluetooth : ${BROWSER} (profil GerMaCrise, Web Bluetooth activé)"
echo "  ${URL}"
echo "  Fermez les autres fenêtres Chromium/Chrome si le badge reste rouge."
exec "${BROWSER}" --user-data-dir="${PROFILE}" "${BT_FLAGS[@]}" "${URL}"
