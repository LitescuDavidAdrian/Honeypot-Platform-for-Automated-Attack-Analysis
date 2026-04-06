# Honeypot-Platform-for-Automated-Attack-Analysis

A hybrid honeypot with dynamic operational behavior. The platform captures, stores, and analyzes attacks in real time, combining a low-interaction honeypot running on an Ubuntu VM with a web dashboard built in Spring Boot and React.

The honeypot is low-interaction but changes its behavior corresponding to the operational mode — research or production.

---

## Project Structure

```
Honeypot-Platform-for-Automated-Attack-Analysis/
├── backend/        ← Spring Boot REST API (Java 21)
├── frontend/       ← React web dashboard
├── setup.md        ← Full honeypot setup and configuration guide
├── .env.example    ← Environment variable template
└── README.md
```

---

## Architecture

### Part 1 — Honeypot (Ubuntu VM)

The honeypot runs on an Ubuntu virtual machine. It exposes an Apache web server and an SSH service, capturing attacks through system logs which are shipped in real time to an external PostgreSQL database.

```
Attacker
   │
   ▼
Vulnerable Web App (Apache) / SSH Service
   │
   ▼
System Logs (access.log / auth.log / audit.log)
   │
   ▼
Filebeat
   │
   ▼
Logstash
   │
   ▼
PostgreSQL (external database)
   │
   ▼
Spring Boot Honeypot Platform
```

**Components:**
- **Apache HTTP Server** — generates web access logs from the vulnerable app
- **OpenSSH** — captures login attempts and brute force attacks
- **Auditd** — tracks all commands executed on the system
- **Filebeat** — ships logs in real time to Logstash
- **Logstash** — parses logs and forwards them to PostgreSQL
- **PostgreSQL** — external database storing all captured attack data

**Data captured:**

| Table | Description |
|---|---|
| `attacks` | HTTP requests to the Apache web server |
| `auth_logs` | SSH login attempts (FAILED, INVALID_USER, SUCCESS, DISCONNECTED) |
| `command_logs` | Commands executed on the system via sudo |

### Part 2 — Web Dashboard

A web application for visualizing and analyzing the captured attack data in real time.

```
Web Dashboard (React)
   │
   ▼
REST API (Spring Boot)
   │
   ▼
Data Access Layer (JPA)
   │
   ▼
PostgreSQL Database
```

**Tech stack:**
- **Backend:** Java 21 + Spring Boot 3.5.13
- **Frontend:** React
- **Database:** PostgreSQL
- **Architecture:** REST + JPA

**Features:**
- Real-time attack data visualization
- Filtering and searching across all three log tables
- SSH login attempt tracking with status classification
- Command execution history
- Web attack log analysis

---

## Prerequisites

- Ubuntu VM (honeypot machine)
- Kali VM (optional, for simulating attacks)
- Windows/Linux machine running PostgreSQL
- Java 21 + Maven (for the backend)
- Node.js (for the frontend)

---

## Getting Started

### Honeypot Setup

See [setup.md](setup.md) for the full step-by-step guide to setting up the honeypot on the Ubuntu VM, including Apache, Filebeat, Logstash, Auditd, OpenSSH, and PostgreSQL configuration.

### Backend Setup

1. Navigate to the `backend/` folder and open it in IntelliJ IDEA.
2. Copy `.env.example` to `.env` and fill in your database credentials.
3. Add the environment variables to your IntelliJ run configuration.
4. Run `BackendApplication.java`.

The backend will start on `http://localhost:8080`.

### Frontend Setup

Coming soon.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
DB_HOST=your_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

---

## Security

- Database credentials are stored in `.env` and never hardcoded
- Logstash, Filebeat, and Auditd are configured to restart automatically and refuse manual stops
- Audit rules are locked with `-e 2` — cannot be modified without a reboot
- The Logstash config file is made immutable with `chattr +i`
- Logs are shipped to the external database in real time, making it extremely difficult for an attacker to cover their tracks even with root access

---

## TODO

- [ ] Complete the React frontend
- [ ] Add attack analysis and pattern detection
- [ ] Live testing with Kali VM attacking the honeypot
- [ ] Maybe add a keylogger
- [ ] Change the system architecture diagram
