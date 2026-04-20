# 🚀 TaskFlow — 3-Tier Full Stack Application (Dockerized)

![Docker](https://img.shields.io/badge/Docker-Containerized-blue?logo=docker)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=node.js)
![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen?logo=mongodb)
![NGINX](https://img.shields.io/badge/Server-NGINX-darkgreen?logo=nginx)

---

## 📌 Overview

**TaskFlow** is a **production-style 3-tier application** built using:

* ⚛️ Frontend — React (served via NGINX)
* 🟢 Backend — Node.js + Express
* 🍃 Database — MongoDB
* 🐳 Fully containerized using Docker & Docker Compose

This project demonstrates real-world DevOps practices including:

* Multi-container architecture
* Service-to-service communication
* Environment-based configuration
* Health checks & persistence

---

## 🏗️ Architecture

```
[ React Frontend ]  →  [ Node.js Backend ]  →  [ MongoDB ]
(NGINX)              (API)              (DB)
```

---

## ⚙️ Prerequisites

Make sure you have installed:

* Docker
* Docker Compose (comes with Docker Desktop)

---

## 📥 Setup & Run

### 🔹 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

---

### 🔹 2. Run the Application

#### ▶️ First time (build images)

```bash
docker compose up --build
```

#### ▶️ Run in background (recommended)

```bash
docker compose up -d
```

---

## 🌐 Access the Application

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:5000        |
| Health   | http://localhost:5000/health |

---

## 🛑 Stop the Application

```bash
docker compose down
```

---

## 🧹 Clean Up (Remove Volumes)

```bash
docker compose down -v
```

---

## 🔍 Useful Commands

```bash
docker ps
docker logs taskflow-backend
docker logs taskflow-mongodb
docker logs taskflow-frontend
```

---

## ⚠️ Troubleshooting

### ❌ Port already in use

```bash
sudo lsof -i :3000
```

Kill the process or update ports in `docker-compose.yml`.

---

### ❌ Docker not running

```bash
sudo systemctl start docker
```

---

### ❌ Reset everything

```bash
docker compose down -v
docker system prune -a
docker compose up --build
```

---

## 🧠 Key Configurations

* Backend connects to MongoDB using:
  ```
  mongodb://mongodb:27017/taskflow
  ```

* Frontend connects to backend using:
  ```
  backend:5000
  ```

✔️ Works via Docker internal networking

---

## 📦 Features

* ✅ 3-Tier Architecture
* ✅ Dockerized Services
* ✅ NGINX Reverse Proxy
* ✅ Health Checks
* ✅ Persistent Storage (Volumes)
* ✅ Environment Variables

---

## 🚀 Future Enhancements

* Kubernetes Deployment (K8s)
* CI/CD Pipeline (GitHub Actions)
* Cloud Deployment (AWS / Azure / GCP)
* Monitoring (Prometheus + Grafana)

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repo and submit a PR.

---


---

## 👨‍💻 Author

Developed by **Yelti Bhavith Reddy**

---

⭐ If you like this project, give it a star!

