# /opt/pickems/update.sh
#!/bin/bash
cd /opt/pickems
git pull origin main
docker compose up -d --build
