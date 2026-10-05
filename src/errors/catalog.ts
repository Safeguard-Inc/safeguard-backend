/**
 * ============================================================================
 * Safeguard Inc. - Canonical Error Code Catalog
 * ============================================================================
 * Total Error Codes: 270
 * Domains: Host & Soroban VM, Policy Engine & Rules, Payment & SAC Tokens, Escrow & Timelocks, Identity & Sanctions, Auth & Governance, SDK & API Client, Audit & Integrity, Config & Deployment
 *
 * Each error code is assigned an explicit numeric code, mnemonic identifier,
 * operational domain, HTTP status mapping, description, and recovery hint.
 * ============================================================================
 */

export interface ErrorDefinition {
  code: number;
  mnemonic: string;
  domain: string;
  httpStatus: number;
  description: string;
  recoveryHint: string;
}

export const ERROR_CATALOG: Record<number, ErrorDefinition> = {
  1000: {
    code: 1000,
    mnemonic: "HOST_BUDGET_EXCEEDED",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Soroban CPU or memory instruction budget exhausted during invocation",
    recoveryHint: "Increase budget simulation limits or batch fewer operations"
  },
  1001: {
    code: 1001,
    mnemonic: "INVALID_LEDGER_SEQUENCE",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "Transaction submitted against an expired or future ledger sequence number",
    recoveryHint: "Fetch current ledger sequence from Horizon/RPC before resubmitting"
  },
  1002: {
    code: 1002,
    mnemonic: "REENTRANCY_DETECTED",
    domain: "Host & Soroban VM",
    httpStatus: 409,
    description: "Cross-contract call recursion detected in policy-guarded execution",
    recoveryHint: "Refactor contract calls to follow checks-effects-interactions pattern"
  },
  1003: {
    code: 1003,
    mnemonic: "STORAGE_FOOTPRINT_EXCEEDED",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Transaction footprint exceeds maximum ledger entry read/write limits",
    recoveryHint: "Split transaction into smaller batches or optimize data key storage"
  },
  1004: {
    code: 1004,
    mnemonic: "ENTRY_TTL_EXPIRED",
    domain: "Host & Soroban VM",
    httpStatus: 410,
    description: "Target contract instance or storage entry TTL has expired and needs archival restoration",
    recoveryHint: "Invoke extend_ttl or restore footprint before contract interaction"
  },
  1005: {
    code: 1005,
    mnemonic: "HOST_OBJECT_HANDLE_INVALID",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Host object reference is dangling or corrupted in Soroban runtime",
    recoveryHint: "Ensure object lifecycle is preserved across cross-contract boundaries"
  },
  1006: {
    code: 1006,
    mnemonic: "HOST_WASM_PARSE_FAILURE",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "WASM bytecode failed static verification on host runtime",
    recoveryHint: "Recompile WASM with target wasm32v1-none and verify exports"
  },
  1007: {
    code: 1007,
    mnemonic: "STACK_OVERFLOW",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Soroban VM call stack depth limit reached",
    recoveryHint: "Reduce call depth and simplify nested function execution"
  },
  1008: {
    code: 1008,
    mnemonic: "OUT_OF_GAS",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Resource fee paid insufficient for instruction units consumed",
    recoveryHint: "Estimate gas via simulateTransaction and set adequate resource fees"
  },
  1009: {
    code: 1009,
    mnemonic: "ARITHMETIC_OVERFLOW",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Integer overflow occurred during host mathematical evaluation",
    recoveryHint: "Ensure all amounts fit within i128 checked arithmetic bounds"
  },
  1010: {
    code: 1010,
    mnemonic: "ARITHMETIC_UNDERFLOW",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Integer underflow occurred during balance deduction",
    recoveryHint: "Validate balance before executing sub operations"
  },
  1011: {
    code: 1011,
    mnemonic: "DIVISION_BY_ZERO",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "Attempted division by zero in fee or weight calculation",
    recoveryHint: "Ensure divisor is strictly positive before invoking calculation"
  },
  1012: {
    code: 1012,
    mnemonic: "UNREGISTERED_CONTRACT",
    domain: "Host & Soroban VM",
    httpStatus: 404,
    description: "Target contract address does not exist on the current ledger",
    recoveryHint: "Verify network and deploy contract to current network before calling"
  },
  1013: {
    code: 1013,
    mnemonic: "INVALID_CONTRACT_TYPE",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "UDT contract type deserialization failed for payload",
    recoveryHint: "Match client SDK struct definition with contract ABI specification"
  },
  1014: {
    code: 1014,
    mnemonic: "STORAGE_KEY_COLLISION",
    domain: "Host & Soroban VM",
    httpStatus: 409,
    description: "Instance storage key already exists in write set",
    recoveryHint: "Use deterministic unique composite keys for persistent records"
  },
  1015: {
    code: 1015,
    mnemonic: "FOOTPRINT_READ_ONLY_VIOLATION",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Attempted write to a ledger entry marked read-only in footprint",
    recoveryHint: "Include writable entries in transaction footprint write set"
  },
  1016: {
    code: 1016,
    mnemonic: "HOST_CPU_LIMIT_REACHED",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "CPU instruction count hit hard ledger cap",
    recoveryHint: "Optimize loops and avoid repeated vector cloning"
  },
  1017: {
    code: 1017,
    mnemonic: "HOST_MEMORY_LIMIT_REACHED",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Host memory allocation exceeded byte cap",
    recoveryHint: "Use compact ByteSlice arrays instead of nested vectors"
  },
  1018: {
    code: 1018,
    mnemonic: "CROSS_CALL_DEPTH_EXCEEDED",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Cross-contract invocation depth exceeded limit of 10",
    recoveryHint: "Flatten invocation hierarchy or use asynchronous event choreography"
  },
  1019: {
    code: 1019,
    mnemonic: "EVENT_PAYLOAD_TOO_LARGE",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "Contract event emission exceeds maximum payload size",
    recoveryHint: "Emit indexed hashes or compact identifiers rather than full bodies"
  },
  1020: {
    code: 1020,
    mnemonic: "INVALID_CONTRACT_ID_FORMAT",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "Contract ID is not a valid 32-byte hex or C... StrKey",
    recoveryHint: "Format contract ID according to SEP-0023 StrKey specifications"
  },
  1021: {
    code: 1021,
    mnemonic: "LEDGER_TIMESTAMP_DRIFT",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "Ledger timestamp is outside expected acceptable drift window",
    recoveryHint: "Synchronize node clock with Stellar consensus cluster time"
  },
  1022: {
    code: 1022,
    mnemonic: "SOROBAN_INTERNAL_ERROR",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: "Unhandled internal error inside host environment",
    recoveryHint: "Report issue to Stellar Core repository with host diagnostics"
  },
  1023: {
    code: 1023,
    mnemonic: "RESOURCE_FEE_BELOW_MINIMUM",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "Supplied resource fee does not satisfy network minimum base fee",
    recoveryHint: "Query network fee stats endpoint and supply recommended inclusion fee"
  },
  1024: {
    code: 1024,
    mnemonic: "TRANSACTION_MALFORMED",
    domain: "Host & Soroban VM",
    httpStatus: 400,
    description: "Host failed to parse envelope XDR structure",
    recoveryHint: "Validate XDR envelope with stellar-sdk before dispatch"
  },
  1025: {
    code: 1025,
    mnemonic: "INVALID_SOURCE_ACCOUNT",
    domain: "Host & Soroban VM",
    httpStatus: 404,
    description: "Transaction source account is not funded on testnet/mainnet",
    recoveryHint: "Fund source account with testnet Friendbot or activate account"
  },
  1026: {
    code: 1026,
    mnemonic: "SIGNATURE_VERIFICATION_FAILED",
    domain: "Host & Soroban VM",
    httpStatus: 401,
    description: "Cryptographic signature does not match public key in envelope",
    recoveryHint: "Verify private key derivation and signature payload hash"
  },
  1027: {
    code: 1027,
    mnemonic: "NONCE_MISMATCH",
    domain: "Host & Soroban VM",
    httpStatus: 409,
    description: "Account sequence number does not increment prior ledger state",
    recoveryHint: "Query latest sequence number from account RPC before signing"
  },
  1028: {
    code: 1028,
    mnemonic: "UNSUPPORTED_HOST_FUNCTION",
    domain: "Host & Soroban VM",
    httpStatus: 501,
    description: "Host function is not available in current protocol version",
    recoveryHint: "Verify protocol version compatibility (minimum Protocol 22)"
  },
  1029: {
    code: 1029,
    mnemonic: "STORAGE_ENTRY_NOT_FOUND",
    domain: "Host & Soroban VM",
    httpStatus: 404,
    description: "Target key does not exist in instance or persistent storage",
    recoveryHint: "Initialize storage record before attempting read access"
  },
  2000: {
    code: 2000,
    mnemonic: "POLICY_NOT_ACTIVE",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Compliance policy exists but is currently deactivated",
    recoveryHint: "Activate policy version via admin credentials"
  },
  2001: {
    code: 2001,
    mnemonic: "POLICY_NOT_FOUND",
    domain: "Policy Engine & Rules",
    httpStatus: 404,
    description: "No compliance policy registered for the requested token or identifier",
    recoveryHint: "Register policy version before initiating evaluated transfers"
  },
  2002: {
    code: 2002,
    mnemonic: "POLICY_ALREADY_EXISTS",
    domain: "Policy Engine & Rules",
    httpStatus: 409,
    description: "A policy with this identifier has already been registered",
    recoveryHint: "Bump version sequence number to register an updated policy"
  },
  2003: {
    code: 2003,
    mnemonic: "RULE_PRECEDENCE_MISMATCH",
    domain: "Policy Engine & Rules",
    httpStatus: 422,
    description: "Evaluation precedence conflicting between blocking and flagging rules",
    recoveryHint: "Ensure rule precedence adheres to fail-closed priority hierarchy"
  },
  2004: {
    code: 2004,
    mnemonic: "RULE_EVALUATION_TIMEOUT",
    domain: "Policy Engine & Rules",
    httpStatus: 504,
    description: "Deterministic evaluation exceeded cycle limit",
    recoveryHint: "Simplify rule complexity and reduce nested rule references"
  },
  2005: {
    code: 2005,
    mnemonic: "ALLOWLIST_REQUIRED",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Sender or recipient is not present in approved allowlist registry",
    recoveryHint: "Submit account KYC proof to be registered on the compliance allowlist"
  },
  2006: {
    code: 2006,
    mnemonic: "DENYLIST_MATCHED",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Account is explicitly designated on an active denylist",
    recoveryHint: "Contact compliance administrator to appeal denylist status"
  },
  2007: {
    code: 2007,
    mnemonic: "SANCTIONS_MATCHED",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Target entity matched an active international sanctions dataset",
    recoveryHint: "Transaction blocked due to mandatory sanctions screening rules"
  },
  2008: {
    code: 2008,
    mnemonic: "JURISDICTION_PROHIBITED",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Transaction originates from or terminates in an embargoed jurisdiction",
    recoveryHint: "Comply with regional jurisdictional regulatory requirements"
  },
  2009: {
    code: 2009,
    mnemonic: "JURISDICTION_UNKNOWN",
    domain: "Policy Engine & Rules",
    httpStatus: 422,
    description: "Account jurisdiction code is undefined in regional compliance map",
    recoveryHint: "Register certified ISO-3166 jurisdiction code for subject"
  },
  2010: {
    code: 2010,
    mnemonic: "ACCOUNT_FROZEN",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Account has been frozen by regulatory administrator",
    recoveryHint: "Await administrative review before retrying transfers"
  },
  2011: {
    code: 2011,
    mnemonic: "POLICY_VERSION_DEPRECATED",
    domain: "Policy Engine & Rules",
    httpStatus: 410,
    description: "Policy version has been superseded by a newer version",
    recoveryHint: "Upgrade client invocation to active policy version"
  },
  2012: {
    code: 2012,
    mnemonic: "RULE_PAYLOAD_CORRUPTED",
    domain: "Policy Engine & Rules",
    httpStatus: 500,
    description: "Rule record serialization in contract storage failed checksum",
    recoveryHint: "Re-register corrupted rule version under admin multi-sig"
  },
  2013: {
    code: 2013,
    mnemonic: "INVALID_ACTION_CODE",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Action code must be one of APPROVE (1), FLAG (2), or BLOCK (3)",
    recoveryHint: "Submit valid numeric action code in rule specification"
  },
  2014: {
    code: 2014,
    mnemonic: "INVALID_RULE_TYPE",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Rule type is not recognized by the evaluation engine",
    recoveryHint: "Choose from supported rule types: Allowlist, Denylist, Sanctions, Jurisdiction"
  },
  2015: {
    code: 2015,
    mnemonic: "DUPLICATE_RULE_ID",
    domain: "Policy Engine & Rules",
    httpStatus: 409,
    description: "Rule ID already exists within the target policy version",
    recoveryHint: "Assign unique UUID or formatted identifier for each rule record"
  },
  2016: {
    code: 2016,
    mnemonic: "MAX_RULES_EXCEEDED",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Policy version exceeds maximum limit of 256 rule records",
    recoveryHint: "Consolidate policy rules or partition into tiered policies"
  },
  2017: {
    code: 2017,
    mnemonic: "POLICY_HASH_MISMATCH",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Supplied policy configuration hash does not match computed digest",
    recoveryHint: "Verify JSON schema and canonical hash ordering before registration"
  },
  2018: {
    code: 2018,
    mnemonic: "TOKEN_NOT_BOUND",
    domain: "Policy Engine & Rules",
    httpStatus: 404,
    description: "Token contract address is not bound to this compliance policy",
    recoveryHint: "Invoke bind_token to attach policy to Stellar Asset Contract"
  },
  2019: {
    code: 2019,
    mnemonic: "TOKEN_ALREADY_BOUND",
    domain: "Policy Engine & Rules",
    httpStatus: 409,
    description: "Token is already bound to another active compliance policy",
    recoveryHint: "Unbind previous policy or migrate version bindings"
  },
  2020: {
    code: 2020,
    mnemonic: "RULE_PREDICATE_EVAL_ERROR",
    domain: "Policy Engine & Rules",
    httpStatus: 500,
    description: "Dynamic evaluation of rule predicate returned unexpected error",
    recoveryHint: "Inspect predicate logic and ensure inputs are within valid range"
  },
  2021: {
    code: 2021,
    mnemonic: "CONDITIONAL_FLAG_TRIGGERED",
    domain: "Policy Engine & Rules",
    httpStatus: 202,
    description: "Transaction flagged for asynchronous compliance team investigation",
    recoveryHint: "Transaction queued in flagging registry; monitor audit stream"
  },
  2022: {
    code: 2022,
    mnemonic: "SANCTIONS_DATASET_EXPIRED",
    domain: "Policy Engine & Rules",
    httpStatus: 422,
    description: "On-chain sanctions snapshot has lapsed its validity epoch",
    recoveryHint: "Refresh sanctions registry with updated certified merkle root"
  },
  2023: {
    code: 2023,
    mnemonic: "ALLOWLIST_MEMBERSHIP_EXPIRED",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Subject allowlist verification validity period has lapsed",
    recoveryHint: "Renew identity verification to refresh allowlist timestamp"
  },
  2024: {
    code: 2024,
    mnemonic: "HIGH_RISK_CORRIDOR_BLOCKED",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Corridor between source and destination jurisdiction is prohibited",
    recoveryHint: "Reroute transfer through approved compliant channels"
  },
  2025: {
    code: 2025,
    mnemonic: "VOLUME_VELOCITY_EXCEEDED",
    domain: "Policy Engine & Rules",
    httpStatus: 429,
    description: "Account cumulative transfer volume exceeded 24-hour limit",
    recoveryHint: "Wait for velocity cooling period or request tier limit increase"
  },
  2026: {
    code: 2026,
    mnemonic: "DAILY_TRANSACTION_COUNT_CAP",
    domain: "Policy Engine & Rules",
    httpStatus: 429,
    description: "Daily transaction frequency limit reached for account tier",
    recoveryHint: "Limit transaction frequency to conform to tier allowances"
  },
  2027: {
    code: 2027,
    mnemonic: "INELIGIBLE_FOR_AUTO_APPROVE",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Transaction attributes require manual compliance sign-off",
    recoveryHint: "Submit transaction for supervisor escalation in dashboard"
  },
  2028: {
    code: 2028,
    mnemonic: "POLICY_SUSPENDED_BY_CIRCUIT_BREAKER",
    domain: "Policy Engine & Rules",
    httpStatus: 503,
    description: "Circuit breaker tripped due to anomalous high failure rate",
    recoveryHint: "Wait for security review or reset circuit breaker via admin authority"
  },
  2029: {
    code: 2029,
    mnemonic: "INVALID_EVALUATION_INPUT",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Input payload passed to evaluate() is missing required subject fields",
    recoveryHint: "Provide complete EvaluationInput struct with valid account addresses"
  },
  2030: {
    code: 2030,
    mnemonic: "POLICY_BINDING_REVOKED",
    domain: "Policy Engine & Rules",
    httpStatus: 403,
    description: "Policy binding was revoked by asset issuer",
    recoveryHint: "Re-establish authorization binding with asset issuer key"
  },
  2031: {
    code: 2031,
    mnemonic: "UNRECOGNIZED_POLICY_EVENT",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Policy contract emitted an unhandled lifecycle event code",
    recoveryHint: "Update backend event indexer schema to parse new event type"
  },
  2032: {
    code: 2032,
    mnemonic: "MERKLE_ROOT_UNINITIALIZED",
    domain: "Policy Engine & Rules",
    httpStatus: 404,
    description: "Sanctions merkle tree root has not been initialized",
    recoveryHint: "Deploy initial sanctions root before enabling sanctions rule"
  },
  2033: {
    code: 2033,
    mnemonic: "UNAUTHORIZED_REGISTRY_UPDATE",
    domain: "Policy Engine & Rules",
    httpStatus: 401,
    description: "Caller does not hold the Registry Authority capability",
    recoveryHint: "Sign registry mutation with registered authority keypair"
  },
  2034: {
    code: 2034,
    mnemonic: "POLICY_NAME_TOO_LONG",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Policy name string exceeds 64 byte storage limit",
    recoveryHint: "Shorten policy name identifier"
  },
  2035: {
    code: 2035,
    mnemonic: "CONFLICTING_RULE_DIRECTIVE",
    domain: "Policy Engine & Rules",
    httpStatus: 409,
    description: "Two matching rules emit contradictory actions at same priority",
    recoveryHint: "Specify explicit rule priority order to break ties"
  },
  2036: {
    code: 2036,
    mnemonic: "THRESHOLD_WEIGHT_INVALID",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Rule evaluation score threshold is non-monotonic",
    recoveryHint: "Ensure threshold values form a strictly increasing sequence"
  },
  2037: {
    code: 2037,
    mnemonic: "REASON_CODE_UNKNOWN",
    domain: "Policy Engine & Rules",
    httpStatus: 400,
    description: "Evaluation emitted an unmapped reason code",
    recoveryHint: "Update client error catalog with newly introduced reason code"
  },
  2038: {
    code: 2038,
    mnemonic: "POLICY_LOCKED_PENDING_UPGRADE",
    domain: "Policy Engine & Rules",
    httpStatus: 423,
    description: "Policy contract is temporarily locked during version transition",
    recoveryHint: "Retry request once migration transaction confirms on-chain"
  },
  2039: {
    code: 2039,
    mnemonic: "REGISTRY_COMPACT_REQUIRED",
    domain: "Policy Engine & Rules",
    httpStatus: 507,
    description: "Persistent registry size exceeds memory threshold; requires compaction",
    recoveryHint: "Trigger compaction maintenance job to prune tombstoned keys"
  },
  3000: {
    code: 3000,
    mnemonic: "INSUFFICIENT_BALANCE",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Sender has insufficient balance to complete payment",
    recoveryHint: "Ensure sender account has adequate token balance including fees"
  },
  3001: {
    code: 3001,
    mnemonic: "SAC_INVOCATION_FAILED",
    domain: "Payment & SAC Tokens",
    httpStatus: 502,
    description: "Stellar Asset Contract transfer invocation returned error",
    recoveryHint: "Verify token issuer trustline and SAC contract authorization"
  },
  3002: {
    code: 3002,
    mnemonic: "INVALID_DECIMAL_PRECISION",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Amount exceeds token decimal precision (maximum 7 decimals for SAC)",
    recoveryHint: "Round amount to 7 decimal places before submitting"
  },
  3003: {
    code: 3003,
    mnemonic: "UNAUTHORIZED_TRANSFER_FROM",
    domain: "Payment & SAC Tokens",
    httpStatus: 401,
    description: "Contract does not have allowance to debit tokens from sender",
    recoveryHint: "Invoke approve() on SAC token contract to grant spender allowance"
  },
  3004: {
    code: 3004,
    mnemonic: "SPEND_CAP_EXCEEDED",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Transaction amount exceeds instantaneous spend cap threshold",
    recoveryHint: "Amounts above spend cap are automatically diverted to escrow for review"
  },
  3005: {
    code: 3005,
    mnemonic: "SLIPPAGE_EXCEEDED",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Price slippage exceeded user tolerance during payment swap",
    recoveryHint: "Adjust slippage tolerance or wait for market liquidity stabilization"
  },
  3006: {
    code: 3006,
    mnemonic: "FEE_EXCEEDS_ALLOWANCE",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment routing fee exceeds configured maximum limit",
    recoveryHint: "Increase fee tolerance or route through lower-cost liquidity pool"
  },
  3007: {
    code: 3007,
    mnemonic: "ZERO_AMOUNT_PAYMENT",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment amount must be strictly greater than zero",
    recoveryHint: "Specify an amount greater than 0 stroops"
  },
  3008: {
    code: 3008,
    mnemonic: "NEGATIVE_AMOUNT_PAYMENT",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Negative payment amount is invalid",
    recoveryHint: "Amount must be a positive integer representation"
  },
  3009: {
    code: 3009,
    mnemonic: "TOKEN_NOT_ACCEPTABLE",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Asset is not in the list of accepted settlement currencies",
    recoveryHint: "Use an approved payment token (e.g. USDC, EURC, XLM)"
  },
  3010: {
    code: 3010,
    mnemonic: "RECIPIENT_DENYLISTED",
    domain: "Payment & SAC Tokens",
    httpStatus: 403,
    description: "Payment recipient address is marked on active denylist",
    recoveryHint: "Change recipient or request compliance review"
  },
  3011: {
    code: 3011,
    mnemonic: "SENDER_DENYLISTED",
    domain: "Payment & SAC Tokens",
    httpStatus: 403,
    description: "Payment sender address is marked on active denylist",
    recoveryHint: "Account restricted from making outgoing transfers"
  },
  3012: {
    code: 3012,
    mnemonic: "CIRCULAR_PAYMENT_LOOP",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment route forms an invalid cyclic self-transfer",
    recoveryHint: "Sender and recipient addresses must be distinct"
  },
  3013: {
    code: 3013,
    mnemonic: "MAX_PAYMENT_SIZE_EXCEEDED",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment exceeds maximum protocol payment size cap",
    recoveryHint: "Split high-value transfer into batch installments"
  },
  3014: {
    code: 3014,
    mnemonic: "MIN_PAYMENT_SIZE_VIOLATED",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment is smaller than network dust threshold",
    recoveryHint: "Increase payment amount above minimum threshold"
  },
  3015: {
    code: 3015,
    mnemonic: "SAC_CONTRACT_NOT_FOUND",
    domain: "Payment & SAC Tokens",
    httpStatus: 404,
    description: "Stellar Asset Contract for given asset code not deployed on network",
    recoveryHint: "Deploy SAC instance for classic asset using stellar contract deploy"
  },
  3016: {
    code: 3016,
    mnemonic: "PAYMENT_MEMO_TOO_LONG",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment transaction memo exceeds maximum byte length (28 bytes text)",
    recoveryHint: "Shorten memo or use 32-byte hash memo"
  },
  3017: {
    code: 3017,
    mnemonic: "MEMO_REQUIRED_BY_RECIPIENT",
    domain: "Payment & SAC Tokens",
    httpStatus: 422,
    description: "Recipient address is an exchange or custodial gateway requiring a memo",
    recoveryHint: "Provide required memo ID to ensure correct credit of funds"
  },
  3018: {
    code: 3018,
    mnemonic: "EXCHANGE_RATE_EXPIRED",
    domain: "Payment & SAC Tokens",
    httpStatus: 408,
    description: "Asset conversion rate quote has expired",
    recoveryHint: "Request fresh exchange rate quote before executing cross-currency payment"
  },
  3019: {
    code: 3019,
    mnemonic: "CROSS_CURRENCY_PATH_NOT_FOUND",
    domain: "Payment & SAC Tokens",
    httpStatus: 404,
    description: "No liquidity pool path found between source and destination assets",
    recoveryHint: "Ensure liquidity pool or orderbook offers exist for the asset pair"
  },
  3020: {
    code: 3020,
    mnemonic: "ROUTING_HOP_LIMIT_EXCEEDED",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment routing path exceeds maximum allowable hops (limit 3)",
    recoveryHint: "Select a more direct trading pair with higher liquidity"
  },
  3021: {
    code: 3021,
    mnemonic: "SETTLEMENT_CURRENCY_MISMATCH",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Settlement currency received does not match merchant requirement",
    recoveryHint: "Convert to exact target asset requested by payee"
  },
  3022: {
    code: 3022,
    mnemonic: "MERCHANT_FEE_OVER_LIMIT",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Calculated merchant processing fee exceeds ceiling",
    recoveryHint: "Review fee configuration schedule"
  },
  3023: {
    code: 3023,
    mnemonic: "TOKEN_DECIMALS_MISMATCH",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Decimals provided do not match asset contract specifications",
    recoveryHint: "Query token decimals metadata and adjust scaling factor"
  },
  3024: {
    code: 3024,
    mnemonic: "PARTIAL_PAYMENT_REJECTED",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Merchant configuration does not allow underpayments",
    recoveryHint: "Submit the exact invoice amount required"
  },
  3025: {
    code: 3025,
    mnemonic: "OVERPAYMENT_EXCEEDS_BUFFER",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Payment amount exceeds invoice amount beyond allowed buffer",
    recoveryHint: "Submit payment within accepted variance range"
  },
  3026: {
    code: 3026,
    mnemonic: "INVOICE_EXPIRED",
    domain: "Payment & SAC Tokens",
    httpStatus: 410,
    description: "Payment invoice has expired and can no longer be settled",
    recoveryHint: "Generate a new invoice to initiate payment"
  },
  3027: {
    code: 3027,
    mnemonic: "INVOICE_ALREADY_PAID",
    domain: "Payment & SAC Tokens",
    httpStatus: 409,
    description: "Payment invoice has already been settled",
    recoveryHint: "Invoice status is terminal; do not submit duplicate payments"
  },
  3028: {
    code: 3028,
    mnemonic: "PAYMENT_NONCE_REUSED",
    domain: "Payment & SAC Tokens",
    httpStatus: 409,
    description: "Unique payment reference nonce has already been consumed",
    recoveryHint: "Generate unique cryptographically random payment nonce"
  },
  3029: {
    code: 3029,
    mnemonic: "LIQUIDITY_POOL_FROZEN",
    domain: "Payment & SAC Tokens",
    httpStatus: 503,
    description: "Target liquidity pool is temporarily paused by administrator",
    recoveryHint: "Wait for pool to resume or select alternate routing pool"
  },
  3030: {
    code: 3030,
    mnemonic: "CURRENCY_CORRIDOR_DISABLED",
    domain: "Payment & SAC Tokens",
    httpStatus: 403,
    description: "Direct payment corridor between currency pair is disabled",
    recoveryHint: "Check corridor operational status in gateway config"
  },
  3031: {
    code: 3031,
    mnemonic: "UNSUPPORTED_ASSET_TYPE",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Asset type is not supported (only SAC and Native XLM supported)",
    recoveryHint: "Convert classic credit asset to SAC contract"
  },
  3032: {
    code: 3032,
    mnemonic: "UNAUTHORIZED_ASSET_ISSUER",
    domain: "Payment & SAC Tokens",
    httpStatus: 401,
    description: "Asset issuer is not authorized on compliance registry",
    recoveryHint: "Verify asset issuer identity on Stellar TOML directory"
  },
  3033: {
    code: 3033,
    mnemonic: "PAYMENT_EXECUTION_FAILED",
    domain: "Payment & SAC Tokens",
    httpStatus: 500,
    description: "Payment execution reverted during atomic batch settlement",
    recoveryHint: "Check contract logs for revert cause and retry"
  },
  3034: {
    code: 3034,
    mnemonic: "REFUND_TIMELOCK_ACTIVE",
    domain: "Payment & SAC Tokens",
    httpStatus: 423,
    description: "Payment refund cannot be processed until refund delay passes",
    recoveryHint: "Wait for refund window to open before requesting reversal"
  },
  3035: {
    code: 3035,
    mnemonic: "ALREADY_REFUNDED",
    domain: "Payment & SAC Tokens",
    httpStatus: 409,
    description: "Payment transaction has already been refunded",
    recoveryHint: "Payment has already been returned to original sender"
  },
  3036: {
    code: 3036,
    mnemonic: "REFUND_AMOUNT_EXCEEDS_ORIGINAL",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Requested refund amount exceeds original settlement amount",
    recoveryHint: "Refund amount must be less than or equal to original amount"
  },
  3037: {
    code: 3037,
    mnemonic: "SPLIT_PAYMENT_MISALLOCATION",
    domain: "Payment & SAC Tokens",
    httpStatus: 400,
    description: "Split recipient shares do not sum to 10,000 basis points",
    recoveryHint: "Verify split recipient percentage allocations total exactly 100%"
  },
  3038: {
    code: 3038,
    mnemonic: "MERCHANT_ACCOUNT_DEACTIVATED",
    domain: "Payment & SAC Tokens",
    httpStatus: 403,
    description: "Merchant receiver account is deactivated or closed",
    recoveryHint: "Contact merchant to reactivate receiver account"
  },
  3039: {
    code: 3039,
    mnemonic: "TREASURY_ACCOUNT_DRAINED",
    domain: "Payment & SAC Tokens",
    httpStatus: 503,
    description: "Fee rebate treasury has insufficient balance to sponsor gas",
    recoveryHint: "Replenish fee treasury balance"
  },
  4000: {
    code: 4000,
    mnemonic: "ESCROW_NOT_FOUND",
    domain: "Escrow & Timelocks",
    httpStatus: 404,
    description: "Escrow record with given ID does not exist",
    recoveryHint: "Verify escrow sequence ID before attempting action"
  },
  4001: {
    code: 4001,
    mnemonic: "ESCROW_ALREADY_SETTLED",
    domain: "Escrow & Timelocks",
    httpStatus: 409,
    description: "Escrow has already been released to recipient",
    recoveryHint: "Escrow is in terminal Settled state"
  },
  4002: {
    code: 4002,
    mnemonic: "ESCROW_ALREADY_REFUNDED",
    domain: "Escrow & Timelocks",
    httpStatus: 409,
    description: "Escrow has already been returned to depositor",
    recoveryHint: "Escrow is in terminal Refunded state"
  },
  4003: {
    code: 4003,
    mnemonic: "ESCROW_TIMELOCK_ACTIVE",
    domain: "Escrow & Timelocks",
    httpStatus: 423,
    description: "Escrow release condition timelock has not yet expired",
    recoveryHint: "Wait until ledger timestamp passes lockup threshold"
  },
  4004: {
    code: 4004,
    mnemonic: "ARBITER_UNAUTHORIZED",
    domain: "Escrow & Timelocks",
    httpStatus: 401,
    description: "Signer is not the designated arbiter for this escrow",
    recoveryHint: "Only designated arbiter or admin can resolve escrow dispute"
  },
  4005: {
    code: 4005,
    mnemonic: "DISPUTE_WINDOW_EXPIRED",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Window for lodging an escrow dispute has closed",
    recoveryHint: "Disputes must be raised prior to dispute deadline"
  },
  4006: {
    code: 4006,
    mnemonic: "DISPUTE_ALREADY_LOGGED",
    domain: "Escrow & Timelocks",
    httpStatus: 409,
    description: "A dispute has already been filed for this escrow",
    recoveryHint: "Await arbiter resolution on existing dispute ticket"
  },
  4007: {
    code: 4007,
    mnemonic: "ESCROW_DEPOSIT_MISMATCH",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Deposited amount does not match escrow terms",
    recoveryHint: "Deposit exact agreed escrow balance"
  },
  4008: {
    code: 4008,
    mnemonic: "PARTIAL_RELEASE_UNSUPPORTED",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Escrow contract terms require full atomic release",
    recoveryHint: "Execute full release or adjust escrow contract terms"
  },
  4009: {
    code: 4009,
    mnemonic: "ESCROW_RELEASE_FAILED",
    domain: "Escrow & Timelocks",
    httpStatus: 500,
    description: "Transfer from escrow vault contract to beneficiary failed",
    recoveryHint: "Ensure escrow contract holds sufficient balance"
  },
  4010: {
    code: 4010,
    mnemonic: "INSUFFICIENT_ESCROW_COLLATERAL",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Collateral deposit is below required liquidation ratio",
    recoveryHint: "Top up collateral deposit to satisfy margin requirements"
  },
  4011: {
    code: 4011,
    mnemonic: "COLLATERAL_ALREADY_CLAIMED",
    domain: "Escrow & Timelocks",
    httpStatus: 409,
    description: "Escrow collateral has already been claimed by counterparty",
    recoveryHint: "Collateral is no longer available in vault"
  },
  4012: {
    code: 4012,
    mnemonic: "TIMELOCK_EXCEEDS_MAXIMUM",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Requested timelock duration exceeds maximum policy ceiling (1 year)",
    recoveryHint: "Set timelock duration to less than 31,536,000 seconds"
  },
  4013: {
    code: 4013,
    mnemonic: "TIMELOCK_BELOW_MINIMUM",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Requested timelock duration is below minimum cooling period (1 hour)",
    recoveryHint: "Set timelock duration greater than 3,600 seconds"
  },
  4014: {
    code: 4014,
    mnemonic: "UNAUTHORIZED_DEPOSITOR",
    domain: "Escrow & Timelocks",
    httpStatus: 401,
    description: "Signer is not authorized as the depositor for this escrow",
    recoveryHint: "Only registered depositor can fund escrow vault"
  },
  4015: {
    code: 4015,
    mnemonic: "UNAUTHORIZED_BENEFICIARY",
    domain: "Escrow & Timelocks",
    httpStatus: 401,
    description: "Signer is not authorized as beneficiary to claim escrow",
    recoveryHint: "Only registered beneficiary can trigger payout"
  },
  4016: {
    code: 4016,
    mnemonic: "ESCROW_EXPIRED",
    domain: "Escrow & Timelocks",
    httpStatus: 410,
    description: "Escrow validity duration has elapsed without fulfillment",
    recoveryHint: "Trigger expired escrow refund back to depositor"
  },
  4017: {
    code: 4017,
    mnemonic: "CONDITION_PROOF_INVALID",
    domain: "Escrow & Timelocks",
    httpStatus: 422,
    description: "Cryptographic preimage or oracle proof failed verification",
    recoveryHint: "Provide valid hash preimage matching escrow condition"
  },
  4018: {
    code: 4018,
    mnemonic: "HASH_LOCK_MISMATCH",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Supplied secret does not match SHA-256 hash lock commitment",
    recoveryHint: "Verify preimage hash matches initial escrow commitment"
  },
  4019: {
    code: 4019,
    mnemonic: "ORACLE_ATTESTATION_EXPIRED",
    domain: "Escrow & Timelocks",
    httpStatus: 408,
    description: "External oracle attestation timestamp has expired",
    recoveryHint: "Request freshly signed oracle price or fulfillment feed"
  },
  4020: {
    code: 4020,
    mnemonic: "UNTRUSTED_ORACLE_SIGNER",
    domain: "Escrow & Timelocks",
    httpStatus: 401,
    description: "Attestation signature does not match trusted oracle registry",
    recoveryHint: "Configure oracle public key in contract registry"
  },
  4021: {
    code: 4021,
    mnemonic: "MULTI_PARTY_SIG_INCOMPLETE",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Escrow release requires M-of-N threshold signatures",
    recoveryHint: "Collect all required counterparty signatures before dispatch"
  },
  4022: {
    code: 4022,
    mnemonic: "ESCROW_CANCELLED_BY_ADMIN",
    domain: "Escrow & Timelocks",
    httpStatus: 403,
    description: "Escrow was cancelled by emergency administration override",
    recoveryHint: "Funds have been returned to original depositor vault"
  },
  4023: {
    code: 4023,
    mnemonic: "DUPLICATE_ESCROW_ID",
    domain: "Escrow & Timelocks",
    httpStatus: 409,
    description: "Escrow ID already exists in storage registry",
    recoveryHint: "Use monotonic counter or UUID for new escrow entries"
  },
  4024: {
    code: 4024,
    mnemonic: "ESCROW_VAULT_PAUSED",
    domain: "Escrow & Timelocks",
    httpStatus: 503,
    description: "Escrow operations paused during protocol upgrade",
    recoveryHint: "Wait for protocol upgrade to complete"
  },
  4025: {
    code: 4025,
    mnemonic: "INSPECTION_PERIOD_ACTIVE",
    domain: "Escrow & Timelocks",
    httpStatus: 423,
    description: "Funds cannot be released while buyer inspection period is active",
    recoveryHint: "Wait for inspection period to elapse or obtain buyer approval"
  },
  4026: {
    code: 4026,
    mnemonic: "MILESTONE_NOT_COMPLETED",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Escrow tranche milestone has not been verified by inspector",
    recoveryHint: "Complete milestone deliverables and submit proof"
  },
  4027: {
    code: 4027,
    mnemonic: "MILESTONE_INDEX_OUT_OF_BOUNDS",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Milestone index exceeds defined tranche count",
    recoveryHint: "Specify valid milestone index within defined range"
  },
  4028: {
    code: 4028,
    mnemonic: "TRANCHE_ALREADY_RELEASED",
    domain: "Escrow & Timelocks",
    httpStatus: 409,
    description: "Target milestone tranche has already been paid out",
    recoveryHint: "Select next pending milestone tranche"
  },
  4029: {
    code: 4029,
    mnemonic: "ARBITRATION_FEE_UNPAID",
    domain: "Escrow & Timelocks",
    httpStatus: 402,
    description: "Filing dispute requires prepayment of arbitration fee",
    recoveryHint: "Deposit arbitration fee to escrow contract"
  },
  4030: {
    code: 4030,
    mnemonic: "SETTLEMENT_SPLIT_OVERFLOW",
    domain: "Escrow & Timelocks",
    httpStatus: 400,
    description: "Arbiter split ratio between parties exceeds 100%",
    recoveryHint: "Ensure party shares sum to exactly 10,000 basis points"
  },
  4031: {
    code: 4031,
    mnemonic: "AUTOMATIC_EXPIRATION_DISABLED",
    domain: "Escrow & Timelocks",
    httpStatus: 403,
    description: "Escrow configuration does not permit permissionless expiration",
    recoveryHint: "Contact arbiter to resolve stuck escrow"
  },
  4032: {
    code: 4032,
    mnemonic: "BUYER_REJECTION_RECORDED",
    domain: "Escrow & Timelocks",
    httpStatus: 403,
    description: "Buyer has recorded formal rejection of goods",
    recoveryHint: "Initiate arbitration resolution or dispute mediation"
  },
  4033: {
    code: 4033,
    mnemonic: "ESCROW_STATE_CORRUPTED",
    domain: "Escrow & Timelocks",
    httpStatus: 500,
    description: "Escrow state machine transitioned into an undefined state",
    recoveryHint: "Contact support to inspect contract storage ledger"
  },
  4034: {
    code: 4034,
    mnemonic: "RECOVERY_TIMELOCK_PENDING",
    domain: "Escrow & Timelocks",
    httpStatus: 423,
    description: "Emergency funds recovery timelock (30 days) is still active",
    recoveryHint: "Wait for emergency timelock countdown to complete"
  },
  5000: {
    code: 5000,
    mnemonic: "SUBJECT_UNVERIFIED",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "Identity proof for subject account has not been verified",
    recoveryHint: "Complete KYC verification through an authorized identity provider"
  },
  5001: {
    code: 5001,
    mnemonic: "SPECIALLY_DESIGNATED_NATIONAL",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Account is designated on OFAC SDN sanctions list",
    recoveryHint: "Prohibited under federal compliance and sanctions mandates"
  },
  5002: {
    code: 5002,
    mnemonic: "SECONDARY_SANCTIONS_RISK",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Transaction presents secondary sanctions exposure risk",
    recoveryHint: "Transaction rejected under conservative compliance enforcement"
  },
  5003: {
    code: 5003,
    mnemonic: "KYC_PROOF_EXPIRED",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "Identity credential has expired and must be reverified",
    recoveryHint: "Renew identity attestation to restore transaction privileges"
  },
  5004: {
    code: 5004,
    mnemonic: "MERKLE_PROOF_INVALID",
    domain: "Identity & Sanctions",
    httpStatus: 422,
    description: "Cryptographic inclusion proof failed against on-chain root",
    recoveryHint: "Verify leaf preimage, index, and sibling hashes"
  },
  5005: {
    code: 5005,
    mnemonic: "PEP_DETECTED",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Politically Exposed Person detected requiring enhanced due diligence",
    recoveryHint: "Submit enhanced due diligence documentation to compliance team"
  },
  5006: {
    code: 5006,
    mnemonic: "ADVERSE_MEDIA_FLAG",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Entity flagged in global adverse media screening database",
    recoveryHint: "Transaction queued for compliance analyst review"
  },
  5007: {
    code: 5007,
    mnemonic: "HIGH_RISK_JURISDICTION",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Entity associated with FATF high-risk monitored jurisdiction",
    recoveryHint: "Direct transfers to/from this jurisdiction are prohibited"
  },
  5008: {
    code: 5008,
    mnemonic: "IDENTITY_PROVIDER_UNTRUSTED",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "Identity attestation signed by uncertified KYC issuer",
    recoveryHint: "Provide credentials from an authorized Trust Anchor"
  },
  5009: {
    code: 5009,
    mnemonic: "CREDENTIAL_REVOKED",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "Identity credential was revoked by the issuing authority",
    recoveryHint: "Contact credential issuer to resolve revocation status"
  },
  5010: {
    code: 5010,
    mnemonic: "DID_RESOLVER_UNAVAILABLE",
    domain: "Identity & Sanctions",
    httpStatus: 503,
    description: "Decentralized Identifier resolver endpoint timed out",
    recoveryHint: "Retry transaction or verify DID document status"
  },
  5011: {
    code: 5011,
    mnemonic: "INVALID_CREDENTIAL_SIGNATURE",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "W3C Verifiable Credential signature verification failed",
    recoveryHint: "Ensure credential has not been altered or tampered with"
  },
  5012: {
    code: 5012,
    mnemonic: "SUBJECT_ADDRESS_MISMATCH",
    domain: "Identity & Sanctions",
    httpStatus: 400,
    description: "Attestation subject address does not match transaction sender",
    recoveryHint: "Present credential belonging to the active signing account"
  },
  5013: {
    code: 5013,
    mnemonic: "SANCTIONS_LIST_UPDATE_STALE",
    domain: "Identity & Sanctions",
    httpStatus: 422,
    description: "On-chain sanctions list has not been updated within 24h",
    recoveryHint: "Trigger sanctions sync daemon before processing high-value transfers"
  },
  5014: {
    code: 5014,
    mnemonic: "FUZZY_NAME_MATCH_AMBIGUOUS",
    domain: "Identity & Sanctions",
    httpStatus: 422,
    description: "Fuzzy screening match score falls in ambiguous review zone",
    recoveryHint: "Provide full legal name and date of birth for definitive screening"
  },
  5015: {
    code: 5015,
    mnemonic: "ENTITY_REGISTRATION_INVALID",
    domain: "Identity & Sanctions",
    httpStatus: 400,
    description: "Corporate entity LEI or registration number is invalid",
    recoveryHint: "Provide valid 20-character Legal Entity Identifier (LEI)"
  },
  5016: {
    code: 5016,
    mnemonic: "TRAVEL_RULE_PAYLOAD_MISSING",
    domain: "Identity & Sanctions",
    httpStatus: 422,
    description: "Transfer exceeds $3,000 threshold requiring Travel Rule IVMS101 data",
    recoveryHint: "Attach Travel Rule originator and beneficiary information"
  },
  5017: {
    code: 5017,
    mnemonic: "TRAVEL_RULE_VASP_UNVERIFIED",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "Counterparty VASP is not registered on trusted directory",
    recoveryHint: "Verify counterparty VASP through TRP or OpenVASP protocol"
  },
  5018: {
    code: 5018,
    mnemonic: "BENEFICIARY_INFO_INCOMPLETE",
    domain: "Identity & Sanctions",
    httpStatus: 400,
    description: "Beneficiary physical address or date of birth missing in payload",
    recoveryHint: "Include full beneficiary details in compliance payload"
  },
  5019: {
    code: 5019,
    mnemonic: "IDENTITY_COMMITMENT_EXISTS",
    domain: "Identity & Sanctions",
    httpStatus: 409,
    description: "A credential has already been committed for this account",
    recoveryHint: "Revoke previous credential before committing an update"
  },
  5020: {
    code: 5020,
    mnemonic: "ZERO_KNOWLEDGE_PROOF_REJECTED",
    domain: "Identity & Sanctions",
    httpStatus: 422,
    description: "zk-SNARK compliance proof verification failed on-chain",
    recoveryHint: "Regenerate zero-knowledge proof with valid witness inputs"
  },
  5021: {
    code: 5021,
    mnemonic: "ANONYMOUS_PROXY_DETECTED",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Transaction originated from known VPN/TOR exit node or mixing pool",
    recoveryHint: "Transactions through anonymizing infrastructure are blocked"
  },
  5022: {
    code: 5022,
    mnemonic: "AGE_VERIFICATION_FAILED",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Signer does not satisfy minimum age requirement (18+)",
    recoveryHint: "Account holder must meet legal age requirements"
  },
  5023: {
    code: 5023,
    mnemonic: "RESIDENCY_ATTESTATION_MISSING",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "Proof of residency required for this regulatory jurisdiction",
    recoveryHint: "Upload utility bill or bank statement proof of residency"
  },
  5024: {
    code: 5024,
    mnemonic: "WATCHLIST_NAME_SIMILARITY",
    domain: "Identity & Sanctions",
    httpStatus: 202,
    description: "Name similarity score exceeds alert threshold; flagged for review",
    recoveryHint: "Case opened for compliance analyst manual adjudication"
  },
  5025: {
    code: 5025,
    mnemonic: "IP_GEOLOCATION_MISMATCH",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Sender IP geolocation conflicts with registered KYC jurisdiction",
    recoveryHint: "Disable VPN or provide proof of temporary travel"
  },
  5026: {
    code: 5026,
    mnemonic: "BIOMETRIC_LIVENESS_FAILED",
    domain: "Identity & Sanctions",
    httpStatus: 401,
    description: "Biometric face match liveness verification expired or failed",
    recoveryHint: "Complete real-time liveness check in mobile application"
  },
  5027: {
    code: 5027,
    mnemonic: "DUAL_NATIONALITY_SANCTIONED",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Individual holds secondary nationality in sanctioned territory",
    recoveryHint: "Transaction prohibited under extraterritorial sanctions laws"
  },
  5028: {
    code: 5028,
    mnemonic: "MILITARY_END_USER_RESTRICTION",
    domain: "Identity & Sanctions",
    httpStatus: 403,
    description: "Recipient entity flagged under Military End-User regulations",
    recoveryHint: "Export control restrictions prohibit transfer"
  },
  5029: {
    code: 5029,
    mnemonic: "COMPLIANCE_HOLD_PENDING",
    domain: "Identity & Sanctions",
    httpStatus: 423,
    description: "Compliance hold placed on account pending regulatory inquiry",
    recoveryHint: "Await resolution of pending inquiry by compliance officer"
  },
  6000: {
    code: 6000,
    mnemonic: "UNAUTHORIZED_CALLER",
    domain: "Auth & Governance",
    httpStatus: 401,
    description: "Signer does not hold authorization to execute this function",
    recoveryHint: "Sign transaction with contract administrator keypair"
  },
  6001: {
    code: 6001,
    mnemonic: "ADMIN_KEY_REVOKED",
    domain: "Auth & Governance",
    httpStatus: 401,
    description: "Admin key has been revoked and replaced by multi-sig governance",
    recoveryHint: "Submit proposal through governance contract multi-sig"
  },
  6002: {
    code: 6002,
    mnemonic: "SIGNATURE_THRESHOLD_UNMET",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "Collected signatures do not meet multi-sig quorum threshold",
    recoveryHint: "Collect additional co-signer approvals before execution"
  },
  6003: {
    code: 6003,
    mnemonic: "EMERGENCY_PAUSE_ACTIVE",
    domain: "Auth & Governance",
    httpStatus: 503,
    description: "Contract is currently in Emergency Pause mode",
    recoveryHint: "Wait for emergency inspection to finish and unpause signal"
  },
  6004: {
    code: 6004,
    mnemonic: "UPGRADE_UNAUTHORIZED",
    domain: "Auth & Governance",
    httpStatus: 401,
    description: "Caller does not possess Contract Upgrade capability",
    recoveryHint: "Contract upgrades require 3-of-5 governance consensus"
  },
  6005: {
    code: 6005,
    mnemonic: "TIMELOCK_DELAY_NOT_MET",
    domain: "Auth & Governance",
    httpStatus: 423,
    description: "Governance proposal time-delay has not elapsed",
    recoveryHint: "Allow 48-hour timelock delay to pass before execution"
  },
  6006: {
    code: 6006,
    mnemonic: "PROPOSAL_ALREADY_EXECUTED",
    domain: "Auth & Governance",
    httpStatus: 409,
    description: "Governance proposal has already been executed",
    recoveryHint: "Proposal status is terminal; cannot execute twice"
  },
  6007: {
    code: 6007,
    mnemonic: "PROPOSAL_CANCELLED",
    domain: "Auth & Governance",
    httpStatus: 410,
    description: "Governance proposal was cancelled by emergency multisig",
    recoveryHint: "Proposal has been permanently cancelled"
  },
  6008: {
    code: 6008,
    mnemonic: "PROPOSAL_VOTING_CLOSED",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "Voting window for governance proposal has closed",
    recoveryHint: "Submit new proposal if voting deadline elapsed"
  },
  6009: {
    code: 6009,
    mnemonic: "VOTE_ALREADY_CAST",
    domain: "Auth & Governance",
    httpStatus: 409,
    description: "Signer has already cast a vote on this proposal",
    recoveryHint: "Votes cannot be cast multiple times per address"
  },
  6010: {
    code: 6010,
    mnemonic: "INSUFFICIENT_VOTING_POWER",
    domain: "Auth & Governance",
    httpStatus: 403,
    description: "Signer does not hold required governance token balance",
    recoveryHint: "Acquire governance voting tokens or delegate voting power"
  },
  6011: {
    code: 6011,
    mnemonic: "ROLE_ALREADY_ASSIGNED",
    domain: "Auth & Governance",
    httpStatus: 409,
    description: "Target address already possesses the assigned role",
    recoveryHint: "Address already holds target role privileges"
  },
  6012: {
    code: 6012,
    mnemonic: "ROLE_NOT_FOUND",
    domain: "Auth & Governance",
    httpStatus: 404,
    description: "Target address does not hold the role to be revoked",
    recoveryHint: "Verify role assignment before attempting revocation"
  },
  6013: {
    code: 6013,
    mnemonic: "SELF_REVOCATION_PREVENTED",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "Administrator cannot revoke their own final admin role",
    recoveryHint: "Designate a successor admin before revoking current credentials"
  },
  6014: {
    code: 6014,
    mnemonic: "MULTISIG_WEIGHT_ZERO",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "Signer weight cannot be zero in governance quorum",
    recoveryHint: "Assign positive integer weight to active co-signers"
  },
  6015: {
    code: 6015,
    mnemonic: "QUORUM_CEILING_EXCEEDED",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "Total quorum weight exceeds maximum allowable scale",
    recoveryHint: "Normalize signer weights within 1 to 100 range"
  },
  6016: {
    code: 6016,
    mnemonic: "REPLAY_NONCE_DETECTED",
    domain: "Auth & Governance",
    httpStatus: 409,
    description: "Cryptographic invocation nonce has already been used",
    recoveryHint: "Generate fresh random nonce for meta-transaction signature"
  },
  6017: {
    code: 6017,
    mnemonic: "EXPIRATION_TIME_IN_PAST",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "Authorization delegation signature expiration is in the past",
    recoveryHint: "Set expiration timestamp to a future ledger timestamp"
  },
  6018: {
    code: 6018,
    mnemonic: "DELEGATION_SCOPE_EXCEEDED",
    domain: "Auth & Governance",
    httpStatus: 403,
    description: "Delegated key attempted operation outside allowed method scope",
    recoveryHint: "Only invoke methods explicitly authorized in delegation proof"
  },
  6019: {
    code: 6019,
    mnemonic: "GAS_SPONSOR_REJECTED",
    domain: "Auth & Governance",
    httpStatus: 401,
    description: "Gas fee relayer rejected sponsorship for this transaction",
    recoveryHint: "Deposit fee credit or self-sponsor transaction fees"
  },
  6020: {
    code: 6020,
    mnemonic: "CIRCUIT_BREAKER_TRIPPED",
    domain: "Auth & Governance",
    httpStatus: 503,
    description: "Automated circuit breaker tripped due to anomalous contract event",
    recoveryHint: "Admin must investigate and reset circuit breaker state"
  },
  6021: {
    code: 6021,
    mnemonic: "RATE_LIMIT_HIT",
    domain: "Auth & Governance",
    httpStatus: 429,
    description: "Administrative invocation frequency exceeded per-minute limit",
    recoveryHint: "Throttle administrative requests to avoid rate limits"
  },
  6022: {
    code: 6022,
    mnemonic: "INVALID_GOVERNANCE_CONFIG",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "Governance parameters violate invariant constraints",
    recoveryHint: "Ensure quorum threshold is <= total signer weights"
  },
  6023: {
    code: 6023,
    mnemonic: "GUARDIAN_COOLDOWN_ACTIVE",
    domain: "Auth & Governance",
    httpStatus: 423,
    description: "Guardian key rotation is subject to a 7-day cooldown",
    recoveryHint: "Wait for security cooldown period to expire"
  },
  6024: {
    code: 6024,
    mnemonic: "BACKUP_KEY_NOT_CONFIGURED",
    domain: "Auth & Governance",
    httpStatus: 404,
    description: "Emergency recovery triggered but no backup key was registered",
    recoveryHint: "Register backup recovery key during contract initialization"
  },
  6025: {
    code: 6025,
    mnemonic: "UPGRADE_HASH_MISMATCH",
    domain: "Auth & Governance",
    httpStatus: 400,
    description: "WASM bytecode hash does not match hash approved in proposal",
    recoveryHint: "Deploy exact WASM binary that received governance approval"
  },
  6026: {
    code: 6026,
    mnemonic: "INITIALIZER_ALREADY_RUN",
    domain: "Auth & Governance",
    httpStatus: 409,
    description: "Contract initialize() method can only be executed once",
    recoveryHint: "Contract is already initialized and operational"
  },
  6027: {
    code: 6027,
    mnemonic: "WRONG_CALL_CONTEXT",
    domain: "Auth & Governance",
    httpStatus: 403,
    description: "Method can only be invoked from another contract via internal call",
    recoveryHint: "Do not invoke internal helper functions directly from user envelope"
  },
  6028: {
    code: 6028,
    mnemonic: "CROSS_ORG_CALL_UNAUTHORIZED",
    domain: "Auth & Governance",
    httpStatus: 401,
    description: "Cross-organization federation key not accepted",
    recoveryHint: "Register federation trust relationship before calling"
  },
  6029: {
    code: 6029,
    mnemonic: "DEPUTY_PERMISSIONS_REVOKED",
    domain: "Auth & Governance",
    httpStatus: 403,
    description: "Deputy operator permissions have been suspended",
    recoveryHint: "Request primary admin to re-enable operator capabilities"
  },
  7000: {
    code: 7000,
    mnemonic: "NETWORK_TIMEOUT",
    domain: "SDK & API Client",
    httpStatus: 504,
    description: "Soroban RPC network request timed out",
    recoveryHint: "Check network connection or switch to secondary RPC endpoint"
  },
  7001: {
    code: 7001,
    mnemonic: "RPC_NODE_UNREACHABLE",
    domain: "SDK & API Client",
    httpStatus: 503,
    description: "Configured Soroban RPC endpoint is offline or unreachable",
    recoveryHint: "Verify RPC URL status at https://soroban-testnet.stellar.org"
  },
  7002: {
    code: 7002,
    mnemonic: "SIMULATION_MISMATCH",
    domain: "SDK & API Client",
    httpStatus: 422,
    description: "On-chain execution diverged from local transaction simulation",
    recoveryHint: "Re-run simulateTransaction to refresh footprints and authorizations"
  },
  7003: {
    code: 7003,
    mnemonic: "XDR_DECODE_ERROR",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Failed to decode base64 XDR structure returned from RPC",
    recoveryHint: "Ensure client uses stellar-sdk matching current Protocol XDR"
  },
  7004: {
    code: 7004,
    mnemonic: "RATE_LIMIT_EXCEEDED",
    domain: "SDK & API Client",
    httpStatus: 429,
    description: "RPC requests exceeded per-second quota",
    recoveryHint: "Implement exponential backoff or use dedicated API key"
  },
  7005: {
    code: 7005,
    mnemonic: "INVALID_ADDRESS_CHECKSUM",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Stellar StrKey address failed CRC16 checksum validation",
    recoveryHint: "Verify address format (56 characters starting with G or C)"
  },
  7006: {
    code: 7006,
    mnemonic: "MISSING_TRANSACTION_SIGNATURE",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Transaction envelope submitted without required signatures",
    recoveryHint: "Sign envelope with Freighter, Albedo, or keypair before send"
  },
  7007: {
    code: 7007,
    mnemonic: "HORIZON_FALLBACK_FAILED",
    domain: "SDK & API Client",
    httpStatus: 502,
    description: "Horizon API fallback endpoint returned 500 error",
    recoveryHint: "Verify Horizon cluster health status"
  },
  7008: {
    code: 7008,
    mnemonic: "INVALID_BASE64_PAYLOAD",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Supplied string is not valid standard Base64 encoding",
    recoveryHint: "Sanitize base64 string and ensure correct padding"
  },
  7009: {
    code: 7009,
    mnemonic: "UNSUPPORTED_NETWORK_PASSPHRASE",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Network passphrase not recognized (expected testnet or public)",
    recoveryHint: "Set passphrase to 'Test SDF Network ; September 2015' for testnet"
  },
  7010: {
    code: 7010,
    mnemonic: "CONTRACT_ABI_NOT_FOUND",
    domain: "SDK & API Client",
    httpStatus: 404,
    description: "Contract specification stream missing from WASM binary",
    recoveryHint: "Ensure contract was compiled with Soroban SDK and contains contractspec"
  },
  7011: {
    code: 7011,
    mnemonic: "JSON_SERIALIZATION_FAILED",
    domain: "SDK & API Client",
    httpStatus: 500,
    description: "Failed to serialize JavaScript object to JSON string",
    recoveryHint: "Remove circular references before serialization"
  },
  7012: {
    code: 7012,
    mnemonic: "FREIGHTER_NOT_INSTALLED",
    domain: "SDK & API Client",
    httpStatus: 404,
    description: "Freighter wallet browser extension was not detected",
    recoveryHint: "Install Freighter wallet from https://www.freighter.app"
  },
  7013: {
    code: 7013,
    mnemonic: "USER_REJECTED_SIGNATURE",
    domain: "SDK & API Client",
    httpStatus: 403,
    description: "User declined signature prompt in wallet popup",
    recoveryHint: "Prompt user to approve signature when ready"
  },
  7014: {
    code: 7014,
    mnemonic: "UNSUPPORTED_WALLET_PROVIDER",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Selected wallet provider is not supported in this browser",
    recoveryHint: "Choose from supported wallets: Freighter, Albedo, or xBull"
  },
  7015: {
    code: 7015,
    mnemonic: "SOCKET_CONNECTION_CLOSED",
    domain: "SDK & API Client",
    httpStatus: 503,
    description: "WebSocket connection for real-time ledger streaming closed unexpectedly",
    recoveryHint: "SDK will automatically attempt reconnect with exponential backoff"
  },
  7016: {
    code: 7016,
    mnemonic: "PARSING_INT128_FAILED",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Failed to parse string into 128-bit big integer",
    recoveryHint: "Ensure string contains only valid decimal digits"
  },
  7017: {
    code: 7017,
    mnemonic: "CONFIG_NOT_LOADED",
    domain: "SDK & API Client",
    httpStatus: 500,
    description: "SafeguardClient initialized without required configuration",
    recoveryHint: "Supply valid ClientConfig object with rpcUrl and contract IDs"
  },
  7018: {
    code: 7018,
    mnemonic: "LEDGER_HISTORY_UNAVAILABLE",
    domain: "SDK & API Client",
    httpStatus: 404,
    description: "Target ledger sequence is beyond RPC node history retention",
    recoveryHint: "Query archival Horizon node for historical ledger data"
  },
  7019: {
    code: 7019,
    mnemonic: "EVENT_SUBSCRIPTION_FAILED",
    domain: "SDK & API Client",
    httpStatus: 502,
    description: "Failed to subscribe to contract topic events via RPC filter",
    recoveryHint: "Verify contract address and event topics in filter payload"
  },
  7020: {
    code: 7020,
    mnemonic: "BATCH_PAYMENT_SIZE_LIMIT",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Batch payment array exceeds client maximum size of 50 items",
    recoveryHint: "Partition payments into batches of 50 or fewer"
  },
  7021: {
    code: 7021,
    mnemonic: "RESPONSE_SCHEMA_VALIDATION_ERROR",
    domain: "SDK & API Client",
    httpStatus: 500,
    description: "Server response payload did not conform to Zod schema",
    recoveryHint: "Update client SDK to latest matching API release"
  },
  7022: {
    code: 7022,
    mnemonic: "METHOD_NOT_FOUND_ON_CONTRACT",
    domain: "SDK & API Client",
    httpStatus: 404,
    description: "Target method is not an exported function on contract",
    recoveryHint: "Inspect contract specification exports for valid method names"
  },
  7023: {
    code: 7023,
    mnemonic: "IDEMPOTENCY_KEY_MISSING",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "POST request requires unique Idempotency-Key header",
    recoveryHint: "Generate UUID v4 for Idempotency-Key header"
  },
  7024: {
    code: 7024,
    mnemonic: "IDEMPOTENCY_CONFLICT",
    domain: "SDK & API Client",
    httpStatus: 409,
    description: "Request with same Idempotency-Key is currently being processed",
    recoveryHint: "Wait for previous operation to complete before reusing key"
  },
  7025: {
    code: 7025,
    mnemonic: "SDK_VERSION_DEPRECATED",
    domain: "SDK & API Client",
    httpStatus: 426,
    description: "Client SDK version is below required minimum protocol version",
    recoveryHint: "Run npm update @safeguard/sdk to install latest release"
  },
  7026: {
    code: 7026,
    mnemonic: "INVALID_HEX_STRING",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "String is not a valid even-length hexadecimal string",
    recoveryHint: "Verify hex characters match regex ^[0-9a-fA-F]+$"
  },
  7027: {
    code: 7027,
    mnemonic: "INSUFFICIENT_FEE_ESTIMATE",
    domain: "SDK & API Client",
    httpStatus: 400,
    description: "Simulated fee is higher than client max fee setting",
    recoveryHint: "Increase maxFee parameter in transaction options"
  },
  7028: {
    code: 7028,
    mnemonic: "TRANSACTION_ABORTED",
    domain: "SDK & API Client",
    httpStatus: 499,
    description: "Transaction execution was cancelled by caller before submission",
    recoveryHint: "Operation cleanly aborted by caller"
  },
  7029: {
    code: 7029,
    mnemonic: "UNKNOWN_CLIENT_ERROR",
    domain: "SDK & API Client",
    httpStatus: 500,
    description: "Unclassified client SDK runtime exception",
    recoveryHint: "Inspect stack trace and check issue tracker"
  },
  8000: {
    code: 8000,
    mnemonic: "AUDIT_LOG_TAMPERED",
    domain: "Audit & Integrity",
    httpStatus: 500,
    description: "Cryptographic hash chain verification failed on audit records",
    recoveryHint: "Audit record sequence exhibits integrity violation; investigate immediately"
  },
  8001: {
    code: 8001,
    mnemonic: "HASH_CHAIN_BROKEN",
    domain: "Audit & Integrity",
    httpStatus: 500,
    description: "Previous block digest pointer does not match parent record hash",
    recoveryHint: "Data corruption or unrecorded mutation in append-only log"
  },
  8002: {
    code: 8002,
    mnemonic: "SEQUENCE_GAP_DETECTED",
    domain: "Audit & Integrity",
    httpStatus: 500,
    description: "Audit sequence counter skipped an integer index",
    recoveryHint: "Verify missing sequence number in transaction archive"
  },
  8003: {
    code: 8003,
    mnemonic: "PROOF_VERIFICATION_FAILED",
    domain: "Audit & Integrity",
    httpStatus: 422,
    description: "Merkle inclusion proof verification failed against batch root",
    recoveryHint: "Re-compute leaf digest and check sibling nodes"
  },
  8004: {
    code: 8004,
    mnemonic: "STORAGE_PROOF_INVALID",
    domain: "Audit & Integrity",
    httpStatus: 422,
    description: "State commitment proof does not match Stellar ledger state",
    recoveryHint: "Query fresh state proof from verified archive node"
  },
  8005: {
    code: 8005,
    mnemonic: "AUDIT_EVIDENCE_EXPIRED",
    domain: "Audit & Integrity",
    httpStatus: 410,
    description: "Evidence retention window has lapsed for audit package",
    recoveryHint: "Access cold archive storage for records older than 7 years"
  },
  8006: {
    code: 8006,
    mnemonic: "EVIDENCE_CHECKSUM_MISMATCH",
    domain: "Audit & Integrity",
    httpStatus: 400,
    description: "Evidence package archive checksum does not match manifest",
    recoveryHint: "Re-download evidence package and verify SHA-256"
  },
  8007: {
    code: 8007,
    mnemonic: "UNAUTHORIZED_AUDITOR",
    domain: "Audit & Integrity",
    httpStatus: 401,
    description: "Signer does not hold the certified Independent Auditor credential",
    recoveryHint: "Only accredited auditors can submit official audit reports"
  },
  8008: {
    code: 8008,
    mnemonic: "REPORT_ALREADY_FINALIZED",
    domain: "Audit & Integrity",
    httpStatus: 409,
    description: "Audit report has been signed and sealed into immutable state",
    recoveryHint: "Finalized reports cannot be edited; submit addendum report"
  },
  8009: {
    code: 8009,
    mnemonic: "INTEGRITY_ATTESTATION_FAILED",
    domain: "Audit & Integrity",
    httpStatus: 500,
    description: "Hardware enclave or TEE attestation failed signature check",
    recoveryHint: "Inspect TEE measurement quote and certificate chain"
  },
  8010: {
    code: 8010,
    mnemonic: "EVENT_DIGEST_MISMATCH",
    domain: "Audit & Integrity",
    httpStatus: 500,
    description: "Emitted event payload hash does not match logged audit entry",
    recoveryHint: "Verify event listener captured complete canonical payload"
  },
  8011: {
    code: 8011,
    mnemonic: "MISSING_PREDECESSOR_BLOCK",
    domain: "Audit & Integrity",
    httpStatus: 404,
    description: "Audit chain checkpoint references missing historical segment",
    recoveryHint: "Synchronize historical checkpoint blocks from archive"
  },
  8012: {
    code: 8012,
    mnemonic: "TIMESTAMP_NON_MONOTONIC",
    domain: "Audit & Integrity",
    httpStatus: 400,
    description: "Audit record timestamp is earlier than preceding record",
    recoveryHint: "Timestamps must strictly increase within the append-only log"
  },
  8013: {
    code: 8013,
    mnemonic: "REPRODUCIBLE_REPORT_FAILURE",
    domain: "Audit & Integrity",
    httpStatus: 500,
    description: "Deterministic rerun of policy verification produced differing result",
    recoveryHint: "Check for non-deterministic rule predicates or state divergence"
  },
  8014: {
    code: 8014,
    mnemonic: "REGULATOR_PACKAGE_SEAL_BROKEN",
    domain: "Audit & Integrity",
    httpStatus: 500,
    description: "Digital signature seal on regulatory compliance export is invalid",
    recoveryHint: "Re-export compliance package under authorized compliance key"
  },
  8015: {
    code: 8015,
    mnemonic: "AUDIT_VAULT_CAPACITY_REACHED",
    domain: "Audit & Integrity",
    httpStatus: 507,
    description: "On-chain audit accumulator reached maximum capacity",
    recoveryHint: "Roll accumulator root to archival storage checkpoint"
  },
  8016: {
    code: 8016,
    mnemonic: "RECORD_LOCKED_FOR_DISCOVERY",
    domain: "Audit & Integrity",
    httpStatus: 423,
    description: "Record cannot be purged while legal discovery freeze is active",
    recoveryHint: "Comply with active litigation hold mandate"
  },
  8017: {
    code: 8017,
    mnemonic: "UNSUPPORTED_DIGEST_ALGORITHM",
    domain: "Audit & Integrity",
    httpStatus: 400,
    description: "Hash algorithm is not supported (expected SHA-256 or BLAKE3)",
    recoveryHint: "Use SHA-256 for all cryptographic audit commitments"
  },
  8018: {
    code: 8018,
    mnemonic: "DISPUTE_PROOF_INSUFFICIENT",
    domain: "Audit & Integrity",
    httpStatus: 422,
    description: "Submitted dispute proof does not contain sufficient state witnesses",
    recoveryHint: "Include full transaction trace and event log witnesses"
  },
  8019: {
    code: 8019,
    mnemonic: "AUDIT_INDEX_OUT_OF_SYNC",
    domain: "Audit & Integrity",
    httpStatus: 503,
    description: "Secondary query index lags behind authoritative blockchain ledger",
    recoveryHint: "Wait for indexer synchronization to reach current ledger"
  },
  9000: {
    code: 9000,
    mnemonic: "CONFIG_SCHEMA_MISMATCH",
    domain: "Config & Deployment",
    httpStatus: 400,
    description: "Configuration object does not validate against target JSON schema",
    recoveryHint: "Review required fields and types in config specification"
  },
  9001: {
    code: 9001,
    mnemonic: "MISSING_ENVIRONMENT_VARIABLE",
    domain: "Config & Deployment",
    httpStatus: 500,
    description: "Required environment variable is undefined in execution context",
    recoveryHint: "Provide all required environment variables in .env file"
  },
  9002: {
    code: 9002,
    mnemonic: "CONTRACT_NOT_INITIALIZED",
    domain: "Config & Deployment",
    httpStatus: 503,
    description: "Contract deployed but initialize() has not been executed",
    recoveryHint: "Run deployment initialization script before handling traffic"
  },
  9003: {
    code: 9003,
    mnemonic: "INCOMPATIBLE_PROTOCOL_VERSION",
    domain: "Config & Deployment",
    httpStatus: 426,
    description: "Ledger protocol version is below required minimum (Protocol 22)",
    recoveryHint: "Stellar network must be running at least Protocol 22 for Soroban"
  },
  9004: {
    code: 9004,
    mnemonic: "INVALID_NETWORK_NAME",
    domain: "Config & Deployment",
    httpStatus: 400,
    description: "Network name must be one of: testnet, futurenet, mainnet, standalone",
    recoveryHint: "Set STELLAR_NETWORK to a valid supported network name"
  },
  9005: {
    code: 9005,
    mnemonic: "RPC_PORT_CONFLICT",
    domain: "Config & Deployment",
    httpStatus: 500,
    description: "Local sandbox RPC port is already bound by another process",
    recoveryHint: "Release port 8000 or configure custom RPC port"
  },
  9006: {
    code: 9006,
    mnemonic: "WASM_HASH_NOT_REGISTERED",
    domain: "Config & Deployment",
    httpStatus: 404,
    description: "WASM binary hash not found in on-chain code repository",
    recoveryHint: "Install WASM bytecode to network before contract instantiation"
  },
  9007: {
    code: 9007,
    mnemonic: "DEPLOYMENT_ALREADY_EXISTS",
    domain: "Config & Deployment",
    httpStatus: 409,
    description: "Contract instance already deployed at computed address",
    recoveryHint: "Use existing deployment or provide distinct salt"
  },
  9008: {
    code: 9008,
    mnemonic: "INVALID_DEPLOYMENT_SALT",
    domain: "Config & Deployment",
    httpStatus: 400,
    description: "Salt must be a 32-byte hex string or alphanumeric identifier",
    recoveryHint: "Supply valid 32-byte salt for deterministic deployment"
  },
  9009: {
    code: 9009,
    mnemonic: "UNRECOGNIZED_CHAIN_ID",
    domain: "Config & Deployment",
    httpStatus: 400,
    description: "Chain ID does not correspond to a known Stellar cluster",
    recoveryHint: "Specify valid cluster network passphrase"
  },
  9010: {
    code: 9010,
    mnemonic: "SECRETS_VAULT_UNREACHABLE",
    domain: "Config & Deployment",
    httpStatus: 503,
    description: "Unable to retrieve deployment private keys from secrets manager",
    recoveryHint: "Verify AWS Secrets Manager / Vault credentials"
  },
  9011: {
    code: 9011,
    mnemonic: "DATABASE_MIGRATION_PENDING",
    domain: "Config & Deployment",
    httpStatus: 503,
    description: "Database schema has pending migrations; refusing traffic",
    recoveryHint: "Execute npm run db:migrate before starting server daemon"
  },
  9012: {
    code: 9012,
    mnemonic: "STORAGE_BACKEND_UNAVAILABLE",
    domain: "Config & Deployment",
    httpStatus: 503,
    description: "Persistent storage engine (Postgres / Redis) connection failed",
    recoveryHint: "Check database connection string and ensure service is running"
  },
  9013: {
    code: 9013,
    mnemonic: "CORRUPT_ENV_FILE",
    domain: "Config & Deployment",
    httpStatus: 500,
    description: "Syntax error encountered while parsing .env configuration file",
    recoveryHint: "Fix invalid quotes or unescaped characters in .env file"
  },
  9014: {
    code: 9014,
    mnemonic: "DEPLOYMENT_METADATA_MISSING",
    domain: "Config & Deployment",
    httpStatus: 404,
    description: "deployments/testnet.json file not found in repository root",
    recoveryHint: "Run scripts/deploy-testnet.sh to generate deployment metadata"
  }
};

export const ERROR_BY_MNEMONIC: Record<string, ErrorDefinition> = Object.values(ERROR_CATALOG).reduce((acc, curr) => {
  acc[curr.mnemonic] = curr;
  return acc;
}, {} as Record<string, ErrorDefinition>);

export function getError(codeOrMnemonic: number | string): ErrorDefinition {
  if (typeof codeOrMnemonic === 'number') {
    return ERROR_CATALOG[codeOrMnemonic] || {
      code: 1022,
      mnemonic: "SOROBAN_INTERNAL_ERROR",
      domain: "Host & Soroban VM",
      httpStatus: 500,
      description: `Unknown error code ${codeOrMnemonic}`,
      recoveryHint: "Check system logs or contact support"
    };
  }
  return ERROR_BY_MNEMONIC[codeOrMnemonic] || {
    code: 1022,
    mnemonic: "SOROBAN_INTERNAL_ERROR",
    domain: "Host & Soroban VM",
    httpStatus: 500,
    description: `Unknown error mnemonic ${codeOrMnemonic}`,
    recoveryHint: "Check system logs or contact support"
  };
}

export const TOTAL_ERROR_CODES = 270;
