export type FeeTier = 'low' | 'normal' | 'priority';

export interface FeeEstimate {
  tier: FeeTier;
  baseFeeStroops: number;
  resourceFeeStroops: number;
  totalEstimatedFeeStroops: number;
  totalEstimatedFeeXlm: string;
  isEscrow: boolean;
}

export type PaymentDecision = 'APPROVE' | 'FLAG' | 'BLOCK';

export interface PaymentParams {
  sender: string;
  recipient: string;
  token: string;
  amount: string; // stroops or lowest unit as string for precision
}

export interface SimulationResult {
  decision: PaymentDecision;
  reason: string;
  reasonCode: number;
  isEscrow: boolean;
  spendCap: string;
  estimatedFeeStroops: number;
  timestamp: number;
}

export type EscrowStatus = 'Pending' | 'Released' | 'Refunded';

export interface EscrowRecord {
  id: number;
  sender: string;
  recipient: string;
  token: string;
  amount: string;
  createdAt: number;
  releaseAfter: number;
  status: EscrowStatus;
}

export interface NetworkConfig {
  rpcUrl: string;
  networkPassphrase: string;
  paymentContractId: string;
  policyContractId: string;
}

export const TESTNET_CONFIG: NetworkConfig = {
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  paymentContractId: 'CDC6KVX7QT7CD3GOVGX44NQUNS7FMSZKIAXTV3TDGSXQKJRQMDZRSRCN',
  policyContractId: 'CCXFDOLLLFZKAG7X6AKN2YLKET5F5X565IHZXPOAGCM7W6MJG5WKANLN',
};

export interface TokenMetadata {
  symbol: string;
  name: string;
  contractId: string;
  decimals: number;
}

export const KNOWN_SAC_TOKENS: Record<string, TokenMetadata> = {
  XLM: {
    symbol: 'XLM',
    name: 'Native Lumens SAC',
    contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    decimals: 7,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Circle SAC)',
    contractId: 'CAQCFV4HYQ5CQN5Q6A5DGLWDF4774CG2C236DMCPOATOPMD7M7FD3U2B',
    decimals: 7,
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin (Circle SAC)',
    contractId: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWPGF32X2O2GBU32VFB',
    decimals: 7,
  },
  PYUSD: {
    symbol: 'PYUSD',
    name: 'PayPal USD (SAC)',
    contractId: 'CD4NREK465452V2N3QHQG6J4W743RCEQY2C2W6A7R4RPOEFD4O2USAC4',
    decimals: 7,
  },
};