# 🛡️ IP Check & Bot Detection Configuration

## **✅ CORRECT Configuration Method**

### **IP Check API keys are stored in DynamoDB, NOT in ENV files!**

---

## **📊 Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    DynamoDB                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │  NexusSettings Table                              │ │
│  │  ├─ ID: "global-settings"                         │ │
│  │  ├─ ProxyCheckAPIKey: "YOUR_KEY"    ← Stored here│ │
│  │  ├─ IPQualityScoreAPIKey: "YOUR_KEY" ← Stored here│ │
│  │  ├─ EnableProxyCheck: true                        │ │
│  │  ├─ EnableIPQualityScore: false                   │ │
│  │  ├─ BlockVPN: true                                │ │
│  │  ├─ BlockTor: true                                │ │
│  │  └─ BlockProxies: false                           │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
              ↓
         API reads settings
              ↓
┌─────────────────────────────────────────────────────────┐
│  resolver_handler.go                                    │
│                                                         │
│  settings, _ := h.settingsRepo.Get()                   │
│                                                         │
│  if settings.EnableProxyCheck {                        │
│    result := ipcheck.CheckIPWithProxyCheck(            │
│      ip,                                               │
│      settings.ProxyCheckAPIKey  ← From database!      │
│    )                                                   │
│  }                                                     │
└─────────────────────────────────────────────────────────┘
              ↓
       External API call
              ↓
   ┌──────────────────────┐
   │  ProxyCheck.io API   │
   │  or IPQualityScore   │
   └──────────────────────┘
```

---

## **🎯 How to Configure**

### **Method 1: Via Dashboard UI (RECOMMENDED)**

```
1. Open Dashboard: https://dashboard.htmlin.my.id/settings

2. IP Check Services section:
   ┌─────────────────────────────────────────┐
   │ □ Enable ProxyCheck.io                  │
   │   API Key: [___________________________]│
   │   Get free key: proxycheck.io           │
   │                                         │
   │ □ Enable IPQualityScore                 │
   │   API Key: [___________________________]│
   │   Get free key: ipqualityscore.com      │
   └─────────────────────────────────────────┘

3. Blocking Rules:
   ┌─────────────────────────────────────────┐
   │ □ Block VPN connections                 │
   │ □ Block Tor connections                 │
   │ □ Block Proxy connections               │
   │ □ Block Bots                            │
   └─────────────────────────────────────────┘

4. Click "Save Settings"
   → Saves to DynamoDB NexusSettings table
   → Takes effect immediately (no restart needed!)
```

### **Method 2: Via API (For automation)**

```bash
# Update settings
curl -X PUT https://api.htmlin.my.id/settings \
  -H "X-Nexus-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "enableProxyCheck": true,
    "proxyCheckApiKey": "YOUR_PROXYCHECK_KEY",
    "enableIpQualityScore": false,
    "ipQualityScoreApiKey": "",
    "blockVpn": true,
    "blockTor": true,
    "blockProxies": false,
    "blockBots": false
  }'

# Get current settings
curl -X GET https://api.htmlin.my.id/settings \
  -H "X-Nexus-Api-Key: YOUR_API_KEY"
```

---

## **❌ WRONG: ENV File Configuration**

### **This does NOT work:**

```bash
# ❌ .env.production - THESE ARE IGNORED!
NEXUS_PROXYCHECK_API_KEY=your-key-here    # NOT USED!
NEXUS_IPQS_API_KEY=your-key-here          # NOT USED!
```

**Why?**
- Code NEVER reads these ENV vars
- Only reads from DynamoDB Settings table
- ENV approach was removed in favor of database storage

---

## **📝 Settings Model**

### **DynamoDB Schema:**

```go
// internal/models/settings.go
type Settings struct {
    ID string `json:"id"` // Always "global-settings"
    
    // ProxyCheck.io
    EnableProxyCheck bool   `json:"enableProxyCheck"`
    ProxyCheckAPIKey string `json:"proxyCheckApiKey"`
    
    // IPQualityScore
    EnableIPQualityScore bool   `json:"enableIpQualityScore"`
    IPQualityScoreAPIKey string `json:"ipQualityScoreApiKey"`
    
    // Blocking rules
    BlockVPN     bool `json:"blockVpn"`
    BlockTor     bool `json:"blockTor"`
    BlockProxies bool `json:"blockProxies"`
    BlockBots    bool `json:"blockBots"`
    
    // Rate limiting (also stored here)
    RateLimitPerIP   int `json:"rateLimitPerIp"`   // per minute
    RateLimitPerLink int `json:"rateLimitPerLink"` // per minute
    RateLimitWindow  int `json:"rateLimitWindow"`  // seconds
    
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}
```

### **Default Values:**

```go
func DefaultSettings() *Settings {
    return &Settings{
        ID:                   "global-settings",
        EnableProxyCheck:     false,  // Disabled by default
        ProxyCheckAPIKey:     "",
        EnableIPQualityScore: false,  // Disabled by default
        IPQualityScoreAPIKey: "",
        BlockVPN:             false,
        BlockTor:             false,
        BlockProxies:         false,
        BlockBots:            false,
        RateLimitPerIP:       60,     // 60 req/min per IP
        RateLimitPerLink:     120,    // 120 req/min per link
        RateLimitWindow:      60,     // 60 seconds
    }
}
```

---

## **🔄 How It Works at Runtime**

### **Request Flow:**

```
1. Visitor clicks short link:
   https://go.htmlin.my.id/abc123

2. Agent forwards to API:
   POST /links/resolve
   Headers: X-Real-IP: 203.0.113.1

3. API resolver_handler.HandleResolve():
   
   a. Load settings from DynamoDB:
      settings, _ := h.settingsRepo.Get()
      // Returns singleton "global-settings"
   
   b. Check if ProxyCheck enabled:
      if settings.EnableProxyCheck && settings.ProxyCheckAPIKey != "" {
          result, _ := ipcheck.CheckIPWithProxyCheck(
              ip, 
              settings.ProxyCheckAPIKey  // ← From database!
          )
          
          // Update click event
          clickEvent.IsVPN = result.IsVPN
          clickEvent.IsTor = result.IsTor
          
          // Check blocking rules
          if settings.BlockVPN && result.IsVPN {
              return 403 Forbidden
          }
      }
   
   c. Or check IPQualityScore:
      if settings.EnableIPQualityScore && settings.IPQualityScoreAPIKey != "" {
          result, _ := ipcheck.CheckIPWithIPQS(
              ip,
              settings.IPQualityScoreAPIKey  // ← From database!
          )
      }
   
   d. Log click with fraud detection data
   
   e. Return target URL or block

4. Agent redirects visitor
```

---

## **🔐 Security Benefits of Database Storage**

### **✅ Advantages:**

1. **No Secrets in Code**
   - API keys stored in DynamoDB (encrypted at rest)
   - Not in ENV files (can't accidentally commit)
   - Not in systemd service files

2. **Easy Rotation**
   - Change keys via Dashboard UI
   - No server restart needed
   - No SSH to VPS required

3. **Audit Trail**
   - Settings changes logged with `UpdatedAt`
   - Can track who changed what (when auth added)

4. **Multi-Tenant Ready**
   - Can extend to per-user settings later
   - Global settings in "global-settings" record
   - User settings in "user-{id}" records (future)

5. **Dynamic Configuration**
   - Enable/disable services without deployment
   - A/B test fraud detection providers
   - Adjust blocking rules in real-time

---

## **📊 Database vs ENV Comparison**

| Aspect | Database (✅ Current) | ENV File (❌ Old) |
|--------|----------------------|-------------------|
| **Storage** | DynamoDB Settings table | `.env.production` |
| **Security** | Encrypted at rest | Plain text file |
| **Rotation** | Via Dashboard UI | SSH + edit + restart |
| **Visibility** | Hidden in database | Visible in `systemctl cat` |
| **Audit** | Tracked with timestamps | No audit trail |
| **Deployment** | No restart needed | Requires restart |
| **Multi-tenant** | Easy to extend | Impossible |
| **Accidental commit** | Impossible | Risk if .gitignore fails |

---

## **🧪 Testing IP Check Configuration**

### **Test 1: ProxyCheck.io**

```bash
# 1. Get free API key from proxycheck.io

# 2. Configure via Dashboard UI:
https://dashboard.htmlin.my.id/settings
- Enable ProxyCheck.io ✅
- API Key: YOUR_KEY
- Block VPN: ✅
- Save

# 3. Test with VPN IP:
curl -I https://go.htmlin.my.id/abc123 \
  -H "X-Real-IP: 8.8.8.8"  # Known VPN IP

# Expected: 403 Forbidden (if BlockVPN enabled)

# 4. Check logs:
sudo journalctl -u nexuslink-api -f
# Should show: ProxyCheck result: vpn=true, blocked
```

### **Test 2: IPQualityScore**

```bash
# 1. Get free API key from ipqualityscore.com

# 2. Configure via Dashboard UI:
- Disable ProxyCheck.io ❌
- Enable IPQualityScore ✅
- API Key: YOUR_KEY
- Block Tor: ✅
- Save

# 3. Test with Tor IP:
curl -I https://go.htmlin.my.id/abc123 \
  -H "X-Real-IP: 104.244.76.13"  # Known Tor exit node

# Expected: 403 Forbidden

# 4. Check logs:
# Should show: IPQS result: tor=true, fraud_score=90
```

### **Test 3: Verify Database Storage**

```bash
# Check DynamoDB directly:
aws dynamodb get-item \
  --table-name NexusSettings \
  --key '{"id": {"S": "global-settings"}}' \
  --region ap-southeast-1

# Expected output:
{
  "Item": {
    "id": {"S": "global-settings"},
    "enableProxyCheck": {"BOOL": true},
    "proxyCheckApiKey": {"S": "YOUR_KEY_HERE"},
    "enableIpQualityScore": {"BOOL": false},
    "blockVpn": {"BOOL": true},
    ...
  }
}
```

---

## **🔄 Migration from ENV to Database**

### **If you previously used ENV vars:**

```bash
# Old setup (doesn't work anymore):
# .env.production
NEXUS_PROXYCHECK_API_KEY=old-key-from-env

# Migration steps:
1. Copy API keys from .env.production
2. Open Dashboard: /settings
3. Paste keys into UI form
4. Enable services
5. Save
6. Remove keys from .env.production (optional cleanup)
7. Restart API (just to be clean)

# API will now use database values ✅
```

---

## **💡 FAQ**

### **Q: Why not use ENV vars like other config?**

**A:** API keys need dynamic updates without restart. ENV requires:
- SSH to server
- Edit file
- Restart service (downtime)
- Can't rotate keys easily

Database allows:
- Update via Dashboard UI
- No restart needed
- Instant effect
- Audit trail

---

### **Q: What if I don't want IP checking?**

**A:** Leave both services disabled in Settings:
```json
{
  "enableProxyCheck": false,
  "enableIpQualityScore": false
}
```

No API calls will be made, no cost incurred.

---

### **Q: Can I use both ProxyCheck + IPQS?**

**A:** Yes, but IPQualityScore overrides ProxyCheck if both enabled:

```go
// Code logic:
if settings.EnableProxyCheck {
    // Check with ProxyCheck first
}

if settings.EnableIPQualityScore {
    // IPQS overrides ProxyCheck results
}
```

**Recommendation:** Enable only one to save API quota.

---

### **Q: Do I need to restart API after changing settings?**

**A:** **NO!** Settings loaded on every request:

```go
// resolver_handler.go - runs on EVERY click
func (h *ResolverHandler) HandleResolve(w, r) {
    settings, _ := h.settingsRepo.Get()  // Fresh from DynamoDB
    // Uses latest settings immediately!
}
```

Changes take effect within 1 second (DynamoDB read latency).

---

### **Q: What happens if API key is invalid?**

**A:** Click still works, but IP check is skipped:

```go
if settings.EnableProxyCheck && settings.ProxyCheckAPIKey != "" {
    result, err := ipcheck.CheckIPWithProxyCheck(ip, apiKey)
    if err != nil {
        log.Printf("ProxyCheck failed: %v", err)
        // Continue anyway - don't block legitimate users
    }
}
```

User gets redirected, but `IsVPN/IsTor` fields remain `false`.

---

### **Q: How much do these services cost?**

| Service | Free Tier | Paid |
|---------|-----------|------|
| **ProxyCheck.io** | 1,000 queries/day | $20/mo for 50K |
| **IPQualityScore** | 5,000 queries/mo | $30/mo for 40K |

**Tip:** Use rate limiting to stay within free tier!

---

## **📁 Related Files**

```
nexuslink/
├── internal/
│   ├── models/
│   │   └── settings.go           ← Settings model (API keys here)
│   ├── repository/
│   │   └── settings_repository.go ← CRUD for settings
│   ├── handler/
│   │   └── resolver_handler.go   ← Uses settings for IP check
│   └── ipcheck/
│       ├── proxycheck.go         ← ProxyCheck.io integration
│       └── ipqualityscore.go     ← IPQualityScore integration
│
nexuslink-dashboard/
└── app/
    └── settings/
        └── page.tsx               ← UI to configure API keys
```

---

## **✅ Summary**

### **Correct Way:**
```
1. Store API keys in DynamoDB Settings table
2. Configure via Dashboard UI: /settings
3. No ENV vars needed
4. No restart required
5. Changes take effect immediately
```

### **Wrong Way:**
```
❌ NEXUS_PROXYCHECK_API_KEY in .env.production
   (Code doesn't read this!)
```

### **Key Takeaway:**

> **IP Check configuration is 100% database-driven.** ENV files only contain infrastructure config (DynamoDB, Redis, ports). Business logic config (API keys, blocking rules) lives in DynamoDB for dynamic updates without downtime.

---

**Need help configuring IP check services?** 
- Check Dashboard: `https://dashboard.htmlin.my.id/settings`
- API docs: `POST /settings`, `GET /settings`
- Test endpoints: Use curl examples above
