#!/bin/bash
set -euo pipefail

echo "======================================="
echo " 🏠 HOMIQ - Full Clean Installer"
echo " Target: Raspberry Pi OS (Desktop or Lite)"
echo "======================================="

# --- Discover paths/users ------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"                # install.sh ile aynı dizin
PROJECT_NAME="homiq"
SYSTEM_USER="${SUDO_USER:-$USER}"        # sudo ile çağrıldıysa gerçek kullanıcıyı al
HOME_DIR="$(getent passwd "$SYSTEM_USER" | cut -d: -f6)"

echo "Project dir   : $PROJECT_DIR"
echo "System user   : $SYSTEM_USER"
echo "Home dir      : $HOME_DIR"

# --- Helper: run as user -------------------------------------------------------
run_as_user () { sudo -u "$SYSTEM_USER" -H bash -lc "$*"; }

# --- 0) Base packages ----------------------------------------------------------
echo "📦 Base packages"
sudo apt-get update
sudo apt-get install -y \
  ca-certificates curl git gnupg lsb-release \
  netcat-openbsd \
  unzip tar jq \
  xdg-utils \
  --no-install-recommends

# --- 1) Docker engine (official script; robust) --------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Installing Docker (official script)"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
fi

# Enable + start docker service (if present)
if systemctl list-unit-files | grep -q '^docker.service'; then
  sudo systemctl enable --now docker
else
  echo "⚠️  docker.service görünmedi; dockerd yine de yüklendi. Devam ediyoruz."
fi

# Add user to docker group (current session may still require sudo)
if ! id -nG "$SYSTEM_USER" | tr ' ' '\n' | grep -qx docker; then
  sudo usermod -aG docker "$SYSTEM_USER" || true
  echo "ℹ️  $SYSTEM_USER docker grubuna eklendi (yeniden login önerilir)."
fi

# Docker Compose v2 plugin (preferred)
if ! docker compose version >/dev/null 2>&1; then
  echo "🔧 Installing docker compose v2 plugin"
  sudo apt-get install -y docker-compose-plugin || true
fi
# Fallback: legacy docker-compose
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  echo "🔧 Installing legacy docker-compose"
  sudo apt-get install -y docker-compose || true
fi

# Choose compose command
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ docker compose bulunamadı."
  exit 1
fi
echo "Compose cmd   : $COMPOSE_CMD"

# --- 2) Determine OS flavor (Desktop or Lite) ---------------------------------
IS_DESKTOP=0
if dpkg -l | grep -q raspberrypi-ui-mods; then
  IS_DESKTOP=1
fi
echo "OS Desktop?   : $IS_DESKTOP"

# --- 3) Chromium & Kiosk setup ------------------------------------------------
echo "🌐 Installing Chromium & kiosk utilities"
# Try both names; biri tutar
sudo apt-get install -y chromium || sudo apt-get install -y chromium-browser || true
sudo apt-get install -y unclutter

# Akıllı kiosk başlatıcı (chromium/chromium-browser autodetect)
sudo tee /usr/local/bin/start-kiosk-homiq >/dev/null <<'SH'
#!/bin/bash
set -e
BIN=""
if command -v chromium >/dev/null 2>&1; then BIN=$(command -v chromium); fi
if command -v chromium-browser >/dev/null 2>&1; then BIN=$(command -v chromium-browser); fi
if [ -z "$BIN" ]; then
  echo "Chromium not found. Install with: sudo apt install chromium"
  exit 1
fi
exec "$BIN" --kiosk --incognito --noerrdialogs --disable-translate --fast --fast-start http://localhost:3000
SH
sudo chmod +x /usr/local/bin/start-kiosk-homiq

# Desktop vs Lite kiosk services
if [ "$IS_DESKTOP" -eq 1 ]; then
  echo "🖥️  Desktop tespit edildi → kiosk-homiq.service kuruluyor"
  KIOSK_SERVICE="/etc/systemd/system/kiosk-homiq.service"
  sudo tee "$KIOSK_SERVICE" >/dev/null <<SERVICE
[Unit]
Description=HOMIQ Kiosk Mode (Desktop)
After=graphical.target

[Service]
User=$SYSTEM_USER
Environment=DISPLAY=:0
Environment=XAUTHORITY=$HOME_DIR/.Xauthority
# UI portunu bekle (3000)
ExecStartPre=/bin/sh -c 'for i in \$(seq 1 90); do nc -z localhost 3000 && exit 0; echo "waiting ui"; sleep 2; done; exit 0'
ExecStart=/usr/local/bin/start-kiosk-homiq
Restart=always

[Install]
WantedBy=graphical.target
SERVICE
  sudo systemctl daemon-reload
  sudo systemctl enable kiosk-homiq.service || true
else
  echo "🧱 Lite tespit edildi → minimal X + Openbox + kiosk-lite-homiq.service"
  sudo apt-get install -y --no-install-recommends xserver-xorg x11-xserver-utils xinit openbox
  # Openbox autostart
  run_as_user "mkdir -p $HOME_DIR/.config/openbox"
  tee "$HOME_DIR/.config/openbox/autostart" >/dev/null <<'CFG'
# unclutter &  # imleci gizlemek istersen
/usr/local/bin/start-kiosk-homiq &
CFG
  chown "$SYSTEM_USER":"$SYSTEM_USER" "$HOME_DIR/.config/openbox/autostart"

  # .xinitrc
  tee "$HOME_DIR/.xinitrc" >/dev/null <<'XRC'
exec openbox-session
XRC
  chown "$SYSTEM_USER":"$SYSTEM_USER" "$HOME_DIR/.xinitrc"

  # kiosk-lite-homiq service
  KIOSK_LITE="/etc/systemd/system/kiosk-lite-homiq.service"
  sudo tee "$KIOSK_LITE" >/dev/null <<SERVICE
[Unit]
Description=HOMIQ Kiosk (Lite)
After=network-online.target

[Service]
User=$SYSTEM_USER
WorkingDirectory=$HOME_DIR
Environment=DISPLAY=:0
ExecStart=/usr/bin/startx
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE
  sudo systemctl daemon-reload
  sudo systemctl enable kiosk-lite-homiq.service || true
fi

# --- 4) homiq.service (docker compose auto start) -----------------------------
echo "⚙️  Creating systemd service for docker compose"
SERVICE_FILE="/etc/systemd/system/homiq.service"

# ExecStart path: prefer 'docker compose' if available
if [ "$COMPOSE_CMD" = "docker compose" ]; then
  EXEC_START="/usr/bin/docker compose up --build -d"
  EXEC_STOP="/usr/bin/docker compose down"
else
  EXEC_START="/usr/bin/docker-compose up --build -d"
  EXEC_STOP="/usr/bin/docker-compose down"
fi

sudo tee "$SERVICE_FILE" >/dev/null <<SERVICE
[Unit]
Description=HOMIQ Auto Start (Docker)
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
User=$SYSTEM_USER
ExecStart=$EXEC_START
ExecStop=$EXEC_STOP

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable homiq.service || true

# --- 5) Bring up the stack now -----------------------------------------------
echo "🚀 Building & starting containers"
cd "$PROJECT_DIR"
# mevcut oturum docker grubunu görmeyebilir; güvenli taraf: sudo
if [ "$COMPOSE_CMD" = "docker compose" ]; then
  sudo docker compose up -d --build
else
  sudo docker-compose up -d --build
fi

# --- 6) Final info ------------------------------------------------------------
echo "✅ Install finished!"
echo "---------------------------------------"
echo "Frontend (UI):      http://raspberrypi.local:3000"
echo "Backend (API docs): http://raspberrypi.local:8000/docs"
echo "Zigbee2MQTT UI:     http://raspberrypi.local:8080"
echo "MQTT Broker:        mqtt://raspberrypi.local:1883"
echo "---------------------------------------"
echo "📝 Notlar:"
echo " - Lite: kiosk 'kiosk-lite-homiq.service', Desktop: 'kiosk-homiq.service'."
echo " - Zigbee dongle /dev/ttyUSB0 yerine /dev/ttyACM0 olabilir:"
echo "     ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null"
echo "   Gerekirse zigbee2mqtt/data/configuration.yaml içinde 'serial.port' değiştirip:"
echo "     sudo $COMPOSE_CMD restart zigbee2mqtt"
echo " - İlk kurulumdan sonra docker yetkisi için oturumu yeniden açman önerilir."