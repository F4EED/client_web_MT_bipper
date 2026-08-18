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
#   bash scripts/lancer-navigateur-bluetooth.sh [URL]
set -euo pipefail

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

bluetoothctl power on >/dev/null 2>&1 || true

echo "Attente de ${URL}…"
wait_for_url "$URL"

if BROWSER="$(find_chromium)"; then
  mkdir -p "${PROFILE}"
  echo "Bluetooth : ${BROWSER} (profil GerMaCrise, Web Bluetooth activé)"
  echo "  ${URL}"
  echo "  Fermez les autres fenêtres Chromium/Chrome si le badge reste rouge."
  exec "${BROWSER}" --user-data-dir="${PROFILE}" "${BT_FLAGS[@]}" "${URL}"
fi

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
