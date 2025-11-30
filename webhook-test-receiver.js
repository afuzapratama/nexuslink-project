const http = require('http');
const crypto = require('crypto');

// ⚙️ CONFIG
const PORT = 3001;
const WEBHOOK_SECRET = 'test_secret_123'; // Nanti set di dashboard

console.log('🎧 NexusLink Webhook Test Receiver');
console.log('📍 Listening on: http://localhost:' + PORT);
console.log('🔐 Secret: ' + WEBHOOK_SECRET);
console.log('');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📨 WEBHOOK RECEIVED:', new Date().toISOString());
      console.log('');
      
      // Parse payload
      const payload = JSON.parse(body);
      const signature = req.headers['x-webhook-signature'] || req.headers['x-nexus-signature'];
      
      // Verifikasi signature
      const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
      const expectedSignature = hmac.update(body).digest('hex');
      const isValid = signature === expectedSignature;
      
      console.log('🔐 Signature:', signature);
      console.log('✅ Valid:', isValid ? '✅ YES' : '❌ NO');
      console.log('');
      
      // Tampilkan event
      console.log('📋 Event Type:', payload.event);
      console.log('⏰ Timestamp:', payload.timestamp);
      console.log('');
      
      // Tampilkan data detail
      console.log('📦 Data:');
      console.log(JSON.stringify(payload.data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      // Handle berdasarkan event
      switch (payload.event) {
        case 'click.created':
          console.log('🖱️  ACTION: New click detected!');
          console.log('   Link:', payload.data.alias);
          console.log('   Location:', payload.data.geoLocation);
          console.log('   Device:', payload.data.deviceType);
          break;
        case 'node.offline':
          console.log('🚨 ACTION: Node is offline!');
          console.log('   Domain:', payload.data.domain);
          console.log('   Last Seen:', payload.data.lastSeen);
          break;
        case 'link.expired':
          console.log('⏰ ACTION: Link has expired!');
          console.log('   Alias:', payload.data.alias);
          console.log('   Total Clicks:', payload.data.totalClicks);
          break;
      }
      console.log('');
      
      // Balas 200 OK
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
    
  } else if (req.method === 'GET' && req.url === '/') {
    // Health check
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>🪝 NexusLink Webhook Receiver</h1>
      <p>Status: <strong style="color:green">✅ Running</strong></p>
      <p>Endpoint: <code>POST /webhook</code></p>
      <p>Secret: <code>${WEBHOOK_SECRET}</code></p>
      <hr>
      <p>Waiting for webhooks... Check console for logs.</p>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('✅ Server ready! Now configure webhook in dashboard:');
  console.log('');
  console.log('   URL: http://localhost:' + PORT + '/webhook');
  console.log('   Secret: ' + WEBHOOK_SECRET);
  console.log('   Events: Select any event you want to test');
  console.log('');
  console.log('🎯 Dashboard: http://localhost:3000/webhooks');
  console.log('');
});
