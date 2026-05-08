import { toNano, Address, beginCell, Cell } from '@ton/ton'

// USDT Jetton master address on TON mainnet
const USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
const TONCENTER   = 'https://toncenter.com/api/v2'

export interface PaymentParams {
  toWallet:       string   // destination wallet address (mentor/platform)
  amountUsdt:     number   // amount in USDT (e.g. 99)
  comment:        string   // payment reference/memo
  flow:           'subscription' | 'vip_access' | 'academy_access'
  tenantId:       string
  planLabel?:     string
  senderAddress?: string   // connected wallet address — required for correct Jetton routing
}

/**
 * Derives the sender's USDT Jetton wallet address from TonCenter.
 * The Jetton transfer opcode MUST be sent to the sender's Jetton wallet,
 * NOT to the Jetton master contract.
 */
async function getUserUsdtWallet(senderRawAddress: string): Promise<string> {
  const senderAddr = Address.parse(senderRawAddress)
  const addrCell   = beginCell().storeAddress(senderAddr).endCell()
  const addrBoc    = addrCell.toBoc().toString('base64')

  const res = await fetch(`${TONCENTER}/runGetMethod`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: USDT_MASTER,
      method:  'get_wallet_address',
      stack:   [['tvm.Slice', addrBoc]],
    }),
  })

  const data = await res.json()
  const cellBytes = data?.result?.stack?.[0]?.[1]?.bytes
  if (!cellBytes) throw new Error('TonCenter: could not derive USDT wallet address')

  const cell = Cell.fromBoc(Buffer.from(cellBytes, 'base64'))[0]
  const addr = cell.beginParse().loadAddress()
  return addr.toString({ bounceable: true })
}

export async function buildUsdtTransfer(params: PaymentParams) {
  // Derive the sender's USDT Jetton wallet — this is the actual on-chain target
  // for the transfer message. Falls back to master only if no sender address given.
  let jettonWalletAddress = USDT_MASTER
  if (params.senderAddress) {
    try {
      jettonWalletAddress = await getUserUsdtWallet(params.senderAddress)
    } catch (err) {
      console.warn('[tonPayment] Could not derive Jetton wallet, falling back to master:', err)
    }
  }

  // Amount in nanoUSDT (USDT has 6 decimals on TON)
  const amount = BigInt(Math.round(params.amountUsdt * 1_000_000))

  const forwardPayload = beginCell()
    .storeUint(0, 32)
    .storeStringTail(params.comment)
    .endCell()

  // Jetton transfer body — sent to sender's Jetton wallet
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)                    // transfer opcode
    .storeUint(0, 64)                             // query_id
    .storeCoins(amount)                           // USDT amount in nanoUSDT
    .storeAddress(Address.parse(params.toWallet)) // recipient
    .storeAddress(Address.parse(params.toWallet)) // response_destination (excess TON back)
    .storeBit(0)                                  // no custom_payload
    .storeCoins(toNano('0.02'))                   // forward_ton_amount (notify recipient)
    .storeBit(1)                                  // forward_payload as ref
    .storeRef(forwardPayload)
    .endCell()

  return {
    address: jettonWalletAddress,            // ← sender's USDT Jetton wallet, NOT master
    amount:  toNano('0.1').toString(),       // TON for gas fees
    payload: body.toBoc().toString('base64'),
  }
}

