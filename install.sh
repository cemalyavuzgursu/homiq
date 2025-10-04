#!/bin/bash
set -e

echo "======================================="
echo " 🏠 Smart Home Hub Installer"
echo " Raspberry Pi 5 - Auto Setup Script"
echo "======================================="

# 1) Sistem güncelle
sudo apt update && sudo apt upgrade -y

# 2) Docker + Compose + araçlar
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  sudo usermod -aG docker $USER
fi
sudo apt install -y docker-compose unclutter netcat-openbsd

# 3) Chromium (paket adı değişebilir)
sudo apt install -y chromium || sudo apt install -y chromium-browser || true

# 4) Kiosk başlatıcı
sudo tee /usr/local/bin/start-kiosk >/dev/null <<'SH'
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
sudo chmod +x /usr/local/bin/start-kiosk

# 5) systemd servisleri
SERVICE_FILE="/etc/systemd/system/smarthome.service"
sudo tee $SERVICE_FILE >/dev/null <<SERVICE
[Unit]
Description=Smart Home Hub Auto Start
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/home/$USER/smarthome-hub
ExecStart=/usr/bin/docker-compose up --build -d
ExecStop=/usr/bin/docker-compose down
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
SERVICE

KIOSK_FILE="/etc/systemd/system/kiosk.service"
sudo tee $KIOSK_FILE >/dev/null <<SERVICE
[Unit]
Description=Smart Home Hub Kiosk Mode
After=graphical.target

[Service]
User=$USER
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$USER/.Xauthority
ExecStartPre=/bin/sh -c 'for i in $(seq 1 60); do nc -z localhost 3000 && exit 0; echo "waiting ui"; sleep 2; done; exit 0'
ExecStart=/usr/local/bin/start-kiosk
Restart=always

[Install]
WantedBy=graphical.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable smarthome.service
sudo systemctl enable kiosk.service

# 6) Compose up
docker compose up --build -d

# 7) Servisleri başlat
sudo systemctl restart smarthome.service || true
sudo systemctl restart kiosk.service || true

echo "✅ Kurulum tamamlandı!"
echo "UI: http://raspberrypi.local:3000"
echo "API: http://raspberrypi.local:8000/docs"
echo "Zigbee2MQTT: http://raspberrypi.local:8080"
