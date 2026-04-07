# Honeypot Setup & Configuration

A hybrid honeypot with dynamic operational behavior. Low-interaction, built on Ubuntu VM, using Apache, Filebeat, Logstash, Auditd, and PostgreSQL to capture and analyze attacks in real time.

---

## Architecture

```
TODO: Insert picture of the system architecture
```

**Backend:** Java + Spring Boot
**Frontend:** React  
**Database:** PostgreSQL (managed via DBeaver)  
**Architecture:** REST + JPA

---

## Prerequisites

- Ubuntu VM (honeypot machine)
- Kali VM (optional, for attacking the honeypot)
- External machine running PostgreSQL
- Java, Spring Boot, React for the platform

---

## Step 0 — Firewall the Database

Only allow connections from the honeypot machine IP to PostgreSQL.

---

## Step 1 — PostgreSQL Setup

1. Install PostgreSQL and connect via DBeaver.
2. Create the database and tables:

```sql
CREATE DATABASE honeypot_logs;

CREATE TABLE attacks (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMP,
    attacker_ip TEXT,
    http_method TEXT,
    endpoint TEXT,
    status_code INTEGER,
    user_agent TEXT,
    raw_log TEXT
);

CREATE TABLE auth_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP,
    username TEXT,
    source_ip TEXT,
    status TEXT,
    raw_log TEXT
);

CREATE TABLE command_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP,
    command TEXT,
    raw_log TEXT
);
```

3. Allow the VM to connect to PostgreSQL:
   - In `postgresql.conf`: set `listen_addresses = '*'`
   - In `pg_hba.conf`: add `host all all 10.0.2.0/24 md5` in `IPv4 local connections`
     > Use the whole subnet `10.0.2.0/24` instead of a single IP, because the VM is behind NAT and its IP can change.
   - Restart PostgreSQL after changes.

---

## Step 2 — Install Apache

```bash
sudo apt install apache2 -y
```

Logs are written to:
- `/var/log/apache2/access.log`
- `/var/log/apache2/error.log`

---

## Step 3 — Install Filebeat

1. Add the Elastic repository and install Filebeat.
2. Configure `/etc/filebeat/filebeat.yml`:

```yaml
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
```

> `bulk_max_size: 1` and `timeout: 5` are key for reducing shipping delay.

---

## Step 4 — Install Logstash & JDBC Driver

```bash
sudo apt install logstash -y
cd /usr/share/logstash
sudo wget https://jdbc.postgresql.org/download/postgresql-42.7.3.jar
```

---

## Step 5 — Configure Environment Variables

Instead of hardcoding database credentials in the Logstash config, store them in an environment file.

1. Create the `.env` file on the VM:

```bash
sudo nano /etc/logstash/.env
```

Add your actual values:

```
DB_HOST=<your_db_host>
DB_PORT=5432
DB_NAME=<your_db_name>
DB_USER=<your_db_user>
DB_PASSWORD=<your_db_password>
```

2. Secure the file so only root can read it:

```bash
sudo chmod 600 /etc/logstash/.env
sudo chown logstash:logstash /etc/logstash/.env
```

3. Tell systemd to load the `.env` file when starting Logstash:

```bash
sudo systemctl edit logstash
```

Add:

```ini
[Service]
EnvironmentFile=/etc/logstash/.env
Restart=always
RestartSec=1

[Unit]
RefuseManualStop=yes
```

4. Reload systemd:

```bash
sudo systemctl daemon-reload
```

> The `.env` file should never be committed to version control. Add it to `.gitignore`. Use `.env.example` to see the expected format without real values.

---

## Step 6 — Configure Logstash Pipeline

Create `/etc/logstash/conf.d/honeypot.conf`:

```ruby
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
          # Failed login attempt
          "%{SYSLOGTIMESTAMP:log_timestamp} %{NOTSPACE:hostname} sshd\[%{POSINT:pid}\]: Failed %{WORD:auth_method} for (?:invalid user )?%{WORD:username} from %{IPV4:source_ip}",

          # Invalid user
          "%{SYSLOGTIMESTAMP:log_timestamp} %{NOTSPACE:hostname} sshd\[%{POSINT:pid}\]: Invalid user %{WORD:username} from %{IPV4:source_ip}",

          # Successful login
          "%{SYSLOGTIMESTAMP:log_timestamp} %{NOTSPACE:hostname} sshd\[%{POSINT:pid}\]: Accepted %{WORD:auth_method} for %{WORD:username} from %{IPV4:source_ip}",

          # User disconnected
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
```

Key notes:
- `${DB_HOST}`, `${DB_PORT}`, `${DB_NAME}`, `${DB_USER}`, `${DB_PASSWORD}` are loaded from `/etc/logstash/.env` via the systemd `EnvironmentFile` directive. Logstash natively supports `${VARIABLE_NAME}` syntax in config files.
- `?::timestamp` casts the Logstash `@timestamp` string to a PostgreSQL TIMESTAMP type.
- `?::integer` casts the HTTP status code string to INTEGER.
- The `_grokparsefailure` drop ensures malformed or irrelevant log lines are discarded.

---

## Step 7 — Install and Configure Auditd

```bash
sudo apt install auditd audispd-plugins -y
sudo systemctl enable auditd
sudo systemctl start auditd
```

Edit `/etc/audit/rules.d/audit.rules`:

```
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
```

> `-e 2` at the end locks the audit rules — they cannot be changed without a reboot, even by root.

Reload rules:
```bash
sudo systemctl restart auditd
sudo auditctl -l   # verify rules are loaded
sudo auditctl -s | grep enabled   # verify auditing is enabled
```

---

## Step 8 — Install OpenSSH

```bash
sudo apt install openssh-server -y
```

Enable verbose SSH logging by adding to `/etc/ssh/sshd_config`:

```
LogLevel VERBOSE
SyslogFacility AUTH
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

---

## Step 9 — SSH Login Tracking

SSH login attempts are tracked via `auth.log` and stored in the `auth_logs` table. The `status` column has the following values:

| Status | Meaning |
|---|---|
| `FAILED` | Wrong password or cancelled attempt |
| `INVALID_USER` | Username does not exist on the system |
| `SUCCESS` | Successful login |
| `DISCONNECTED` | Clean logout or dropped connection |

Test with:
```bash
ssh invaliduser@localhost   # INVALID_USER + FAILED
ssh ubuntu@localhost        # SUCCESS (correct password) or FAILED (wrong password)
```

---

## Step 10 — Secure the Processes

Make Logstash, Filebeat, and Auditd restart automatically and refuse manual stops.

The Logstash override was already created in Step 5. For Filebeat and Auditd:

```bash
sudo systemctl edit filebeat
sudo systemctl edit auditd
```

Add to each:

```ini
[Service]
Restart=always
RestartSec=1

[Unit]
RefuseManualStop=yes
```

Reload and restart all services:
```bash
sudo systemctl daemon-reload
```

Make the Logstash config file immutable so it cannot be modified or deleted even by root:
```bash
sudo chattr +i /etc/logstash/conf.d/honeypot.conf
```

To temporarily remove the immutable flag when you need to make changes:
```bash
sudo chattr -i /etc/logstash/conf.d/honeypot.conf
# make your changes
sudo chattr +i /etc/logstash/conf.d/honeypot.conf
```

> Even if an attacker gets root access, logs are already being shipped to the external database in real time. The few seconds shipping window makes it extremely difficult to cover tracks.