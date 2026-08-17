#!/usr/bin/env bash
# Recree l'icone Bureau + entree menu Applications (Debian).
# XFCE / MATE / Cinnamon / LXDE / GNOME.
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

# Bureau XDG (FR/EN/OneDrive-like redirects)
if command -v xdg-user-dir >/dev/null 2>&1; then
  DESKTOP_DIR="$(xdg-user-dir DESKTOP)"
fi
if [[ -z "${DESKTOP_DIR:-}" || "${DESKTOP_DIR}" == "${HOME}" ]]; then
  if [[ -d "${HOME}/Bureau" ]]; then DESKTOP_DIR="${HOME}/Bureau"
  elif [[ -d "${HOME}/Desktop" ]]; then DESKTOP_DIR="${HOME}/Desktop"
  else DESKTOP_DIR="${HOME}/Desktop"; mkdir -p "${DESKTOP_DIR}"
  fi
fi

APPS_DIR="${HOME}/.local/share/applications"
BIN_DIR="${HOME}/.local/bin"
ICON_BASE="${HOME}/.local/share/icons/hicolor"
mkdir -p "${APPS_DIR}" "${DESKTOP_DIR}" "${BIN_DIR}"
mkdir -p "${ICON_BASE}/256x256/apps" "${ICON_BASE}/128x128/apps" "${ICON_BASE}/48x48/apps" "${ICON_BASE}/32x32/apps"

# Icone theme (plusieurs tailles = mieux pour les menus XFCE/MATE)
cp -f "${ICON_SRC}" "${ICON_BASE}/256x256/apps/germa-crise.png"
cp -f "${ICON_SRC}" "${ICON_BASE}/128x128/apps/germa-crise.png"
cp -f "${ICON_SRC}" "${ICON_BASE}/48x48/apps/germa-crise.png"
cp -f "${ICON_SRC}" "${ICON_BASE}/32x32/apps/germa-crise.png"
ICON_ABS="${ICON_BASE}/256x256/apps/germa-crise.png"
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f "${ICON_BASE}" >/dev/null 2>&1 || true
fi

# demarrer.sh
cat > "${INSTALL_DIR}/demarrer.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "${INSTALL_DIR}"
# PATH login (pnpm via npm -g)
export PATH="\${HOME}/.local/bin:/usr/local/bin:/usr/bin:\${PATH}"
hash -r 2>/dev/null || true
echo ""
echo "========================================"
echo "  GerMaCrise - serveur local"
echo "========================================"
echo "  Ouvrez Chrome / Chromium / Firefox :"
echo "    http://localhost:${PORT}"
echo "  Laissez cette fenetre ouverte."
echo "  Ctrl+C pour arreter."
echo "========================================"
echo ""
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 3 && xdg-open "http://localhost:${PORT}" >/dev/null 2>&1) &
fi
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm --filter meshtastic-web exec vite -- --host 0.0.0.0 --port ${PORT}
fi
exec npm exec --yes -- pnpm@11.9.0 --filter meshtastic-web exec vite -- --host 0.0.0.0 --port ${PORT}
EOF
chmod +x "${INSTALL_DIR}/demarrer.sh"
ln -sfn "${INSTALL_DIR}/demarrer.sh" "${HOME}/demarrer-GerMaCrise.sh"

# Wrapper dans ~/.local/bin (souvent dans le PATH menu)
WRAPPER="${BIN_DIR}/germa-crise"
cat > "${WRAPPER}" <<EOF
#!/usr/bin/env bash
exec "${INSTALL_DIR}/demarrer.sh"
EOF
chmod +x "${WRAPPER}"

# .desktop SIMPLE et valide (Terminal=true) — les Exec complexes
# (xfce4-terminal -e ...) sont souvent ignores par le menu Applications.
DESKTOP_FILE="${INSTALL_DIR}/GerMaCrise.desktop"
cat > "${DESKTOP_FILE}" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=GerMaCrise
Name[fr]=GerMaCrise
GenericName=Serveur web mesh
GenericName[fr]=Serveur web mesh
Comment=Demarrer le serveur web GerMaCrise
Comment[fr]=Demarrer le serveur web GerMaCrise
Keywords=GerMaCrise;Gaulix;mesh;crise;bipper;meshtastic;
Exec=${INSTALL_DIR}/demarrer.sh
TryExec=${INSTALL_DIR}/demarrer.sh
Path=${INSTALL_DIR}
Icon=${ICON_ABS}
Terminal=true
Categories=Network;Utility;Development;
StartupNotify=true
EOF
chmod +x "${DESKTOP_FILE}"

# Menu Applications (plusieurs noms de fichier pour la recherche)
MENU_FILE="${APPS_DIR}/germa-crise.desktop"
MENU_FILE2="${APPS_DIR}/GerMaCrise.desktop"
cp -f "${DESKTOP_FILE}" "${MENU_FILE}"
cp -f "${DESKTOP_FILE}" "${MENU_FILE2}"
chmod +x "${MENU_FILE}" "${MENU_FILE2}"

# Bureau
DESKTOP_LAUNCHER="${DESKTOP_DIR}/GerMaCrise.desktop"
cp -f "${DESKTOP_FILE}" "${DESKTOP_LAUNCHER}"
chmod +x "${DESKTOP_LAUNCHER}"
DESKTOP_SH="${DESKTOP_DIR}/GerMaCrise.sh"
cat > "${DESKTOP_SH}" <<EOF
#!/usr/bin/env bash
exec "${INSTALL_DIR}/demarrer.sh"
EOF
chmod +x "${DESKTOP_SH}"

if command -v gio >/dev/null 2>&1; then
  gio set "${DESKTOP_LAUNCHER}" "metadata::trusted" true 2>/dev/null || true
fi

# Installation "propre" Freedesktop
if command -v desktop-file-install >/dev/null 2>&1; then
  desktop-file-install --dir="${APPS_DIR}" "${DESKTOP_FILE}" 2>/dev/null || true
  # Remettre nos copies (desktop-file-install peut renommer)
  cp -f "${DESKTOP_FILE}" "${MENU_FILE}"
  cp -f "${DESKTOP_FILE}" "${MENU_FILE2}"
  chmod +x "${MENU_FILE}" "${MENU_FILE2}"
fi
if command -v desktop-file-validate >/dev/null 2>&1; then
  desktop-file-validate "${MENU_FILE}" 2>&1 || true
fi
if command -v xdg-desktop-menu >/dev/null 2>&1; then
  xdg-desktop-menu forceupdate 2>/dev/null || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${APPS_DIR}" 2>/dev/null || true
fi

# Copie systeme si sudo sans mot de passe (sinon ignore)
if command -v sudo >/dev/null 2>&1; then
  if sudo -n true 2>/dev/null; then
    sudo mkdir -p /usr/local/share/applications
    sudo cp -f "${DESKTOP_FILE}" /usr/local/share/applications/germa-crise.desktop
    sudo chmod 644 /usr/local/share/applications/germa-crise.desktop
    sudo update-desktop-database /usr/local/share/applications 2>/dev/null || true
    echo "Aussi installe dans /usr/local/share/applications/ (sudo)"
  fi
fi

# Rafraichir menus / panneaux
if command -v xfdesktop >/dev/null 2>&1; then
  xfdesktop --reload >/dev/null 2>&1 || true
fi
if command -v xfce4-panel >/dev/null 2>&1; then
  xfce4-panel -r >/dev/null 2>&1 || true
fi

echo ""
echo "Fichiers menu (doivent exister) :"
ls -la "${MENU_FILE}" "${MENU_FILE2}" 2>&1 || true
echo ""
echo "Lanceurs crees :"
echo "  Bureau .desktop : ${DESKTOP_LAUNCHER}"
echo "  Bureau .sh      : ${DESKTOP_SH}"
echo "  Menu            : ${MENU_FILE}"
echo "  Commande        : germa-crise   ou   ~/demarrer-GerMaCrise.sh"
echo ""
echo "Dans le menu Applications, cherchez : GerMaCrise"
echo "  (categories Internet / Reseau / Utilitaires / Developpement)"
echo ""
echo "Si toujours invisible : deconnectez/reconnectez la session,"
echo "  ou :  sudo cp ${MENU_FILE} /usr/local/share/applications/"
echo "        sudo update-desktop-database"
echo ""
