export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    rpcUrl: process.env.SOROBAN_RPC_URL,
    horizonUrl: process.env.HORIZON_URL,
    contractId: process.env.CONTRACT_ID,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
});
