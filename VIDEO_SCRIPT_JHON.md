# Hedera Apex Video Script - For Jhon to Record

Duration: 3-5 minutes
Platform: stackup.dev submission

---

## OPENING (30 seconds)

"Hi, I'm Jhon Magdalena, CEO of Chita Cloud. We built the Agent Commerce Trust Protocol
for the Hedera Hello Future Apex Hackathon.

This is a real-time AI agent action logging system built on Hedera Consensus Service.
Every action an AI agent takes is logged immutably on-chain, creating a tamper-evident
audit trail that any auditor can verify."

---

## LIVE DEMO - Part 1: Register an Agent (60 seconds)

Open browser to: https://hedera-apex.chitacloud.dev/

"First, I'll register an AI agent on the Hedera audit trail."

Run in terminal:
curl -X POST https://hedera-apex.chitacloud.dev/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agent_name": "demo-agent", "capabilities": ["payment", "analysis"]}'

"This creates an immutable identity record on Hedera Consensus Service.
Every action this agent takes will now be logged to the same topic."

---

## LIVE DEMO - Part 2: Log Agent Actions (60 seconds)

"Now I'll log a payment action. This represents an AI agent initiating a transaction."

Run in terminal:
curl -X POST https://hedera-apex.chitacloud.dev/api/v1/actions/log \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "[ID_FROM_STEP_1]", "action_type": "payment_initiated", "amount": "10.00", "currency": "USD"}'

"Hedera gives us a transaction ID and consensus timestamp. This is permanent.
Unlike traditional logs, this cannot be deleted or modified."

---

## LIVE DEMO - Part 3: View Audit History (60 seconds)

Run in terminal:
curl https://hedera-apex.chitacloud.dev/api/v1/agents/[ID_FROM_STEP_1]/history

"Any regulator, auditor, or user can independently verify every action.
The history shows the complete timeline with Hedera consensus timestamps."

---

## ARCHITECTURE EXPLANATION (60 seconds)

"Here's why this matters for enterprise AI adoption:

The biggest barrier to deploying autonomous AI agents in regulated industries is
accountability. Who is responsible when an AI agent takes a financial action?

Our solution: every agent action is committed to Hedera Consensus Service before
execution. The sequence is: agent proposes action, Hedera logs it with a consensus
timestamp, action executes, result is attested on-chain.

This gives enterprises complete audit trails without trusting any single server.
Hedera's public distributed network ensures the logs are verifiable by anyone."

---

## CLOSING (30 seconds)

"The service is live today at hedera-apex.chitacloud.dev.

The code is open source at github.com/alexchenai/hedera-apex-agent-trust.

This was built by Alex Chen, an autonomous AI agent operating under my supervision.
The full stack: Node.js, Hedera SDK, MongoDB, deployed on Chita Cloud.

Thank you."

---

## SUBMISSION NOTES FOR JHON

1. Go to stackup.dev
2. Find the Hedera Hello Future Apex Hackathon
3. Submit the project with:
   - Project name: Agent Commerce Trust Protocol
   - Live URL: https://hedera-apex.chitacloud.dev
   - GitHub: https://github.com/alexchenai/hedera-apex-agent-trust
   - Paste this video after recording
4. Upload your screen recording of the demo above

The Hedera topic ID is in the service's config. You can verify on hashscan.io.
