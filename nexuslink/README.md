# 🔗 NexusLink - Distributed URL Shortener

**Advanced URL shortener** with traffic routing, analytics, A/B testing, and webhook notifications.

## 🚀 Features

- ✅ **Distributed Architecture** - Agent/API separation for edge deployment
- ✅ **Advanced Rules Engine** - OS/Device/Browser filtering, bot blocking, time-based activation
- ✅ **A/B Testing** - Multiple variants with weight distribution & conversion tracking
- ✅ **Rich Analytics** - Real-time click tracking with GeoIP, device detection, referrer tracking
- ✅ **Rate Limiting** - Redis-backed per-IP rate limiting with analytics
- ✅ **Webhooks** - Event-driven notifications with retry logic & HMAC signatures
- ✅ **Link Groups** - Organize links with categories, colors, and icons
- ✅ **Multi-Domain** - Support for custom domains per link
- ✅ **Production Ready** - Docker, SSL automation, systemd services, monitoring

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Visitor   │────▶│    Agent    │────▶│     API      │
│             │     │   (Edge)    │     │  (Business)  │
└─────────────┘     └─────────────┘     └──────────────┘
                         :9090               :8080
                                               │
                                               ▼
                                         ┌──────────────┐
                                         │   DynamoDB   │
                                         │   + Redis    │
                                         └──────────────┘
```

## 📦 Quick Start (Development)

### Prerequisites
- Go 1.23+
- Docker & Docker Compose
- Node.js 18+ (for dashboard)

### 1. Start Infrastructure
```bash
cd nexuslink
docker-compose up -d  # DynamoDB, Redis, DynamoDB Admin
```

### 2. Run Backend
```bash
# Copy environment file
cp .env.example .env

# Start API (port 8080)
go run cmd/api/main.go

# Start Agent (port 9090) - in another terminal
go run cmd/agent/main.go
```

### 3. Run Dashboard
```bash
cd ../nexuslink-dashboard
npm install
npm run dev  # Port 3000
```

### 4. Access
- Dashboard: http://localhost:3000
- API: http://localhost:8080
- Agent: http://localhost:9090
- DynamoDB Admin: http://localhost:8001

## 🚀 Production Deployment

### Option 1: Quick Deploy (Recommended)
```bash
# Deploy everything (API + Agent)
sudo ./deployment/scripts/deploy.sh all

# Setup SSL certificates
sudo ./deployment/scripts/setup-ssl.sh
```

### Option 2: Docker Compose
```bash
# Copy production config
cp .env.production.example .env.production

# Edit with your values
nano .env.production

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Systemd (Manual)
```bash
# Build binaries
make build-all

# Install systemd services
sudo make install-systemd

# Start services
sudo systemctl start nexuslink-api
sudo systemctl start nexuslink-agent
```

## 📚 Documentation

### Production Deployment
- **[Production Deployment Guide](deployment/PRODUCTION_DEPLOYMENT.md)** - Complete setup guide (1,400+ lines)
- **[Quick Start Production](deployment/QUICK_START_PRODUCTION.md)** - 30-minute deployment
- **[AWS DynamoDB Migration](deployment/AWS_DYNAMODB_MIGRATION.md)** - AWS setup guide

### Features & Guides
- **[A/B Testing Guide](docs/AB_TESTING_GUIDE.md)** - A/B testing setup & usage
- **[Rate Limiting Tests](docs/TESTING_RATE_LIMITS.md)** - Rate limiting implementation
- **[Bulk Operations](docs/BULK_OPERATIONS_COMPLETE.md)** - Bulk link operations

### Project Resources
- **[Webhooks Guide](../WEBHOOKS_GUIDE.md)** - Webhook integration & events
- **[Quick Start](../QUICK_START.md)** - Development quick start
- **[Roadmap](../ROADMAP.md)** - Development roadmap & completed features

### Historical Documentation
- **[Implementation Summaries](../docs/)** - FASE completion summaries & migration guides

## 🔧 Configuration

### Environment Variables

```bash
# API Server
NEXUS_HTTP_ADDR=:8080
NEXUS_DYNAMO_ENDPOINT=http://localhost:8000  # or AWS endpoint
NEXUS_AWS_REGION=ap-southeast-1
NEXUS_API_KEY=your-secret-key-here
NEXUS_REDIS_ADDR=localhost:6379
NEXUS_REDIS_PASSWORD=your-redis-password

# Agent
NEXUS_AGENT_HTTP_ADDR=:9090
NEXUS_API_BASE=http://localhost:8080
NEXUS_AGENT_API_KEY=your-secret-key-here  # Must match API key
NEXUS_NODE_TOKEN=generate-from-dashboard
NEXUS_NODE_DOMAIN=yourdomain.com
```

## 🛠️ Development

### Run Tests
```bash
# API tests
./scripts/test-full-system.sh

# Rate limiting tests
./scripts/test-rate-limit.sh

# Webhook tests
./scripts/test-webhook-events.sh
```

### Useful Commands
```bash
# Build binaries
make build-all

# Start Docker services
make docker-up

# View logs
make logs-api
make logs-agent

# Check health
make health-check

# Backup DynamoDB
make backup

# Restart services
make restart-api
make restart-agent
```

## 📊 Monitoring

### Health Endpoints
```bash
curl http://localhost:8080/health  # API
curl http://localhost:9090/health  # Agent
```

### Prometheus Metrics
```bash
curl http://localhost:8080/metrics
```

**Metrics tracked:**
- System uptime & last request time
- Total requests, errors, duration
- Link count, redirect success/blocked
- Rate limit hits/misses
- Node online/offline counts

## 🗄️ Database Schema (DynamoDB)

10 tables with auto-creation:
- **NexusLinks** - Short links with rules & scheduling
- **NexusLinkVariants** - A/B testing variants
- **NexusClickEvents** - Detailed click analytics
- **NexusLinkStats** - Aggregated statistics
- **NexusWebhooks** - Event subscriptions
- **NexusLinkGroups** - Link organization
- **NexusNodes** - Registered edge nodes
- **NexusNodeTokens** - Registration tokens
- **NexusSettings** - Global configuration

## 🔐 Security Features

- ✅ Non-root Docker containers
- ✅ SSL/TLS automation (Let's Encrypt)
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Systemd security hardening
- ✅ API key authentication
- ✅ Redis password protection
- ✅ HMAC-SHA256 webhook signatures

## 💰 Cost Estimates

| Scale | Clicks/Day | Monthly Cost |
|-------|-----------|--------------|
| Small | 10K | $35-45 |
| Medium | 100K | $80-110 |
| Large | 1M | $300-400 |

## 📈 Performance

- **Redirects:** 5,000-10,000 req/sec
- **API Calls:** 2,000-3,000 req/sec
- **Latency (p50):** <10ms
- **Latency (p95):** <50ms

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues:** Open an issue on GitHub
- **Documentation:** See `/deployment` folder for guides
- **Troubleshooting:** Check `deployment/PRODUCTION_DEPLOYMENT.md`

---

**Built with ❤️ using Go, Next.js, DynamoDB, and Redis**
