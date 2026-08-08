#!/usr/bin/env bash
# Recrée l'icône Bureau / menu Applications pour GerMaCrise (Debian).
# Usage (depuis le dossier du projet) :  bash creer-icone.sh
set -euo pipefail

PORT="5173"
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
INSTALL_DIR="$(cd "$(dirname "${SCRIPT_PATH}")" && pwd)"

if [[ ! -f "${INSTALL_DIR}/package.json" ]]; then
  echo "Lancez ce script depuis le dossier GerMaCrise (celui qui contient package.json)."
  exit 1
fi

ICON_PNG="${INSTALL_DIR}/apps/web/public/images/germacrise_icon.png"
DESKTOP_DIR="${HOME}/Bureau"
[[ -d "${DESKTOP_DIR}" ]] || DESKTOP_DIR="${HOME}/Desktop"
APPS_DIR="${HOME}/.local/share/applications"
mkdir -p "${APPS_DIR}" "${DESKTOP_DIR}"

# S'assurer que demarrer.sh existe
if [[ ! -x "${INSTALL_DIR}/demarrer.sh" ]]; then
  cat > "${INSTALL_DIR}/demarrer.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "${INSTALL_DIR}"
echo "GerMaCrise démarre… → http://localhost:${PORT}"
echo "Laissez cette fenêtre ouverte. Ctrl+C pour arrêter."
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 3 && xdg-open "http://localhost:${PORT}" >/dev/null 2>&1) &
fi
exec pnpm --filter meshtastic-web exec vite -- --host 0.0.0.0 --port ${PORT}
EOF
  chmod +x "${INSTALL_DIR}/demarrer.sh"
fi

cat > "${INSTALL_DIR}/GerMaCrise.desktop" <<EOF
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
chmod +x "${INSTALL_DIR}/GerMaCrise.desktop"

cp -f "${INSTALL_DIR}/GerMaCrise.desktop" "${DESKTOP_DIR}/GerMaCrise.desktop"
cp -f "${INSTALL_DIR}/GerMaCrise.desktop" "${APPS_DIR}/germa-crise.desktop"
chmod +x "${DESKTOP_DIR}/GerMaCrise.desktop" "${APPS_DIR}/germa-crise.desktop"

if command -v gio >/dev/null 2>&1; then
  gio set "${DESKTOP_DIR}/GerMaCrise.desktop" metadata::trusted true 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APPS_DIR}" 2>/dev/null || true
fi

ln -sfn "${INSTALL_DIR}/demarrer.sh" "${HOME}/demarrer-GerMaCrise.sh"

echo ""
echo "Icône créée :"
echo "  • Bureau : ${DESKTOP_DIR}/GerMaCrise.desktop"
echo "  • Menu   : Applications → GerMaCrise"
echo ""
echo "Si le double-clic est bloqué : clic droit → Autoriser le lancement."
echo ""
