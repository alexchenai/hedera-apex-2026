/**
 * Hedera Client Module
 * Handles all interactions with Hedera network (testnet)
 * Uses @hashgraph/sdk directly for reliable operations
 */

const {
  Client,
  AccountId,
  PrivateKey,
  AccountBalanceQuery,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Hbar,
  Status
} = require("@hashgraph/sdk");

class HederaClient {
  constructor() {
    this.client = null;
    this.accountId = null;
    this.privateKey = null;
    this.topicId = null;
  }

  /**
   * Initialize Hedera client with testnet credentials
   */
  async initialize() {
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;

    if (!accountId || !privateKey) {
      throw new Error("HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY required");
    }

    this.accountId = AccountId.fromString(accountId);
    this.privateKey = PrivateKey.fromStringECDSA(privateKey);

    // Use testnet for hackathon
    this.client = Client.forTestnet();
    this.client.setOperator(this.accountId, this.privateKey);

    console.log(`Hedera client initialized for account: ${accountId}`);
    return true;
  }

  /**
   * Get HBAR balance for current account
   */
  async getBalance() {
    const balance = await new AccountBalanceQuery()
      .setAccountId(this.accountId)
      .execute(this.client);

    return {
      hbar: balance.hbars.toString(),
      tokens: balance.tokens ? Object.fromEntries(balance.tokens) : {}
    };
  }

  /**
   * Create a Hedera Consensus Service topic for agent action logging
   */
  async createAgentTopic(agentId, description) {
    const transaction = new TopicCreateTransaction()
      .setTopicMemo(`AgentCommerceOS:${agentId}:${description}`)
      .setAdminKey(this.privateKey)
      .setSubmitKey(this.privateKey);

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Topic creation failed: ${receipt.status}`);
    }

    const topicId = receipt.topicId.toString();
    console.log(`Created HCS topic: ${topicId} for agent ${agentId}`);
    return topicId;
  }

  /**
   * Submit an agent action to HCS for immutable logging
   * This creates a tamper-proof audit trail on Hedera
   */
  async logAgentAction(topicId, action) {
    const message = JSON.stringify({
      ...action,
      timestamp: new Date().toISOString(),
      protocol: "AgentCommerceOS/1.0",
      network: "hedera-testnet"
    });

    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message);

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return {
      topicId,
      sequenceNumber: receipt.topicSequenceNumber?.toString(),
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString()
    };
  }

  /**
   * Transfer HBAR from agent account (for payment flows)
   */
  async transferHbar(toAccountId, amount) {
    const transaction = new TransferTransaction()
      .addHbarTransfer(this.accountId, new Hbar(-amount))
      .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount));

    const txResponse = await transaction.execute(this.client);
    const receipt = await txResponse.getReceipt(this.client);

    return {
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString(),
      from: this.accountId.toString(),
      to: toAccountId,
      amount: `${amount} HBAR`
    };
  }
}

module.exports = new HederaClient();
