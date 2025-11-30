# 🔓 Repository Visibility Strategy

**Current Status:** Public (Testing Phase)  
**Future:** Will be private after production validation

---

## Why Public Now?

### ✅ Benefits During Testing
- **No SSH Setup Required** - Anyone can test without credentials
- **Faster Deployment** - No SSH key setup on 20+ VPS servers
- **GitHub Raw Access** - Direct curl access to installer scripts
- **Easy Collaboration** - Team members can test immediately
- **Transparent Testing** - Community can provide feedback

### 🔐 When to Make Private

Move to private after:
- ✅ All production deployments tested & working
- ✅ 20+ agents deployed successfully
- ✅ DNS verification tested across regions
- ✅ SSL automation confirmed working
- ✅ No critical bugs found
- ✅ Documentation complete & validated

**Estimated timeline:** 1-2 weeks after initial production deployment

---

## What's Safe to Be Public

### ✅ Currently Public (Safe)
- Source code (Go backend, Next.js frontend)
- Deployment scripts & installers
- Documentation & guides
- Architecture & design patterns
- Feature implementations

### 🔒 Always Keep Secret (Never Commit!)
- `.env` files with API keys
- `.env.production` with AWS credentials
- Database credentials
- Redis passwords
- Node tokens
- SSL private keys
- User data

**All secrets are in `.gitignore`** ✅

---

## Migration to Private

### When Ready:
```bash
# 1. GitHub Web Interface
Settings → Danger Zone → Change visibility → Make private

# 2. Update team access (if needed)
Settings → Collaborators → Add team members

# 3. Update documentation
- Replace raw.githubusercontent.com URLs with private CDN
- Setup authenticated CDN or private file server
- Update installer download URLs
```

### For Installer After Private:

**Option A: Self-hosted CDN**
```bash
# Host install.sh on your server
https://cdn.htmlin.my.id/nexuslink/install.sh
```

**Option B: GitHub Releases**
```bash
# Use GitHub releases for public access
https://github.com/afuzapratama/nexuslink-project/releases/latest/download/install.sh
```

**Option C: Authenticated GitHub Raw**
```bash
# For team only (requires GitHub token)
curl -H "Authorization: token GITHUB_TOKEN" \
  https://raw.githubusercontent.com/.../install.sh | bash
```

---

## Current Workflow (Public)

```bash
# Anyone can run:
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | sudo bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=YOUR_API_KEY \
  --token=YOUR_NODE_TOKEN \
  --email=admin@example.com
```

**Security Notes:**
- API keys are passed via command line (not stored in repo)
- Tokens are generated per-agent from dashboard
- Each deployment uses unique credentials
- Secrets never committed to repository

---

## Security Best Practices

### While Public:
1. ✅ Never commit `.env` files
2. ✅ Use `.gitignore` for all secrets
3. ✅ Rotate API keys after testing
4. ✅ Use strong passwords (32+ chars)
5. ✅ Monitor repository access logs
6. ✅ Review commits before pushing

### After Private:
1. ✅ All public practices still apply
2. ✅ Control team access (read/write permissions)
3. ✅ Enable branch protection
4. ✅ Require reviews for main branch
5. ✅ Setup secret scanning alerts
6. ✅ Enable dependency vulnerability alerts

---

## Timeline

```
Week 1: Public Testing Phase
├─ Day 1-2: Deploy API + Dashboard
├─ Day 3-5: Deploy 5 test agents
├─ Day 6-7: Full 20-agent deployment
└─ Validation: All systems operational

Week 2: Production Validation
├─ Monitor performance
├─ Fix any issues found
├─ Optimize configurations
└─ Confirm stability

Week 3: Make Private (Optional)
├─ Assess if private needed
├─ Setup CDN for installer
└─ Migrate if necessary
```

---

## Decision Criteria

### Keep Public If:
- ✅ No proprietary business logic exposed
- ✅ Want community contributions
- ✅ Using as portfolio project
- ✅ Open-source by design

### Make Private If:
- ✅ Contains sensitive business logic
- ✅ Competitive advantage features
- ✅ Custom client implementations
- ✅ Paid enterprise features

---

**Current Recommendation:** Keep public for now, evaluate after 2-4 weeks of production use.
