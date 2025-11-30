# 🔗 NexusLink - Complete Project

**Advanced distributed URL shortener** with traffic routing, analytics, A/B testing, and webhook notifications.

## 📦 Repository Structure (Monorepo)

```
nexuslink-project/
├── nexuslink/              # Go Backend (API + Agent)
├── nexuslink-dashboard/    # Next.js Dashboard
├── docs/                   # Historical documentation & summaries
├── ROADMAP.md              # Development roadmap
├── QUICK_START.md          # Quick start guide
├── WEBHOOKS_GUIDE.md       # Webhook implementation guide
└── GITHUB_SSH_SETUP.md     # GitHub SSH setup for Arch Linux
```

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone git@github.com:your-username/nexuslink-project.git
cd nexuslink-project
```

### 2. Start Backend
```bash
cd nexuslink
docker-compose up -d              # Start DynamoDB + Redis
cp .env.example .env              # Configure environment
go run cmd/api/main.go            # Start API (port 8080)
go run cmd/agent/main.go          # Start Agent (port 9090)
```

### 3. Start Dashboard
```bash
cd ../nexuslink-dashboard
npm install
cp .env.example .env.local        # Configure environment
npm run dev                       # Start dashboard (port 3000)
```

### 4. Access
- **Dashboard:** http://localhost:3000
- **API:** http://localhost:8080
- **Agent:** http://localhost:9090
- **DynamoDB Admin:** http://localhost:8001

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](QUICK_START.md)** - Development setup
- **[Backend README](nexuslink/README.md)** - Go backend documentation
- **[Dashboard README](nexuslink-dashboard/README.md)** - Next.js dashboard documentation

### Production
- **[Production Deployment](nexuslink/deployment/PRODUCTION_DEPLOYMENT.md)** - Complete production guide
- **[Quick Deploy (30 min)](nexuslink/deployment/QUICK_START_PRODUCTION.md)** - Fast production setup
- **[AWS Migration](nexuslink/deployment/AWS_DYNAMODB_MIGRATION.md)** - DynamoDB AWS setup

### Features
- **[Webhooks Guide](WEBHOOKS_GUIDE.md)** - Event-driven notifications
- **[A/B Testing](nexuslink/docs/AB_TESTING_GUIDE.md)** - Split testing implementation
- **[Rate Limiting](nexuslink/docs/TESTING_RATE_LIMITS.md)** - Rate limiting & analytics

### Project Management
- **[Roadmap](ROADMAP.md)** - Development phases & completed features
- **[Historical Docs](docs/)** - FASE summaries & migration guides

### Setup
- **[GitHub SSH Setup](GITHUB_SSH_SETUP.md)** - SSH configuration for Arch Linux

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
      ┌──────────────┐                  │   + Redis    │
      │   Dashboard  │                  └──────────────┘
      │  (Next.js)   │
      └──────────────┘
           :3000
```

### Components

#### Backend (`nexuslink/`)
- **API Server** - Business logic, link management, analytics (port 8080)
- **Agent/Redirector** - Edge server for fast redirects with rate limiting (port 9090)
- **DynamoDB** - 10 tables for links, analytics, nodes, webhooks
- **Redis** - Rate limiting & caching

#### Frontend (`nexuslink-dashboard/`)
- **Dashboard** - Admin UI with analytics, link management, A/B testing
- **BFF API** - Backend-for-Frontend routes in `/app/api/nexus`

## ✨ Features

- ✅ **Advanced Rules Engine** - OS/Device/Browser filtering, bot blocking
- ✅ **A/B Testing** - Multiple variants with conversion tracking
- ✅ **Rich Analytics** - Real-time click tracking with charts
- ✅ **Rate Limiting** - Redis-backed per-IP limiting
- ✅ **Webhooks** - Event notifications with retry logic
- ✅ **Link Groups** - Organize links with categories
- ✅ **Multi-Domain** - Custom domains per link
- ✅ **Production Ready** - Docker, SSL, systemd, monitoring

## 🔧 Tech Stack

### Backend
- **Language:** Go 1.23+
- **Database:** AWS DynamoDB
- **Cache:** Redis 7+
- **Deployment:** Docker, systemd, Nginx

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Deployment:** PM2, Vercel, Docker

## 🚀 Production Deployment

### Option 1: Quick Deploy (Recommended)
```bash
cd nexuslink
sudo ./deployment/scripts/deploy.sh all
sudo ./deployment/scripts/setup-ssl.sh
```

### Option 2: Docker Compose
```bash
cd nexuslink
docker-compose -f docker-compose.prod.yml up -d
```

See [Production Deployment Guide](nexuslink/deployment/PRODUCTION_DEPLOYMENT.md) for complete instructions.

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost:8080/health  # API
curl http://localhost:9090/health  # Agent
```

### Prometheus Metrics
```bash
curl http://localhost:8080/metrics
```

### Logs
```bash
# Systemd services
sudo journalctl -u nexuslink-api -f
sudo journalctl -u nexuslink-agent -f

# Docker
docker-compose logs -f api
docker-compose logs -f agent
```

## 💰 Cost Estimates

| Scale | Clicks/Day | Monthly Cost |
|-------|-----------|--------------|
| Small | 10K | $35-45 |
| Medium | 100K | $80-110 |
| Large | 1M | $300-400 |

*Includes AWS DynamoDB, Redis, VPS hosting*

## 📈 Performance

- **Redirects:** 5,000-10,000 req/sec
- **API Calls:** 2,000-3,000 req/sec
- **Latency (p50):** <10ms
- **Latency (p95):** <50ms

## 🔐 Security

- ✅ Non-root Docker containers
- ✅ SSL/TLS automation (Let's Encrypt)
- ✅ Security headers (HSTS, CSP)
- ✅ Systemd security hardening
- ✅ API key authentication
- ✅ Redis password protection
- ✅ HMAC webhook signatures

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE files in each project for details

## 🆘 Support

- **Issues:** Open an issue on GitHub
- **Documentation:** See `/docs` and component READMEs
- **Troubleshooting:** Check production deployment guide

---

## 🗺️ Project Status

**Current Phase:** FASE 7 - Production Deployment ✅ COMPLETE

### Completed Features
- ✅ Backend API & Agent architecture
- ✅ Dashboard with analytics & charts
- ✅ Advanced link rules & filtering
- ✅ A/B testing with variants
- ✅ Rate limiting & analytics
- ✅ Webhook system
- ✅ Link groups & organization
- ✅ Multi-domain support
- ✅ Production deployment infrastructure
- ✅ SSL automation
- ✅ Monitoring & logging
- ✅ Backup & recovery

### Next Phase
- 📋 FASE 8: Performance & Scale (Load testing, CDN, optimization)

See [ROADMAP.md](ROADMAP.md) for complete development timeline.

---

**Built with ❤️ using Go, Next.js, DynamoDB, and Redis**
