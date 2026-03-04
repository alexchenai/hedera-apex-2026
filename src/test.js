/**
 * Test suite for Agent Commerce Trust Protocol
 * Tests all core endpoints without requiring Hedera credentials
 */

const http = require("http");
const https = require("https");
const url = require("url");

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(BASE_URL + path);
    const isHttps = parsedUrl.protocol === "https:";
    const lib = isHttps ? https : http;
    
    const data = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }
    };

    const req = lib.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => { responseData += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, body: responseData });
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("=== Agent Commerce Trust Protocol - Test Suite ===");
  console.log(`Testing against: ${BASE_URL}\n`);
  
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (err) {
      console.log(`FAIL: ${name} - ${err.message}`);
      failed++;
    }
  }

  // Test 1: Health check
  await test("Health check returns 200 with capabilities", async () => {
    const res = await request("GET", "/api/v1/health");
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.capabilities) throw new Error("No capabilities in response");
    if (res.body.protocol !== "AgentCommerceOS") throw new Error("Wrong protocol");
  });

  // Test 2: Root endpoint
  await test("Root endpoint returns protocol info", async () => {
    const res = await request("GET", "/");
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.endpoints) throw new Error("No endpoints in response");
  });

  // Test 3: Register agent
  let testAgentId;
  await test("Register a new AI agent", async () => {
    const res = await request("POST", "/api/v1/agents/register", {
      agent_id: "test-agent-001",
      agent_name: "TestAgent",
      capabilities: ["analysis", "writing", "code"],
      stake_amount_hbar: 0
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error("Registration not successful");
    if (!res.body.registration.agent_id) throw new Error("No agent_id in registration");
    testAgentId = res.body.registration.agent_id;
  });

  // Test 4: Register validation
  await test("Register without agent_id returns 400", async () => {
    const res = await request("POST", "/api/v1/agents/register", {
      agent_name: "TestAgent"
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test 5: Create attestation
  await test("Create pre-execution attestation", async () => {
    const res = await request("POST", "/api/v1/agents/attest", {
      agent_id: testAgentId || "test-agent-001",
      job_id: "job-123",
      planned_deliverable_description: "Will analyze 10 research papers and produce summary",
      stake_amount: 5
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.attestation.attestation_hash) throw new Error("No attestation hash");
  });

  // Test 6: Attestation validation
  await test("Attestation without required fields returns 400", async () => {
    const res = await request("POST", "/api/v1/agents/attest", {
      agent_id: "test-agent-001"
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test 7: Log action
  await test("Log agent action", async () => {
    const res = await request("POST", "/api/v1/actions/log", {
      agent_id: testAgentId || "test-agent-001",
      action_type: "JOB_STARTED",
      job_id: "job-123",
      data: { model: "claude-sonnet-4-6", start_time: new Date().toISOString() }
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.action.id) throw new Error("No action ID");
  });

  // Test 8: Action log validation
  await test("Log action without agent_id returns 400", async () => {
    const res = await request("POST", "/api/v1/actions/log", {
      action_type: "JOB_STARTED"
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test 9: Get agent history
  await test("Get agent action history", async () => {
    const res = await request("GET", `/api/v1/agents/${testAgentId || "test-agent-001"}/history`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (typeof res.body.actions_count !== "number") throw new Error("No actions_count");
  });

  // Test 10: Initiate payment
  await test("Initiate simulated payment", async () => {
    const res = await request("POST", "/api/v1/payments/initiate", {
      from_agent_id: testAgentId || "test-agent-001",
      to_account_id: "0.0.9999999",
      amount_hbar: 0,
      job_id: "job-123",
      description: "Payment for analysis task"
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.payment.id) throw new Error("No payment ID");
  });

  // Test 11: Payment validation
  await test("Payment without required fields returns 400", async () => {
    const res = await request("POST", "/api/v1/payments/initiate", {
      from_agent_id: "test-agent-001"
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test suite error:", err);
  process.exit(1);
});
