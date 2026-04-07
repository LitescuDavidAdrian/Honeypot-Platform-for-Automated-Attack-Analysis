#!/bin/bash

# =============================================================================
# Honeypot Platform - VM Setup Script
# =============================================================================
# This script sets up the honeypot on a fresh Ubuntu VM.
# Before running, copy .env.example to .env and fill in your DB credentials.
#
# Usage:
#   cp .env.example .env
#   nano .env
#   chmod +x setup.sh
#   sudo ./setup.sh
# =============================================================================

set -e  # Exit on any error

# -----------------------------------------------------------------------------
# Colors for output
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()    { echo -e "${GREEN}[+]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[x]${NC} $1"; exit 1; }

# -----------------------------------------------------------------------------
# Check root
# -----------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
    error "Please run as root: sudo ./setup.sh"
fi

# -----------------------------------------------------------------------------
# Load .env file
# -----------------------------------------------------------------------------
ENV_FILE="$(dirname "$0")/.env"

if [ ! -f "$ENV_FILE" ]; then
    error ".env file not found. Copy .env.example to .env and fill in your credentials."
fi

log "Loading environment variables from .env..."
set -a
source "$ENV_FILE"
set +a

# Validate required variables
for var in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do
    if [ -z "${!var}" ]; then
        error "Missing required variable: $var. Check your .env file."
    fi
done

log "Environment variables loaded."

# -----------------------------------------------------------------------------
# Step 1 — Update system
# -----------------------------------------------------------------------------
log "Updating system packages..."
apt update -y && apt upgrade -y

# -----------------------------------------------------------------------------
# Step 2 — Install Apache
# -----------------------------------------------------------------------------
log "Installing Apache..."
apt install apache2 -y
systemctl enable apache2
systemctl start apache2
log "Apache installed and running."

# -----------------------------------------------------------------------------
# Step 3 — Install OpenSSH
# -----------------------------------------------------------------------------
log "Installing OpenSSH..."
apt install openssh-server -y
systemctl enable ssh
systemctl start ssh

# Configure verbose SSH logging
if ! grep -q "LogLevel VERBOSE" /etc/ssh/sshd_config; then
    echo "" >> /etc/ssh/sshd_config
    echo "LogLevel VERBOSE" >> /etc/ssh/sshd_config
    echo "SyslogFacility AUTH" >> /etc/ssh/sshd_config
fi

systemctl restart sshd
log "OpenSSH installed and configured."

# -----------------------------------------------------------------------------
# Step 4 — Install Auditd
# -----------------------------------------------------------------------------
log "Installing Auditd..."
apt install auditd audispd-plugins -y
systemctl enable auditd
systemctl start auditd

# Configure audit rules
cat > /etc/audit/rules.d/audit.rules << 'EOF'
## First rule - delete all
-D

## Increase the buffers to survive stress events
-b 8192

## Wait time for burst events
--backlog_wait_time 60000

## Set failure mode to syslog
-f 1

-e 1
-a always,exit -F arch=b64 -S execve -k user_commands
-e 2
EOF

systemctl restart auditd
log "Auditd installed and configured."

# -----------------------------------------------------------------------------
# Step 5 — Install Filebeat
# -----------------------------------------------------------------------------
log "Installing Filebeat..."

# Add Elastic repository if not already added
if [ ! -f /etc/apt/sources.list.d/elastic-8.x.list ]; then
    wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | apt-key add -
    echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" > /etc/apt/sources.list.d/elastic-8.x.list
    apt update -y
fi

apt install filebeat -y

# Configure Filebeat
cat > /etc/filebeat/filebeat.yml << 'EOF'
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/apache2/access.log
      - /var/log/apache2/error.log
      - /var/log/audit/audit.log
      - /var/log/auth.log
    scan_frequency: 1s
    close_inactive: 30s

output.logstash:
  hosts: ["localhost:5044"]
  bulk_max_size: 1
  timeout: 5
EOF

systemctl enable filebeat
log "Filebeat installed and configured."

# -----------------------------------------------------------------------------
# Step 6 — Install Logstash & JDBC Driver
# -----------------------------------------------------------------------------
log "Installing Logstash..."
apt install logstash -y

# Download PostgreSQL JDBC driver
log "Downloading PostgreSQL JDBC driver..."
wget -q https://jdbc.postgresql.org/download/postgresql-42.7.3.jar -O /usr/share/logstash/postgresql-42.7.3.jar
log "JDBC driver downloaded."

# -----------------------------------------------------------------------------
# Step 7 — Configure Logstash .env file
# -----------------------------------------------------------------------------
log "Configuring Logstash environment variables..."

cat > /etc/logstash/.env << EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF

chmod 600 /etc/logstash/.env
chown logstash:logstash /etc/logstash/.env
log "Logstash .env file created and secured."

# -----------------------------------------------------------------------------
# Step 8 — Configure Logstash Pipeline
# -----------------------------------------------------------------------------
log "Configuring Logstash pipeline..."

cat > /etc/logstash/conf.d/honeypot.conf << 'EOF'
input {
  beats {
    port => 5044
  }
}

filter {
  if [log][file][path] == "/var/log/apache2/access.log" {
    grok {
      match => { "message" => "%{COMBINEDAPACHELOG}" }
      tag_on_failure => ["_grokparsefailure"]
    }
  } else if [log][file][path] == "/var/log/auth.log" {
    grok {
      match => {
        "message" => [
          "%{SYSLOGTIMESTAMP:log_timestamp} %{NOTSPACE:hostname} sshd\[%{POSINT:pid}\]: Failed %{WORD:auth_method} for (?:invalid user )?%{WORD:username} from %{IPV4:source_ip}",
          "%{SYSLOGTIMESTAMP:log_timestamp} %{NOTSPACE:hostname} sshd\[%{POSINT:pid}\]: Invalid user %{WORD:username} from %{IPV4:source_ip}",
          "%{SYSLOGTIMESTAMP:log_timestamp} %{NOTSPACE:hostname} sshd\[%{POSINT:pid}\]: Accepted %{WORD:auth_method} for %{WORD:username} from %{IPV4:source_ip}",
          "%{SYSLOGTIMESTAMP:log_timestamp} %{NOTSPACE:hostname} sshd\[%{POSINT:pid}\]: (?:Disconnected from|Connection closed by) (?:invalid user |authenticating user |user )?%{WORD:username} %{IPV4:source_ip}"
        ]
      }
      tag_on_failure => ["_grokparsefailure"]
    }
    if "Failed" in [message] {
      mutate { add_field => { "status" => "FAILED" } }
    } else if "Accepted" in [message] {
      mutate { add_field => { "status" => "SUCCESS" } }
    } else if "Invalid user" in [message] {
      mutate { add_field => { "status" => "INVALID_USER" } }
    } else if "Disconnected from" in [message] or "Connection closed by" in [message] {
      mutate { add_field => { "status" => "DISCONNECTED" } }
    } else {
      mutate { add_field => { "status" => "OTHER" } }
    }

  } else if [log][file][path] == "/var/log/audit/audit.log" {
    ruby {
      code => '
        msg = event.get("message")
        if msg
          hex_match = msg.match(/cmd=([0-9A-Fa-f]+)/)
          if hex_match
            hex_str = hex_match[1]
            decoded = [hex_str].pack("H*").encode("UTF-8", invalid: :replace, undef: :replace, replace: "?")
            event.set("command", decoded)
          else
            quoted_match = msg.match(/cmd="([^"]+)"/)
            event.set("command", quoted_match ? quoted_match[1] : nil)
          end
        end
      '
    }
  }
  if "_grokparsefailure" in [tags] {
    drop { }
  }
}

output {
  if [log][file][path] == "/var/log/apache2/access.log" {
    jdbc {
      driver_jar_path => "/usr/share/logstash/postgresql-42.7.3.jar"
      driver_class => "org.postgresql.Driver"
      connection_string => "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
      username => "${DB_USER}"
      password => "${DB_PASSWORD}"
      statement => [
        "INSERT INTO attacks (timestamp, attacker_ip, http_method, endpoint, status_code, user_agent, raw_log) VALUES (?::timestamp, ?, ?, ?, ?::integer, ?, ?)",
        "@timestamp",
        "[source][address]",
        "[http][request][method]",
        "[url][original]",
        "[http][response][status_code]",
        "[user_agent][original]",
        "message"
      ]
    }
  } else if [log][file][path] == "/var/log/auth.log" {
    jdbc {
      driver_jar_path => "/usr/share/logstash/postgresql-42.7.3.jar"
      driver_class => "org.postgresql.Driver"
      connection_string => "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
      username => "${DB_USER}"
      password => "${DB_PASSWORD}"
      statement => [
        "INSERT INTO auth_logs (timestamp, username, source_ip, status, raw_log) VALUES (?::timestamp, ?, ?, ?, ?)",
        "@timestamp",
        "username",
        "source_ip",
        "status",
        "message"
      ]
    }
  } else if [log][file][path] == "/var/log/audit/audit.log" {
    if "type=USER_CMD" in [message] {
      jdbc {
        driver_jar_path => "/usr/share/logstash/postgresql-42.7.3.jar"
        driver_class => "org.postgresql.Driver"
        connection_string => "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
        username => "${DB_USER}"
        password => "${DB_PASSWORD}"
        statement => [
          "INSERT INTO command_logs (timestamp, command, raw_log) VALUES (?::timestamp, ?, ?)",
          "@timestamp",
          "command",
          "message"
        ]
      }
    }
  }
}
EOF

log "Logstash pipeline configured."

# -----------------------------------------------------------------------------
# Step 9 — Secure the processes with systemd overrides
# -----------------------------------------------------------------------------
log "Configuring systemd overrides..."

# Logstash override
mkdir -p /etc/systemd/system/logstash.service.d
cat > /etc/systemd/system/logstash.service.d/override.conf << EOF
[Service]
EnvironmentFile=/etc/logstash/.env
Restart=always
RestartSec=1

[Unit]
RefuseManualStop=yes
EOF

# Filebeat override
mkdir -p /etc/systemd/system/filebeat.service.d
cat > /etc/systemd/system/filebeat.service.d/override.conf << EOF
[Service]
Restart=always
RestartSec=1

[Unit]
RefuseManualStop=yes
EOF

# Auditd override
mkdir -p /etc/systemd/system/auditd.service.d
cat > /etc/systemd/system/auditd.service.d/override.conf << EOF
[Service]
Restart=always
RestartSec=1

[Unit]
RefuseManualStop=yes
EOF

systemctl daemon-reload
log "Systemd overrides configured."

# -----------------------------------------------------------------------------
# Step 10 — Start all services
# -----------------------------------------------------------------------------
log "Starting all services..."
systemctl start logstash
systemctl start filebeat
log "Services started."

# -----------------------------------------------------------------------------
# Step 11 — Make Logstash config immutable
# -----------------------------------------------------------------------------
log "Making Logstash config immutable..."
chattr +i /etc/logstash/conf.d/honeypot.conf
log "Logstash config is now immutable."

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Honeypot setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Services running:"
echo "  - Apache:   $(systemctl is-active apache2)"
echo "  - OpenSSH:  $(systemctl is-active ssh)"
echo "  - Auditd:   $(systemctl is-active auditd)"
echo "  - Filebeat: $(systemctl is-active filebeat)"
echo "  - Logstash: $(systemctl is-active logstash)"
echo ""
warn "Note: Logstash takes 1-2 minutes to fully start up."
warn "Note: To edit honeypot.conf, first run: sudo chattr -i /etc/logstash/conf.d/honeypot.conf"
echo ""
