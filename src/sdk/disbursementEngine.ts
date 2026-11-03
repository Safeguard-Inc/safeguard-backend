export function isValidStellarRecipient(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const clean = address.trim();
  return (clean.startsWith('G') || clean.startsWith('C')) && clean.length === 56;
}

export interface DisbursementOrder {
  recipient: string;
  token: string;
  amount: bigint | string;
  memo?: string;
}

export interface ValidatedDisbursementOrder {
  orderIndex: number;
  recipient: string;
  token: string;
  amountStroops: bigint;
  memo?: string;
}

export interface RejectedDisbursementOrder {
  orderIndex: number;
  recipient: string;
  amount: string;
  reason: string;
}

export interface DisbursementExecutionChunk {
  chunkIndex: number;
  orders: ValidatedDisbursementOrder[];
  chunkVolumeStroops: bigint;
  estimatedFeeStroops: bigint;
}

export interface DisbursementExecutionPlan {
  totalOrders: number;
  validOrdersCount: number;
  rejectedOrdersCount: number;
  totalVolumeStroops: bigint;
  totalEstimatedFeesStroops: bigint;
  chunks: DisbursementExecutionChunk[];
  rejectedOrders: RejectedDisbursementOrder[];
  readyForExecution: boolean;
}

export interface DisbursementEngineConfig {
  maxOrdersPerChunk?: number;
  baseFeePerOrderStroops?: bigint;
  minPaymentStroops?: bigint;
  denylist?: Set<string>;
}

export class EnterpriseBatchDisbursementEngine {
  /**
   * Plans and optimizes batch disbursements into partitioned chunks with strict validation.
   */
  public static plan(
    orders: DisbursementOrder[],
    config: DisbursementEngineConfig = {}
  ): DisbursementExecutionPlan {
    const maxPerChunk = config.maxOrdersPerChunk ?? 20;
    const baseFeePerOrder = config.baseFeePerOrderStroops ?? 100n;
    const minPayment = config.minPaymentStroops ?? 1n;
    const denylist = config.denylist ?? new Set<string>();

    const validOrders: ValidatedDisbursementOrder[] = [];
    const rejectedOrders: RejectedDisbursementOrder[] = [];
    let totalVolumeStroops = 0n;

    orders.forEach((order, index) => {
      // 1. Recipient validity
      if (!order.recipient || !isValidStellarRecipient(order.recipient)) {
        rejectedOrders.push({
          orderIndex: index,
          recipient: order.recipient || '',
          amount: String(order.amount),
          reason: 'Invalid Stellar recipient account address or Soroban contract ID',
        });
        return;
      }

      // 2. Denylist screening
      if (denylist.has(order.recipient)) {
        rejectedOrders.push({
          orderIndex: index,
          recipient: order.recipient,
          amount: String(order.amount),
          reason: 'Recipient is denylisted under OFAC / compliance policy',
        });
        return;
      }

      // 3. Amount parsing
      let amountBn: bigint;
      try {
        amountBn = BigInt(order.amount);
      } catch {
        rejectedOrders.push({
          orderIndex: index,
          recipient: order.recipient,
          amount: String(order.amount),
          reason: 'Amount must be an integer string in stroops',
        });
        return;
      }

      // 4. Minimum payment / anti-dusting threshold
      if (amountBn < minPayment) {
        rejectedOrders.push({
          orderIndex: index,
          recipient: order.recipient,
          amount: String(order.amount),
          reason: `Payment amount (${amountBn}) is below minimum gateway threshold (${minPayment})`,
        });
        return;
      }

      validOrders.push({
        orderIndex: index,
        recipient: order.recipient,
        token: order.token,
        amountStroops: amountBn,
        memo: order.memo,
      });

      totalVolumeStroops += amountBn;
    });

    // Partition into chunks
    const chunks: DisbursementExecutionChunk[] = [];
    let currentChunkOrders: ValidatedDisbursementOrder[] = [];
    let currentChunkVolume = 0n;

    validOrders.forEach((vo) => {
      currentChunkOrders.push(vo);
      currentChunkVolume += vo.amountStroops;

      if (currentChunkOrders.length >= maxPerChunk) {
        chunks.push({
          chunkIndex: chunks.length + 1,
          orders: currentChunkOrders,
          chunkVolumeStroops: currentChunkVolume,
          estimatedFeeStroops: BigInt(currentChunkOrders.length) * baseFeePerOrder + 500n,
        });
        currentChunkOrders = [];
        currentChunkVolume = 0n;
      }
    });

    if (currentChunkOrders.length > 0) {
      chunks.push({
        chunkIndex: chunks.length + 1,
        orders: currentChunkOrders,
        chunkVolumeStroops: currentChunkVolume,
        estimatedFeeStroops: BigInt(currentChunkOrders.length) * baseFeePerOrder + 500n,
      });
    }

    const totalEstimatedFeesStroops = chunks.reduce((acc, c) => acc + c.estimatedFeeStroops, 0n);

    return {
      totalOrders: orders.length,
      validOrdersCount: validOrders.length,
      rejectedOrdersCount: rejectedOrders.length,
      totalVolumeStroops,
      totalEstimatedFeesStroops,
      chunks,
      rejectedOrders,
      readyForExecution: validOrders.length > 0 && rejectedOrders.length === 0,
    };
  }
}
