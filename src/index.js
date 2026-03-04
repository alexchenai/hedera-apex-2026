/**
 * Agent Commerce Trust Protocol
 * Hedera Apex Hackathon 2026 - AI & Agents Track
 * 
 * This service enables AI agents to:
 * 1. Register their identity and reputation on Hedera Consensus Service
 * 2. Log all agent actions immutably to HCS (tamper-proof audit trail)
 * 3. Create trust attestations before job execution
 * 4. Process payments via x402 protocol integrated with HBAR
 * 
 * Architecture: Express.js API + Hedera SDK + MongoDB
 * 
 * API Endpoints:
 * POST /api/v1/agents/register    - Register agent, create HCS topic
 * POST /api/v1/agents/attest      - Pre-execution trust attestation
 * POST /api/v1/actions/log        - Log agent action to HCS
 * GET  /api/v1/agents/:id/history - Get immutable action history
 * POST /api/v1/payments/initiate  - Initiate x402-compatible HBAR payment
 * GET  /api/v1/health             - Health check
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const hederaClient = require("./hedera-client");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

let db;

// Connect to MongoDB
async function connectDB() {
  if (!MONGODB_URI) {
    console.warn("No MONGODB_URI - using in-memory storage");
    return null;
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db("hedera-apex");
  console.log("Connected to MongoDB");
  return db;
}

// In-memory fallback storage
const memStorage = {
  agents: {},
  actions: [],
  payments: {}
};

function getCollection(name) {
  if (db) return db.collection(name);
  return null;
}

/**
 * GET /api/v1/health
 * Health check endpoint
 */
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "ok",
    protocol: "AgentCommerceOS",
    version: "1.0.0",
    network: "hedera-testnet",
    timestamp: new Date().toISOString(),
    capabilities: [
      "hcs-agent-logging",
      "trust-attestation",
      "x402-hbar-payments",
      "reputation-tracking"
    ]
  });
});

/**
 * GET /
 * Landing page with protocol info
 */
app.get("/", (req, res) => {
  res.json({
    name: "Agent Commerce Trust Protocol",
    description: "Immutable AI agent action logging on Hedera Consensus Service with x402 payment integration",
    hackathon: "Hedera Hello Future: Apex Hackathon 2026",
    track: "AI & Agents",
    built_by: "Alex Chen (AI agent)",
    blog: "https://alexchen.chitacloud.dev",
    endpoints: {
      health: "GET /api/v1/health",
      register: "POST /api/v1/agents/register",
      attest: "POST /api/v1/agents/attest",
      log_action: "POST /api/v1/actions/log",
      history: "GET /api/v1/agents/:id/history",
      payment: "POST /api/v1/payments/initiate"
    }
  });
});

/**
 * POST /api/v1/agents/register
 * Register an AI agent and create their HCS topic for action logging
 * 
 * Body: { agent_id, agent_name, capabilities, stake_amount_hbar }
 */
app.post("/api/v1/agents/register", async (req, res) => {
  try {
    const { agent_id, agent_name, capabilities, stake_amount_hbar } = req.body;
    
    if (!agent_id || !agent_name) {
      return res.status(400).json({ error: "agent_id and agent_name required" });
    }

    let topicId = null;
    let registrationTx = null;

    // Create HCS topic for this agent (if Hedera is configured)
    if (hederaClient.client) {
      try {
        topicId = await hederaClient.createAgentTopic(agent_id, agent_name);
        
        // Log the registration itself to HCS
        const logResult = await hederaClient.logAgentAction(topicId, {
          type: "AGENT_REGISTERED",
          agent_id,
          agent_name,
          capabilities: capabilities || [],
          stake_amount_hbar: stake_amount_hbar || 0
        });
        registrationTx = logResult.transactionId;
      } catch (hederaErr) {
        console.warn("Hedera operation failed (continuing without it):", hederaErr.message);
      }
    }

    const registration = {
      id: uuidv4(),
      agent_id,
      agent_name,
      capabilities: capabilities || [],
      stake_amount_hbar: stake_amount_hbar || 0,
      ...(topicId ? { hcs_topic_id: topicId, registration_tx: registrationTx } : {}),
      reputation_score: 100,
      jobs_completed: 0,
      created_at: new Date().toISOString(),
      network: "hedera-testnet"
    };

    // Store in DB or memory
    const col = getCollection("agents");
    if (col) {
      await col.insertOne(registration);
    } else {
      memStorage.agents[agent_id] = registration;
    }

    res.status(201).json({
      success: true,
      registration,
      message: topicId 
        ? `Agent registered. HCS topic ${topicId} created for immutable action logging.`
        : "Agent registered (HCS logging pending Hedera credentials)"
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/agents/attest
 * Create a pre-execution trust attestation
 * This allows agents to commit to what they WILL do before doing it
 * The attestation is logged to HCS with a hash of the planned action
 * 
 * Body: { agent_id, job_id, planned_deliverable_description, stake_amount }
 */
app.post("/api/v1/agents/attest", async (req, res) => {
  try {
    const { agent_id, job_id, planned_deliverable_description, stake_amount } = req.body;

    if (!agent_id || !job_id || !planned_deliverable_description) {
      return res.status(400).json({ 
        error: "agent_id, job_id, planned_deliverable_description required" 
      });
    }

    // Create a hash of the planned action (pre-commitment)
    const attestationHash = crypto
      .createHash("sha256")
      .update(`${agent_id}:${job_id}:${planned_deliverable_description}:${Date.now()}`)
      .digest("hex");

    const attestation = {
      id: uuidv4(),
      attestation_hash: attestationHash,
      agent_id,
      job_id,
      planned_deliverable_description,
      stake_amount: stake_amount || 0,
      status: "pending",
      created_at: new Date().toISOString()
    };

    // Log to HCS if configured
    let hcsTx = null;
    const col = getCollection("agents");
    let agent = col 
      ? await col.findOne({ agent_id })
      : memStorage.agents[agent_id];

    if (agent && agent.hcs_topic_id && hederaClient.client) {
      try {
        const logResult = await hederaClient.logAgentAction(agent.hcs_topic_id, {
          type: "PRE_EXECUTION_ATTESTATION",
          attestation_hash: attestationHash,
          job_id,
          planned_deliverable_description,
          stake_amount: stake_amount || 0
        });
        hcsTx = logResult.transactionId;
        attestation.hcs_transaction_id = hcsTx;
        attestation.hcs_sequence_number = logResult.sequenceNumber;
      } catch (hederaErr) {
        console.warn("HCS logging failed:", hederaErr.message);
      }
    }

    // Store attestation
    const attCol = getCollection("attestations");
    if (attCol) {
      await attCol.insertOne(attestation);
    }

    res.status(201).json({
      success: true,
      attestation,
      message: hcsTx 
        ? `Attestation logged to Hedera: tx ${hcsTx}`
        : "Attestation created (HCS pending credentials)",
      ...(agent?.hcs_topic_id ? { verification_url: `https://hashscan.io/testnet/topic/${agent.hcs_topic_id}` } : {})
    });

  } catch (err) {
    console.error("Attestation error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/actions/log
 * Log an agent action to HCS for immutable audit trail
 * 
 * Body: { agent_id, action_type, job_id, data, deliverable_hash }
 */
app.post("/api/v1/actions/log", async (req, res) => {
  try {
    const { agent_id, action_type, job_id, data, deliverable_hash } = req.body;

    if (!agent_id || !action_type) {
      return res.status(400).json({ error: "agent_id and action_type required" });
    }

    const actionRecord = {
      id: uuidv4(),
      agent_id,
      action_type,
      job_id: job_id || null,
      data: data || {},
      deliverable_hash: deliverable_hash || null,
      logged_at: new Date().toISOString()
    };

    // Log to HCS
    const col = getCollection("agents");
    let agent = col
      ? await col.findOne({ agent_id })
      : memStorage.agents[agent_id];

    if (agent && agent.hcs_topic_id && hederaClient.client) {
      try {
        const logResult = await hederaClient.logAgentAction(agent.hcs_topic_id, {
          type: action_type,
          job_id,
          data,
          deliverable_hash
        });
        actionRecord.hcs_transaction_id = logResult.transactionId;
        actionRecord.hcs_sequence_number = logResult.sequenceNumber;
        actionRecord.hcs_topic_id = agent.hcs_topic_id;
      } catch (hederaErr) {
        console.warn("HCS logging failed:", hederaErr.message);
      }
    }

    // Store in DB
    const actCol = getCollection("actions");
    if (actCol) {
      await actCol.insertOne(actionRecord);
    } else {
      memStorage.actions.push(actionRecord);
    }

    res.status(201).json({
      success: true,
      action: actionRecord,
      ...(actionRecord.hcs_topic_id ? { hashscan_url: `https://hashscan.io/testnet/topic/${actionRecord.hcs_topic_id}` } : {})
    });

  } catch (err) {
    console.error("Action log error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/agents/:id/history
 * Get immutable action history for an agent
 */
app.get("/api/v1/agents/:id/history", async (req, res) => {
  try {
    const { id } = req.params;

    const col = getCollection("actions");
    let actions;
    if (col) {
      actions = await col.find({ agent_id: id }).sort({ logged_at: -1 }).toArray();
    } else {
      actions = memStorage.actions.filter(a => a.agent_id === id);
    }

    const agentCol = getCollection("agents");
    const agent = agentCol
      ? await agentCol.findOne({ agent_id: id })
      : memStorage.agents[id];

    res.json({
      agent_id: id,
      agent_name: agent?.agent_name,
      ...(agent?.hcs_topic_id ? {
        hcs_topic_id: agent.hcs_topic_id,
        hashscan_topic_url: `https://hashscan.io/testnet/topic/${agent.hcs_topic_id}`
      } : {
        hcs_note: "HCS topic will be created when Hedera credentials are configured"
      }),
      actions_count: actions.length,
      actions
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/payments/initiate
 * Initiate a payment using x402-compatible HBAR transfer
 * This simulates the x402 payment flow but on Hedera network
 * 
 * Body: { from_agent_id, to_account_id, amount_hbar, job_id, description }
 */
app.post("/api/v1/payments/initiate", async (req, res) => {
  try {
    const { from_agent_id, to_account_id, amount_hbar, job_id, description } = req.body;

    if (!to_account_id || amount_hbar === undefined || amount_hbar === null) {
      return res.status(400).json({ error: "to_account_id and amount_hbar required" });
    }

    // Generate x402-compatible payment intent
    const paymentId = uuidv4();
    const paymentIntent = {
      id: paymentId,
      protocol: "x402-hedera",
      from_agent: from_agent_id,
      to_account: to_account_id,
      amount_hbar,
      job_id: job_id || null,
      description: description || "",
      status: "pending",
      created_at: new Date().toISOString()
    };

    // Execute HBAR transfer if Hedera is configured
    if (hederaClient.client && amount_hbar > 0) {
      try {
        const txResult = await hederaClient.transferHbar(to_account_id, amount_hbar);
        paymentIntent.transaction_id = txResult.transactionId;
        paymentIntent.status = "completed";
        paymentIntent.completed_at = new Date().toISOString();
      } catch (hederaErr) {
        console.warn("HBAR transfer failed:", hederaErr.message);
        paymentIntent.status = "failed";
        paymentIntent.error = hederaErr.message;
      }
    } else {
      paymentIntent.status = "simulated";
      paymentIntent.note = "Hedera not configured - simulated payment";
    }

    // Log payment to HCS if agent has a topic
    if (from_agent_id) {
      const col = getCollection("agents");
      const agent = col
        ? await col.findOne({ agent_id: from_agent_id })
        : memStorage.agents[from_agent_id];

      if (agent && agent.hcs_topic_id && hederaClient.client) {
        try {
          await hederaClient.logAgentAction(agent.hcs_topic_id, {
            type: "PAYMENT_INITIATED",
            payment_id: paymentId,
            to: to_account_id,
            amount: `${amount_hbar} HBAR`,
            job_id,
            status: paymentIntent.status
          });
        } catch (hederaErr) {
          // Non-critical, continue
        }
      }
    }

    // Store payment
    const payCol = getCollection("payments");
    if (payCol) {
      await payCol.insertOne(paymentIntent);
    } else {
      memStorage.payments[paymentId] = paymentIntent;
    }

    res.status(201).json({
      success: true,
      payment: paymentIntent,
      message: paymentIntent.status === "completed"
        ? `Payment of ${amount_hbar} HBAR completed: ${paymentIntent.transaction_id}`
        : `Payment ${paymentIntent.status}`
    });

  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin analytics
app.get("/api/admin/analytics", async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (key !== "hedera-admin-2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const agentsCol = getCollection("agents");
  const actionsCol = getCollection("actions");
  
  const agents = agentsCol ? await agentsCol.countDocuments() : Object.keys(memStorage.agents).length;
  const actions = actionsCol ? await actionsCol.countDocuments() : memStorage.actions.length;

  res.json({
    total_agents: agents,
    total_actions_logged: actions,
    network: "hedera-testnet",
    protocol_version: "1.0.0"
  });
});

// Start server
async function start() {
  await connectDB();
  
  // Try to initialize Hedera (non-blocking)
  if (process.env.HEDERA_ACCOUNT_ID) {
    try {
      await hederaClient.initialize();
      console.log("Hedera client ready");
    } catch (err) {
      console.warn("Hedera initialization skipped:", err.message);
    }
  } else {
    console.warn("No HEDERA_ACCOUNT_ID - running in simulation mode");
  }

  app.listen(PORT, () => {
    console.log(`Agent Commerce Trust Protocol running on port ${PORT}`);
    console.log(`Hackathon: Hedera Hello Future Apex 2026`);
    console.log(`Track: AI & Agents`);
  });
}

start().catch(console.error);
