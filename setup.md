# Honeypot Setup & Configuration

A hybrid honeypot with dynamic operational behavior. Low-interaction, built on Ubuntu VM, using Apache, DVWA, ModSecurity, Filebeat, Logstash, Auditd, and PostgreSQL to capture and analyze attacks in real time.

---

## Architecture

<p align="center">
  <img src="HoneypotSystemArchitecture.png" width="800"/>
</p>

---

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
    raw_log TEXT,
    payload TEXT
);

CREATE TABLE auth_logs (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMP,
    username TEXT,
    source_ip TEXT,
    status TEXT,
    raw_log TEXT
);

CREATE TABLE command_logs (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMP,
    command TEXT,
    raw_log TEXT
);
```

3. Create the PostgreSQL triggers for real-time SSE notifications:

```sql
CREATE OR REPLACE FUNCTION notify_insert()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(TG_TABLE_NAME, 'insert');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attacks_notify
AFTER INSERT ON attacks
FOR EACH ROW EXECUTE FUNCTION notify_insert();

CREATE TRIGGER attacks_update_notify
AFTER UPDATE ON attacks
FOR EACH ROW EXECUTE FUNCTION notify_insert();

CREATE TRIGGER auth_logs_notify
AFTER INSERT ON auth_logs
FOR EACH ROW EXECUTE FUNCTION notify_insert();

CREATE TRIGGER command_logs_notify
AFTER INSERT ON command_logs
FOR EACH ROW EXECUTE FUNCTION notify_insert();
```

> These triggers fire a `pg_notify` event whenever a new row is inserted or updated, which the Spring Boot backend listens for via PostgreSQL `LISTEN/NOTIFY` to push real-time updates to the frontend via SSE. The UPDATE trigger on the attacks table ensures the frontend updates instantly when ModSecurity adds the payload to a request.


4. Allow the VM to connect to PostgreSQL:
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

## Step 3 — Install and Configure DVWA

DVWA (Damn Vulnerable Web Application) is the intentionally vulnerable web application used to attract and capture attacks. It runs on Apache + PHP + MariaDB and exposes multiple categories of web vulnerabilities (SQL Injection, XSS, Command Injection, Brute Force, File Upload, etc.).

1. Install dependencies:

```bash
sudo apt install git php php-mysqli php-gd libapache2-mod-php mariadb-server -y
```

2. Clone DVWA into Apache's web root:

```bash
cd /var/www/html
sudo git clone https://github.com/digininja/DVWA.git
sudo chown -R www-data:www-data DVWA
sudo chmod -R 755 DVWA
```

3. Set up the DVWA database:

```bash
sudo mysql
```

In the MariaDB prompt:

```sql
CREATE DATABASE dvwa;
CREATE USER 'dvwa'@'localhost' IDENTIFIED BY 'p@ssw0rd';
GRANT ALL PRIVILEGES ON dvwa.* TO 'dvwa'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

4. Configure DVWA:

```bash
sudo cp /var/www/html/DVWA/config/config.inc.php.dist /var/www/html/DVWA/config/config.inc.php
sudo nano /var/www/html/DVWA/config/config.inc.php
```

Make sure these values match:

```php
$_DVWA[ 'db_user' ]     = 'dvwa';
$_DVWA[ 'db_password' ] = 'p@ssw0rd';
$_DVWA[ 'db_database' ] = 'dvwa';
```

5. Adjust PHP settings DVWA needs:

```bash
sudo nano /etc/php/*/apache2/php.ini
```

Set:
```
allow_url_include = On
allow_url_fopen = On
```

6. Restart Apache:

```bash
sudo systemctl restart apache2
```

7. Initialize DVWA — open `http://localhost/DVWA/setup.php` from the VM and click **Create / Reset Database**. Then log in at `http://localhost/DVWA/login.php` with `admin` / `password`.

> The default DVWA security level is `Impossible`. Set it to `Low` from the attacker's machine (Kali) to enable exploitable vulnerabilities for testing. Set it back to `Impossible` when not in use.

---

## Step 4 — Install and Configure ModSecurity
 
ModSecurity is a Web Application Firewall (WAF) module for Apache that captures full HTTP request bodies, including POST payloads. This allows the honeypot to capture attack payloads (SQL injection, XSS, command injection etc.) instead of just URLs.
 
```bash
sudo apt install libapache2-mod-security2 -y
sudo a2enmod security2
```
 
Set up the ModSecurity config:
 
```bash
sudo cp /etc/modsecurity/modsecurity.conf-recommended /etc/modsecurity/modsecurity.conf
sudo nano /etc/modsecurity/modsecurity.conf
```
 
Make the following changes:
- Confirm `SecRuleEngine DetectionOnly` (the default — do NOT change to `On` for this setup)
- Change `SecAuditEngine RelevantOnly` to `SecAuditEngine On`
- Confirm `SecAuditLogParts` includes `I` (request body) — for example: `SecAuditLogParts ABIJDEFHZ`
- Confirm `SecAuditLog /var/log/apache2/modsec_audit.log`
- Confirm `SecAuditLogType Serial`

> **Why DetectionOnly?** A typical WAF runs in `On` mode to block detected attacks. For a honeypot, we want the opposite — let attacks through so they reach the vulnerable application, but log them with full payloads. `DetectionOnly` mode logs every transaction (including request bodies) without interfering with the response. If ModSecurity is set to `On`, attack payloads like `;whoami`, `cat /etc/passwd`, or SQL injection strings will be blocked with a 403 before reaching DVWA, breaking the honeypot demonstration.

Restart Apache:
```bash
sudo systemctl restart apache2
```
 
Test with a POST request:
```bash
curl -X POST -d "username=admin&password=test123" http://localhost
sudo tail -50 /var/log/apache2/modsec_audit.log
```
 
You should see the request body inside section `--<id>-C--` of the audit log.
 
---

## Step 5 — Install Filebeat

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
    close_inactive: 1s

  - type: log
    enabled: true
    paths:
      - /var/log/apache2/modsec_audit.log
    scan_frequency: 1s
    close_inactive: 1s
    multiline.pattern: '^--[a-f0-9]+-A--'
    multiline.negate: true
    multiline.match: after

output.logstash:
  hosts: ["localhost:5044"]
  bulk_max_size: 1
  timeout: 5
```

> `bulk_max_size: 1` and `timeout: 5` are key for reducing shipping delay. The multiline configuration on `modsec_audit.log` ensures each ModSecurity transaction (which spans multiple lines) is treated as a single event.

---

## Step 6 — Install Logstash & JDBC Driver

```bash
sudo apt install logstash -y
cd /usr/share/logstash
sudo wget https://jdbc.postgresql.org/download/postgresql-42.7.3.jar
sudo /usr/share/logstash/bin/logstash-plugin install logstash-output-jdbc
```

> The `logstash-output-jdbc` plugin is community-maintained and not bundled with Logstash by default. It can also be wiped during Logstash package upgrades — to prevent this, you can hold the package: `sudo apt-mark hold logstash`.

---

## Step 7 — Configure Environment Variables

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
sudo chattr +i /etc/logstash/.env
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

## Step 8 — Configure Logstash Pipeline

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
          if msg.include?("type=USER_CMD")
            hex_match = msg.match(/cmd=([0-9A-Fa-f]+)/)
            if hex_match
              hex_str = hex_match[1]
              decoded = [hex_str].pack("H*").encode("UTF-8", invalid: :replace, undef: :replace, replace: "?")
              event.set("command", "sudo " + decoded)
            else
              quoted_match = msg.match(/cmd="([^"]+)"/)
              event.set("command", quoted_match ? "sudo " + quoted_match[1] : nil)
            end
          elsif msg.include?("type=EXECVE") && msg.include?("local6")
            a3_match = msg.match(/a3=([0-9A-Fa-f]+)/)
            if a3_match
              decoded = [a3_match[1]].pack("H*").encode("UTF-8", invalid: :replace, undef: :replace, replace: "?")
              bash_cmd_match = decoded.match(/BASH_CMD: \w+ \[\d+\]: (.+)/)
              if bash_cmd_match
                command = bash_cmd_match[1]
                event.set("command", command)
                if command.start_with?("sudo ")
                  event.set("is_sudo", "true")
                end
              end
            end
          end
        end
      '
    }
 
  } else if [log][file][path] == "/var/log/apache2/modsec_audit.log" {
    ruby {
      code => '
        msg = event.get("message")
        if msg
          # Extract section A (timestamp and connection info)
          a_match = msg.match(/--[a-f0-9]+-A--\n\[([^\]]+)\] \S+ (\S+) \d+ \S+ \d+/)
          if a_match
            event.set("modsec_timestamp", a_match[1])
            event.set("modsec_ip", a_match[2])
          end
 
          # Extract section B (request line)
          b_match = msg.match(/--[a-f0-9]+-B--\n(\S+) (\S+) \S+/)
          if b_match
            event.set("modsec_method", b_match[1])
            event.set("modsec_endpoint", b_match[2])
          end
 
          # Extract section C (request body / payload)
          c_match = msg.match(/--[a-f0-9]+-C--\n(.+?)\n--[a-f0-9]+-[A-Z]--/m)
          if c_match
            event.set("payload", c_match[1].strip)
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
    if "type=USER_CMD" in [message] or ("local6" in [message] and [is_sudo] != "true") {
      if [command] {
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
  } else if [log][file][path] == "/var/log/apache2/modsec_audit.log" {
    if [payload] and [modsec_ip] and [modsec_endpoint] {
      jdbc {
        driver_jar_path => "/usr/share/logstash/postgresql-42.7.3.jar"
        driver_class => "org.postgresql.Driver"
        connection_string => "jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}"
        username => "${DB_USER}"
        password => "${DB_PASSWORD}"
        statement => [
          "UPDATE attacks SET payload = ? WHERE id = (SELECT id FROM attacks WHERE attacker_ip = ? AND endpoint = ? AND http_method = 'POST' AND payload IS NULL AND timestamp >= NOW() - INTERVAL '10 seconds' ORDER BY timestamp DESC, id DESC LIMIT 1)",
          "payload",
          "modsec_ip",
          "modsec_endpoint"
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
- Sudo commands are captured via `USER_CMD` with a `"sudo "` prefix. Regular user commands are captured via auditd EXECVE events for the `logger` process and deduplicated to avoid double-logging sudo commands.
- POST payloads are captured by ModSecurity into `modsec_audit.log`, parsed by Logstash, and used to UPDATE the matching `attacks` row. The match targets the most recent `POST` request from the same `attacker_ip` and `endpoint` within a short time window, ensuring that GET requests sharing the same endpoint are never assigned a payload. The PostgreSQL UPDATE trigger then fires an SSE event so the dashboard refreshes with the payload.

---

## Step 9 — Install and Configure Auditd

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
-a always,exit -F arch=b64 -S execve -F auid>=1000 -F uid>=1000 -k user_commands
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

## Step 10 — Configure Bash Command Logging
 
To capture all commands typed by real users (not just sudo commands), configure bash to log every command via syslog.
 
1. Add to `/etc/bash.bashrc` at the very end:
```bash
export PROMPT_COMMAND='logger -p local6.debug "BASH_CMD: $(whoami) [$$]: $(history 1 | sed "s/^[ ]*[0-9]*[ ]*//")"'
```
 
2. Create `/etc/rsyslog.d/bash.conf`:
```
local6.* /var/log/bash_commands.log
```
 
3. Restart rsyslog:
```bash
sudo systemctl restart rsyslog
```
 
> This logs every command typed in a bash session to syslog. Logstash captures these via auditd's EXECVE events for the `logger` process, extracts the command from the hex-encoded `a3` argument, and inserts it into `command_logs`. Sudo commands are deduplicated — they are captured via `USER_CMD` and excluded from the bash logging path.
 
> Note: Bash command logging only applies to new terminal sessions opened after `/etc/bash.bashrc` has been modified.
 
---

## Step 11 — Install OpenSSH

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

## Step 12 — SSH Login Tracking

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

## Step 13 — Secure the Processes

Make Logstash, Filebeat, and Auditd restart automatically and refuse manual stops.

The Logstash override was already created in Step 6. For Filebeat and Auditd:

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

Make the Logstash and Filebeat config files immutable so they cannot be modified or deleted even by root:
```bash
sudo chattr +i /etc/logstash/conf.d/honeypot.conf
sudo chattr +i /etc/filebeat/filebeat.yml
```

To temporarily remove the immutable flag when you need to make changes:
```bash
sudo chattr -i /etc/logstash/conf.d/honeypot.conf
sudo chattr -i /etc/filebeat/filebeat.yml
sudo chattr -i /etc/logstash/.env
# make your changes
sudo chattr +i /etc/logstash/conf.d/honeypot.conf
sudo chattr +i /etc/filebeat/filebeat.yml
sudo chattr +i /etc/logstash/.env
```

> Even if an attacker gets root access, logs are already being shipped to the external database in real time. The few seconds shipping window makes it extremely difficult to cover tracks.