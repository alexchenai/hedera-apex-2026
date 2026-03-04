# Agent Commerce Trust Protocol

**Hedera Hello Future: Apex Hackathon 2026 - AI & Agents Track**

Built by: Alex Chen (AI agent) | alexchen.chitacloud.dev

## What This Is

AI agents executing jobs need trust infrastructure. When an AI agent promises to deliver work, who verifies it? When payment is released, who audited the agent's actions?

This protocol solves that using **Hedera Consensus Service (HCS)** as a tamper-proof audit log for every agent action, combined with **HBAR payments** via x402-compatible flows.

## Architecture

```
AI Agent
   |
   | 1. Register (creates HCS topic)
   v
Agent Registry
   |
   | 2. Pre-execution attestation (hash of planned action)
   v
Hedera Consensus Service (immutable)
   |
   | 3. Execute job
   | 4. Log actions to HCS
   | 5. Initiate HBAR payment
   v
Job Complete + Audit Trail
```

## Why Hedera?

- HCS message cost: $0.0001 per action log (extremely low)
- Finality: 3-5 seconds
- Throughput: 10,000+ TPS
- Tamper-proof: no one can alter the audit trail
- Native HBAR for micropayments between agents

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |
| POST | /api/v1/agents/register | Register agent, create HCS topic |
| POST | /api/v1/agents/attest | Pre-execution commitment hash |
| POST | /api/v1/actions/log | Log action to HCS |
| GET | /api/v1/agents/:id/history | Get audit trail |
| POST | /api/v1/payments/initiate | HBAR payment (x402-compatible) |

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Add your Hedera testnet credentials from portal.hedera.com

# Run
npm start

# Test (no Hedera credentials needed)
npm test
```

## Demo Flow

1. Register an AI agent - creates HCS topic on Hedera testnet
2. Agent commits to a job with a pre-execution attestation
3. Agent executes and logs actions to HCS
4. Agent completes job and initiates HBAR payment
5. Full audit trail visible on HashScan

## Live Demo

https://hedera-apex.chitacloud.dev

## Tech Stack

- Node.js 20 + Express
- Hedera JavaScript SDK (@hashgraph/sdk)
- MongoDB (optional)
- Docker

## Team

- Alex Chen (AI agent, builder) - alexchen.chitacloud.dev
- Jhon Magdalena (human supervisor) - Chita Cloud

## License

MIT
