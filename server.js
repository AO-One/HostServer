// ==========================================
// 1. CORE FRAMEWORK IMPORTS & INITIALIZATION
// ==========================================
const express = require('express');
const cors = require('cors');
const path = require('path'); 
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express(); 
const PORT = process.env.PORT || 5000;

// ==========================================
// 2. MIDDLEWARE & MULTI-APP SPA ROUTING
// ==========================================
app.use(cors());                 
app.use(express.json());         

// 🛡️ 1. SECURE ACCESS PROTECTION MIDDLEWARE
// This intercepts requests and blocks unpaid users from accessing application bundles
function verifySubscription(req, res, next) {
  const userHasPaid = true; // 💸 Right now this is hardcoded to true so you don't lock yourself out!
  
  if (userHasPaid) {
    next(); // Pass right through to the app files safely!
  } else {
    res.redirect('/?error=subscription_required'); // Bounce them out to the master landing/billing page
  }
}

// 2. 📝 PORTAL A: AI BLOGGER APPLICATION ROUTES (PROTECTED)
// The middleware sits right in the middle to guard the static folder assets
app.use('/aibloggerapp', verifySubscription, express.static(path.join(__dirname, 'public', 'aibloggerapp')));
app.get(/^\/aibloggerapp(?:\/.*)?$/, verifySubscription, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'aibloggerapp', 'index.html'));
});

// 3. 💼 PORTAL B: AI BUSINESS APPLICATION ROUTES (PROTECTED)
app.use('/aibusinessapp', verifySubscription, express.static(path.join(__dirname, 'public', 'aibusinessapp')));
app.get(/^\/aibusinessapp(?:\/.*)?$/, verifySubscription, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'aibusinessapp', 'index.html'));
});

// 4. 🎯 MAIN SERVER LANDING GATEWAY (OneOS Beta Portal for Customers)
// This remains UNPROTECTED so prospects can actually visit the site and see your subscribe button!
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 3. CONNECT THE SUPABASE DATABASE CLIENT
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ System Alert: Missing Supabase credentials in your .env configuration file.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// 4. BASIC SYSTEM HEALTH ROUTE
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({ status: "online", system: "OneOS HostBackend Engine" });
});

// ==========================================
// 5. APP DATA ROUTING: FETCH SINGLE POST BY ID
// ==========================================
app.get('/api/blogDetail', async (req, res) => {
  const { id } = req.query;
  console.log(`\n📡 Incoming API Request received for Post ID: ${id}`);
  
  if (!id) {
    return res.status(400).json({ error: "Missing post ID parameter" });
  }

  try {
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      console.log(`⚠️ Input validation failed: "${id}" is not a number.`);
      return res.status(400).json({ error: "Provided ID is not a valid number" });
    }

    console.log(`🔍 Querying Supabase table 'posts' where column 'id' equals: ${numericId}`);

    const { data, error } = await supabase
      .from('posts') 
      .select('*')
      .eq('id', numericId); 

    if (error) {
      console.error("❌ Supabase Database Engine Rejected the query:", error.message);
      return res.status(500).json({ error: error.message, hint: error.hint });
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Query completed successfully, but zero matching rows were found.");
      return res.status(404).json({ error: "No blog post found matching that ID." });
    }

    console.log("🏆 Success! Row data retrieved cleanly:", data[0]);
    return res.json(data[0]);

  } catch (error) {
    console.error("❌ Critical server-side failure execution:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 🚀 6. INKFLOW AI / BASE44 COMPATIBILITY LAYER
// ==========================================

// A. Catch-All App Status Workspace Initialization Check
app.get('/api/apps/:appId', (req, res) => {
    console.log(`\n🔑 Initializing handshake authorization for Workspace ID: ${req.params.appId}`);
    res.json({
        id: req.params.appId,
        name: "OneOS Base44 Workspace Engine",
        status: "active",
        settings: {}
    });
});

// B. Mock the Current User Session (Bypasses Auth 404)
app.get('/api/apps/:appId/entities/User/me', (req, res) => {
    res.json({
        id: "usr-admin-001",
        email: "peter@oneos.internal",
        name: "Administrator",
        role: "owner"
    });
});

// C. Mock Analytics and Page View Tracking (Prevents Log Crashes)
app.post('/api/app-logs/:appId/log-user-in-app/:page', (req, res) => {
    res.status(200).json({ success: true });
});
app.post('/api/apps/:appId/analytics/track/batch', (req, res) => {
    res.status(200).json({ success: true });
});

// D. Dynamic Catch-All Collection Stream for ANY Workspace ID
app.get('/api/apps/:appId/collections/:collectionName', async (req, res) => {
    try {
        console.log(`\n🔍 Pipeline intercepting collection stream for target [${req.params.collectionName}] inside workspace [${req.params.appId}]`);
        
        const { data, error } = await supabase
            .from('posts')
            .select('*');

        if (error) {
            console.error("❌ Supabase failed to fetch dashboard collection:", error.message);
            return res.status(500).json({ error: error.message });
        }

        const normalizedPosts = data.map(post => {
            const contentText = post.content || "";
            const wordCount = contentText.split(/\s+/).filter(Boolean).length;
            
            return {
                id: post.id.toString(),
                title: post.title || "Untitled Post",
                content: contentText,
                status: post.status || "published",
                words: post.words || wordCount || 0,
                created_at: post.created_at || new Date().toISOString()
            };
        });

        console.log(`🏆 Success! Transformed and streamed ${normalizedPosts.length} posts to dashboard layout.`);
        res.json(normalizedPosts);

    } catch (err) {
        console.error("Dashboard dataset pipeline execution crash:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 7. LAUNCH THE SERVER ENGINE
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 HostBackend Engine is running securely on port ${PORT}`);
});