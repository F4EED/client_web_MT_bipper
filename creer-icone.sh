#!/usr/bin/env bash
# Recree l'icone Bureau / menu Applications pour GerMaCrise (Debian).
# Usage : bash ~/GerMaCrise/creer-icone.sh
set -euo pipefail

PORT="5173"
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
INSTALL_DIR="$(cd "$(dirname "${SCRIPT_PATH}")" && pwd)"

if [[ ! -f "${INSTALL_DIR}/package.json" ]]; then
  echo "Lancez ce script depuis le dossier GerMaCrise (celui qui contient package.json)."
  exit 1
fi

ICON_SRC="${INSTALL_DIR}/apps/web/public/images/germacrise_icon.png"
if [[ ! -f "${ICON_SRC}" ]]; then
  # repli favicon si image manquante
  if [[ -f "${INSTALL_DIR}/apps/web/public/favicon.png" ]]; then
    ICON_SRC="${INSTALL_DIR}/apps/web/public/favicon.png"
  else
    echo "Aucune image d'icone trouvee dans apps/web/public/."
    exit 1
  fi
fi

# Dossier Bureau reel (xdg), pas un faux ~/Bureau cree par erreur
if command -v xdg-user-dir >/dev/null 2>&1; then
  DESKTOP_DIR="$(xdg-user-dir DESKTOP)"
fi
if [[ -z "${DESKTOP_DIR:-}" || "${DESKTOP_DIR}" == "${HOME}" ]]; then
  if [[ -d "${HOME}/Bureau" ]]; then
    DESKTOP_DIR="${HOME}/Bureau"
  elif [[ -d "${HOME}/Desktop" ]]; then
    DESKTOP_DIR="${HOME}/Desktop"
  else
    DESKTOP_DIR="${HOME}/Desktop"
    mkdir -p "${DESKTOP_DIR}"
  fi
fi

APPS_DIR="${HOME}/.local/share/applications"
ICON_THEME_DIR="${HOME}/.local/share/icons/hicolor/256x256/apps"
mkdir -p "${APPS_DIR}" "${DESKTOP_DIR}" "${ICON_THEME_DIR}"

# Icone theme Freedesktop (plus fiable qu'un chemin absolu pour GNOME)
cp -f "${ICON_SRC}" "${ICON_THEME_DIR}/germa-crise.png"
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

# Script de demarrage
if [[ ! -x "${INSTALL_DIR}/demarrer.sh" ]]; then
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
echo "  Laissez cette fenetre ouverte."
echo "  Ctrl+C pour arreter."
echo "========================================"
echo ""
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 3 && xdg-open "http://localhost:${PORT}" >/dev/null 2>&1) &
fi
exec pnpm --filter meshtastic-web exec vite -- --host 0.0.0.0 --port ${PORT}
EOF
  chmod +x "${INSTALL_DIR}/demarrer.sh"
fi
ln -sfn "${INSTALL_DIR}/demarrer.sh" "${HOME}/demarrer-GerMaCrise.sh"

# x-terminal-emulator = alternatif Debian (gnome-terminal, xfce4-terminal, ...)
# plus fiable que Terminal=true seul
TERMINAL_EXEC="x-terminal-emulator -e ${INSTALL_DIR}/demarrer.sh"
if ! command -v x-terminal-emulator >/dev/null 2>&1; then
  if command -v gnome-terminal >/dev/null 2>&1; then
    TERMINAL_EXEC="gnome-terminal --working-directory=${INSTALL_DIR} -- ${INSTALL_DIR}/demarrer.sh"
  elif command -v xfce4-terminal >/dev/null 2>&1; then
    TERMINAL_EXEC="xfce4-terminal --working-directory=${INSTALL_DIR} -e ${INSTALL_DIR}/demarrer.sh"
  elif command -v konsole >/dev/null 2>&1; then
    TERMINAL_EXEC="konsole --workdir ${INSTALL_DIR} -e ${INSTALL_DIR}/demarrer.sh"
  else
    TERMINAL_EXEC="${INSTALL_DIR}/demarrer.sh"
  fi
fi

DESKTOP_FILE="${INSTALL_DIR}/GerMaCrise.desktop"
cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=GerMaCrise
Comment=Demarrer le serveur web GerMaCrise
Exec=${TERMINAL_EXEC}
Path=${INSTALL_DIR}
Icon=germa-crise
Terminal=false
Categories=Network;Utility;
StartupNotify=true
EOF
chmod +x "${DESKTOP_FILE}"

DESKTOP_LAUNCHER="${DESKTOP_DIR}/GerMaCrise.desktop"
cp -f "${DESKTOP_FILE}" "${DESKTOP_LAUNCHER}"
cp -f "${DESKTOP_FILE}" "${APPS_DIR}/germa-crise.desktop"
chmod +x "${DESKTOP_LAUNCHER}" "${APPS_DIR}/germa-crise.desktop"

# Marquer comme fiable (GNOME / Cinnamon) — a faire dans la session graphique
trust_desktop() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  if command -v gio >/dev/null 2>&1; then
    gio set "$f" "metadata::trusted" true 2>/dev/null || true
    # Variante vue sur certains GNOME
    gio set -t string "$f" "metadata::xfce-exe-checksum" "$(sha256sum "$f" | awk '{print $1}')" 2>/dev/null || true
  fi
}
trust_desktop "${DESKTOP_LAUNCHER}"
trust_desktop "${APPS_DIR}/germa-crise.desktop"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APPS_DIR}" 2>/dev/null || true
fi

echo ""
echo "Icone creee :"
echo "  • Bureau : ${DESKTOP_LAUNCHER}"
echo "  • Menu   : Applications → GerMaCrise"
echo "  • Script : ~/demarrer-GerMaCrise.sh"
echo ""
if [[ ! -f "${DESKTOP_LAUNCHER}" ]]; then
  echo "ECHEC : fichier Bureau introuvable."
  exit 1
fi
echo "Si le double-clic est bloque : clic droit sur l'icone → Autoriser le lancement."
echo "Si rien n'apparait sur le Bureau (GNOME) :"
echo "  sudo apt-get install -y gnome-shell-extension-desktop-icons-ng"
echo "  puis : bash ${INSTALL_DIR}/creer-icone.sh"
echo ""
