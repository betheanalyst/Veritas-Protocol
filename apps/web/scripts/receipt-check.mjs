import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const origFetch = globalThis.fetch;
globalThis.fetch = (i, o) => origFetch(i, { ...o, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/129.0.0.0', Accept: 'application/json', ...(o?.headers ?? {}) } });

const client = createClient({ chain: studionet });
const txHash = '0xd2a6f7f1723815a614d9d1483ec9e45af270bbf1ec46452ba7dfb7468944fb7b';

try {
  const r = await client.waitForTransactionReceipt({ hash: txHash, status: 'FINALIZED', interval: 3000, retries: 5 });
  console.log('result_name:', JSON.stringify(r.result_name));
  console.log('status_name:', JSON.stringify(r.status_name));
  console.log('status (numeric):', r.status);
  console.log('consensus_data.leader_receipt[0].execution_result:',
    r.consensus_data?.leader_receipt?.[0]?.execution_result);
  console.log('consensus_data.leader_receipt[0].genvm_result:',
    JSON.stringify(r.consensus_data?.leader_receipt?.[0]?.genvm_result));
} catch (e) {
  console.error('ERROR:', e.message);
}
