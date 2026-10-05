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
  paymentContractId: 'CBLQLJAG72M4XQRJMQHSKYIFVHQD7LNTNOQH2GRMCMBWMSLBSLTGTJC7',
  policyContractId: 'CDVME6OPYZO6RAIWRFKLI3ACZHPNZK7GDBIX7YSIER3QLA2SO47QX5IB',
};
