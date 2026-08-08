#!/usr/bin/env bash
# Recree l'icone Bureau / menu Applications pour GerMaCrise (Debian).
# Compatible XFCE, MATE, Cinnamon, LXDE/LXQt, GNOME.
# Usage : bash ~/GerMaCrise/creer-icone.sh
set -euo pipefail

PORT="5173"
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
INSTALL_DIR="$(cd "$(dirname "${SCRIPT_PATH}")" && pwd)"

if [[ ! -f "${INSTALL_DIR}/package.json" ]]; then
  echo "Lancez ce script depuis le dossier GerMaCrise (celui qui contient package.json)."
  exit 1
fi

DE="${XDG_CURRENT_DESKTOP:-${DESKTOP_SESSION:-inconnu}}"
echo "Environnement detecte : ${DE}"

ICON_SRC="${INSTALL_DIR}/apps/web/public/images/germacrise_icon.png"
if [[ ! -f "${ICON_SRC}" ]]; then
  if [[ -f "${INSTALL_DIR}/apps/web/public/favicon.png" ]]; then
    ICON_SRC="${INSTALL_DIR}/apps/web/public/favicon.png"
  else
    echo "Aucune image d'icone trouvee dans apps/web/public/."
    exit 1
  fi
fi

# Dossier Bureau reel (xdg) — marche FR (Bureau) et EN (Desktop)
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

cp -f "${ICON_SRC}" "${ICON_THEME_DIR}/germa-crise.png"
# Chemin absolu : souvent mieux reconnu sous XFCE / MATE
ICON_ABS="${ICON_THEME_DIR}/germa-crise.png"
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

# Script de demarrage
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
ln -sfn "${INSTALL_DIR}/demarrer.sh" "${HOME}/demarrer-GerMaCrise.sh"

# Lancement terminal : portable (Terminal=true) + Exec simple
# Sur XFCE / MATE / LXDE / GNOME, le DE ouvre le terminal par defaut.
EXEC_LINE="${INSTALL_DIR}/demarrer.sh"
USE_TERMINAL_KEY=true

# Si on peut cibler explicitement un terminal (plus propre sous XFCE)
case "${DE,,}" in
  *xfce*)
    if command -v xfce4-terminal >/dev/null 2>&1; then
      EXEC_LINE="xfce4-terminal --working-directory=${INSTALL_DIR} -e ${INSTALL_DIR}/demarrer.sh"
      USE_TERMINAL_KEY=false
    elif command -v x-terminal-emulator >/dev/null 2>&1; then
      EXEC_LINE="x-terminal-emulator -e ${INSTALL_DIR}/demarrer.sh"
      USE_TERMINAL_KEY=false
    fi
    ;;
  *mate*|*cinnamon*|*lxde*|*lxqt*|*gnome*|*ubuntu*|*unity*)
    if command -v x-terminal-emulator >/dev/null 2>&1; then
      EXEC_LINE="x-terminal-emulator -e ${INSTALL_DIR}/demarrer.sh"
      USE_TERMINAL_KEY=false
    fi
    ;;
esac

DESKTOP_FILE="${INSTALL_DIR}/GerMaCrise.desktop"
cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=GerMaCrise
Comment=Demarrer le serveur web GerMaCrise
Exec=${EXEC_LINE}
Path=${INSTALL_DIR}
Icon=${ICON_ABS}
Terminal=${USE_TERMINAL_KEY}
Categories=Network;Utility;
StartupNotify=true
EOF
chmod +x "${DESKTOP_FILE}"

DESKTOP_LAUNCHER="${DESKTOP_DIR}/GerMaCrise.desktop"
cp -f "${DESKTOP_FILE}" "${DESKTOP_LAUNCHER}"
cp -f "${DESKTOP_FILE}" "${APPS_DIR}/germa-crise.desktop"
chmod +x "${DESKTOP_LAUNCHER}" "${APPS_DIR}/germa-crise.desktop"

# Repli ultra-simple : script visible sur le Bureau (double-clic OK sous XFCE)
DESKTOP_SH="${DESKTOP_DIR}/GerMaCrise.sh"
cat > "${DESKTOP_SH}" <<EOF
#!/usr/bin/env bash
exec "${INSTALL_DIR}/demarrer.sh"
EOF
chmod +x "${DESKTOP_SH}"

# Confiance lanceur (utile surtout GNOME/Cinnamon ; inoffensif ailleurs)
if command -v gio >/dev/null 2>&1; then
  gio set "${DESKTOP_LAUNCHER}" "metadata::trusted" true 2>/dev/null || true
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APPS_DIR}" 2>/dev/null || true
fi

# Rafraichir le Bureau XFCE si present
if command -v xfdesktop >/dev/null 2>&1; then
  xfdesktop --reload >/dev/null 2>&1 || true
fi

echo ""
echo "Icone / lanceurs crees :"
echo "  • Bureau (.desktop) : ${DESKTOP_LAUNCHER}"
echo "  • Bureau (.sh)      : ${DESKTOP_SH}"
echo "  • Menu Applications : GerMaCrise"
echo "  • Script            : ~/demarrer-GerMaCrise.sh"
echo ""
echo "Sous XFCE : si le .desktop s'ouvre comme texte,"
echo "  clic droit → Proprietes → cocher « Autoriser l'execution »"
echo "  ou double-cliquer plutot sur GerMaCrise.sh"
echo ""
