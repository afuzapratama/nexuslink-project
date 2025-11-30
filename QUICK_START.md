# 🚀 NexusLink - Quick Start Guide

## Run Services di Terminal Terpisah

### Terminal 1: API Server
```bash
cd /home/natama/Projects/nexuslink
bash scripts/start-api.sh
```
**Port:** 8080  
**Logs:** Akan tampil langsung di terminal ini

---

### Terminal 2: Agent/Redirector
```bash
cd /home/natama/Projects/nexuslink
bash scripts/start-agent.sh
```
**Port:** 9090  
**Logs:** Akan tampil langsung di terminal ini

---

### Terminal 3: Dashboard (Next.js)
```bash
cd /home/natama/Projects/nexuslink-dashboard
bash scripts/start-dashboard.sh
```
**Port:** 3000 (atau 3001 jika 3000 terpakai)  
**Logs:** Akan tampil langsung di terminal ini

---

## Prerequisites (Harus Running Dulu)

### Docker Services
```bash
cd /home/natama/Projects/nexuslink
docker-compose up -d
```

Services yang akan start:
- **DynamoDB Local** → port 8000
- **DynamoDB Admin** → port 8001 (http://localhost:8001)
- **Redis** → port 6379

---

## Testing Rate Limit Analytics

### 1. Generate Test Data
```bash
# Kirim 40 requests untuk trigger rate limiting
for i in {1..40}; do 
  curl -s "http://localhost:9090/r/test-link" > /dev/null 2>&1
done
```

### 2. Check Redis
```bash
redis-cli -a devpass --no-auth-warning KEYS "ratelimit:*"
```

### 3. Open Dashboard
```
http://localhost:3000/rate-limits
```
atau
```
http://localhost:3001/rate-limits
```

---

## Quick Commands

### Stop All
```bash
# Stop Go processes
pkill -f "go run cmd/api"
pkill -f "go run cmd/agent"

# Stop Dashboard
pkill -f "next dev"

# Stop Docker
cd /home/natama/Projects/nexuslink
docker-compose down
```

### Check Ports
```bash
lsof -i :8080  # API
lsof -i :9090  # Agent
lsof -i :3000  # Dashboard
lsof -i :8000  # DynamoDB
lsof -i :6379  # Redis
```

### View Logs
Logs langsung tampil di terminal masing-masing service.

---

## Troubleshooting

### Port Already in Use
```bash
# Kill specific port
lsof -ti:8080 | xargs kill -9  # API
lsof -ti:9090 | xargs kill -9  # Agent
lsof -ti:3000 | xargs kill -9  # Dashboard
```

### Redis Not Connected
```bash
# Check Redis
redis-cli -a devpass ping

# Restart Redis
docker-compose restart redis
```

### DynamoDB Not Available
```bash
# Check DynamoDB
curl http://localhost:8000

# Restart DynamoDB
docker-compose restart dynamodb-local
```

---

## Development URLs

- **Dashboard:** http://localhost:3000
- **API Health:** http://localhost:8080/health
- **Agent Health:** http://localhost:9090/health
- **DynamoDB Admin:** http://localhost:8001
- **Test Redirect:** http://localhost:9090/r/{alias}

---

## Features Access

- **Links Management:** http://localhost:3000/links
- **Link Groups:** http://localhost:3000/groups
- **Nodes Management:** http://localhost:3000/nodes
- **Rate Limit Analytics:** http://localhost:3000/rate-limits ← NEW!
- **Settings:** http://localhost:3000/settings
