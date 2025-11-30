# 🔧 Environment File Loading Strategy

## **Problem Statement**

```bash
# ❌ OLD CODE (BROKEN):
if err := godotenv.Load(".env"); err != nil {
    log.Println("config: .env not found, using OS env only")
}

# Problem:
# - Hardcoded to .env only
# - Production uses .env.production
# - File won't be loaded in production! ❌
```

---

## **✅ NEW Solution: Priority-Based Loading**

### **Priority Order:**

```
1️⃣ .env.production  → Production deployment
2️⃣ .env             → Local development
3️⃣ OS environment   → Fallback (container/systemd)
```

### **Implementation:**

```go
// internal/config/config.go
func Init() {
    once.Do(func() {
        // Try production first
        if err := godotenv.Load(".env.production"); err == nil {
            log.Println("✅ config: loaded .env.production")
            return
        }
        
        // Try development next
        if err := godotenv.Load(".env"); err == nil {
            log.Println("✅ config: loaded .env (development)")
            return
        }
        
        // Fallback to OS environment
        log.Println("⚠️  config: no .env file found, using OS environment only")
    })
}
```

---

## **📋 Environment File Structure**

### **Development (Local):**

```
nexuslink/
  ├── .env                    # Development config
  ├── .env.example            # Template for development
  └── cmd/api/main.go
```

**File:** `.env`
```bash
NEXUS_DYNAMO_ENDPOINT=http://localhost:8000  # Local DynamoDB
NEXUS_AWS_REGION=ap-southeast-1
NEXUS_API_PORT=8080
NEXUS_API_KEY=dev-key-123
NEXUS_REDIS_ADDR=localhost:6379
NEXUS_REDIS_PASSWORD=devpass
```

**Start:**
```bash
cd nexuslink
go run cmd/api/main.go
# ✅ Loads .env automatically
```

---

### **Production (VPS):**

```
/home/ubuntu/nexuslink-project/nexuslink/
  ├── .env.production         # Production config
  ├── .env.api.example        # Template for production
  └── cmd/api/main.go
```

**File:** `.env.production`
```bash
NEXUS_DYNAMO_ENDPOINT=                       # AWS DynamoDB
NEXUS_AWS_REGION=ap-southeast-1
NEXUS_API_PORT=8080
NEXUS_API_KEY=a7b8c9d0e1f2g3h4...          # Strong 32-char key
NEXUS_REDIS_ADDR=localhost:6379
NEXUS_REDIS_PASSWORD=prod-strong-password
```

**SystemD Service:**
```ini
[Service]
WorkingDirectory=/home/ubuntu/nexuslink-project/nexuslink
ExecStart=/usr/local/bin/nexuslink-api
# NO EnvironmentFile needed! ✅
# Code automatically loads .env.production
```

**Start:**
```bash
sudo systemctl start nexuslink-api
# ✅ Loads .env.production automatically
```

---

### **Container/Docker:**

```
docker run -e NEXUS_API_KEY=xxx -e NEXUS_REDIS_ADDR=xxx nexuslink-api
# ✅ Uses OS environment (no .env file needed)
```

---

## **🎯 Why This Works**

### **Scenario 1: Local Development**

```bash
cd /home/natama/Projects/nexuslink
ls -la .env*
# .env          ← This exists
# .env.example
# .env.api.example

go run cmd/api/main.go
# Output: ✅ config: loaded .env (development)
```

✅ **Uses local DynamoDB, dev credentials**

---

### **Scenario 2: Production VPS**

```bash
cd /home/ubuntu/nexuslink-project/nexuslink
ls -la .env*
# .env.production    ← This exists
# .env.api.example

/usr/local/bin/nexuslink-api
# Output: ✅ config: loaded .env.production
```

✅ **Uses AWS DynamoDB, production credentials**

---

### **Scenario 3: Docker/Kubernetes**

```bash
# No .env files in container
docker run \
  -e NEXUS_API_KEY=prod-key \
  -e NEXUS_DYNAMO_ENDPOINT= \
  -e NEXUS_REDIS_ADDR=redis:6379 \
  nexuslink-api

# Output: ⚠️  config: no .env file found, using OS environment only
```

✅ **Uses environment variables from container runtime**

---

## **📝 File Naming Convention**

| File | Purpose | Committed to Git? |
|------|---------|-------------------|
| `.env` | Local development config | ❌ NO (in .gitignore) |
| `.env.production` | Production config | ❌ NO (in .gitignore) |
| `.env.example` | Development template | ✅ YES |
| `.env.api.example` | Production API template | ✅ YES |
| `.env.dashboard.example` | Production Dashboard template | ✅ YES |

---

## **🔐 Security Best Practices**

### **✅ DO:**

```bash
# 1. Copy template
cp .env.api.example .env.production

# 2. Generate strong keys
openssl rand -hex 32

# 3. Set proper permissions
chmod 600 .env.production

# 4. Verify it's ignored
git status | grep .env.production
# Should NOT appear in "Changes to be committed"
```

### **❌ DON'T:**

```bash
# ❌ Never commit production secrets
git add .env.production

# ❌ Never hardcode credentials
NEXUS_API_KEY="hardcoded-key-in-code"

# ❌ Never share .env.production file
scp .env.production colleague@server
```

---

## **🧪 Testing Environment Loading**

### **Test 1: Local Development**

```bash
cd /home/natama/Projects/nexuslink

# Create test .env
cat > .env <<EOF
NEXUS_API_KEY=test-dev-key
NEXUS_API_PORT=8080
EOF

# Run API
go run cmd/api/main.go

# Expected output:
# ✅ config: loaded .env (development)
# Nexus API starting...
```

### **Test 2: Production File**

```bash
cd /home/natama/Projects/nexuslink

# Create production file (higher priority)
cat > .env.production <<EOF
NEXUS_API_KEY=test-prod-key
NEXUS_API_PORT=8080
EOF

# Run API
go run cmd/api/main.go

# Expected output:
# ✅ config: loaded .env.production
# Nexus API starting...

# Clean up
rm .env.production
```

### **Test 3: OS Environment Only**

```bash
cd /home/natama/Projects/nexuslink

# Rename .env temporarily
mv .env .env.backup

# Set via OS
export NEXUS_API_KEY=test-os-key
export NEXUS_API_PORT=8080

# Run API
go run cmd/api/main.go

# Expected output:
# ⚠️  config: no .env file found, using OS environment only
# Nexus API starting...

# Restore
mv .env.backup .env
```

---

## **🚀 Deployment Workflow**

### **VPS Setup (Automated):**

```bash
# 1. Run setup script
curl -fsSL https://raw.githubusercontent.com/.../VPS1_API_SETUP.sh | bash

# Script automatically:
# ✅ Creates .env.production
# ✅ Sets proper permissions
# ✅ Configures systemd service (NO EnvironmentFile directive)
# ✅ Binary loads .env.production at runtime
```

### **Manual Deployment:**

```bash
# 1. SSH to VPS
ssh ubuntu@api.htmlin.my.id

# 2. Clone repo
git clone https://github.com/afuzapratama/nexuslink-project.git
cd nexuslink-project/nexuslink

# 3. Create production config
cp .env.api.example .env.production
nano .env.production
# Fill in production values

# 4. Build binary
go build -o /usr/local/bin/nexuslink-api cmd/api/main.go

# 5. Start service
sudo systemctl start nexuslink-api

# 6. Check logs
sudo journalctl -u nexuslink-api -n 20
# Should show: ✅ config: loaded .env.production
```

---

## **🐛 Troubleshooting**

### **Problem: "config: no .env file found"**

```bash
# Check file exists
ls -la .env.production .env

# Check working directory
pwd
# Should be: /home/ubuntu/nexuslink-project/nexuslink

# Check systemd WorkingDirectory
sudo systemctl cat nexuslink-api | grep WorkingDirectory
# Should match pwd
```

### **Problem: "Using wrong environment"**

```bash
# Check which file exists
ls -la .env*

# Priority order:
# 1. .env.production (loads first if exists)
# 2. .env (loads second)
# 3. OS env (fallback)

# If both exist, .env.production wins
```

### **Problem: "Permission denied"**

```bash
# Check file permissions
ls -la .env.production
# Should be: -rw------- (600)

# Fix permissions
chmod 600 .env.production
chown ubuntu:ubuntu .env.production
```

---

## **📊 Comparison: Old vs New**

### **❌ OLD (Broken):**

| Environment | File Used | Result |
|-------------|-----------|--------|
| Development | `.env` | ✅ Works |
| Production | `.env.production` | ❌ **NOT LOADED!** |
| Container | OS env | ❌ **Ignored!** |

**Problems:**
- Hardcoded `.env` filename
- Production config ignored
- Required SystemD `EnvironmentFile` workaround

### **✅ NEW (Fixed):**

| Environment | File Used | Result |
|-------------|-----------|--------|
| Development | `.env` | ✅ Auto-loaded |
| Production | `.env.production` | ✅ **Auto-loaded!** |
| Container | OS env | ✅ **Auto-loaded!** |

**Benefits:**
- ✅ Priority-based loading
- ✅ No SystemD workarounds needed
- ✅ Works in all environments
- ✅ Clean separation of configs

---

## **💡 Summary**

### **Key Changes:**

1. ✅ **Config loader updated** - Priority: `.env.production` → `.env` → OS env
2. ✅ **SystemD service simplified** - Removed `EnvironmentFile` directive
3. ✅ **Three separate templates** - API, Dashboard, Agent configs
4. ✅ **Clear separation** - Dev vs Prod environments

### **Production Ready:**

```bash
# VPS 1: API Server
.env.production  ← API config only

# VPS 2: Dashboard
.env.production  ← Dashboard config only

# VPS 3-22: Agents
# NO .env file! Uses installer flags
```

### **Development:**

```bash
# Local machine
.env  ← Full development config
```

**Now everything works seamlessly in all environments!** 🎉
