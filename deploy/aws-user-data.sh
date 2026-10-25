#!/bin/bash
set -ex

# 1. Update OS packages
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

# 2. Install official Docker Engine and Docker Compose Plugin
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl start docker
systemctl enable docker

# 3. Setup application directory
mkdir -p /opt/releasecheck
cd /opt/releasecheck

# 4. Clone repository (replace with your GitHub repository URL)
# Example: git clone https://github.com/sharatkatwa/cactro-release-checklist.git .
REPO_URL="https://github.com/sharatkatwa/cactro-release-checklist.git"

if [ -n "$REPO_URL" ]; then
  git clone "$REPO_URL" .
  docker compose up -d --build
fi
