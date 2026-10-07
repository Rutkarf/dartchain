#!/usr/bin/env bash
set -euo pipefail

NODE_A_URL="${1:-http://localhost:8081}"
NODE_B_URL="${2:-http://localhost:8082}"
NODE_B_WS_URL="${NODE_B_WS_URL:-ws://127.0.0.1:8082/ws/peers}"
SUFFIX="$(date +%s)"
USERNAME_B="p2pb${SUFFIX}"
USERNAME_A="p2pa${SUFFIX}"
PASSWORD="password123"

echo "==> Node B health"
curl -fsS "${NODE_B_URL}/api/health" | grep -q '"ok"'

echo "==> Node A health"
curl -fsS "${NODE_A_URL}/api/health" | grep -q '"ok"'

register() {
  local base_url="$1"
  local username="$2"
  curl -fsS -X POST "${base_url}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${username}\",\"email\":\"${username}@dartchain.dev\",\"password\":\"${PASSWORD}\"}"
}

create_wallet() {
  local base_url="$1"
  curl -fsS -X POST "${base_url}/api/wallets/create"
}

link_wallet() {
  local base_url="$1"
  local token="$2"
  local address="$3"
  local public_key="$4"
  curl -fsS -X PUT "${base_url}/api/auth/me/wallet" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "{\"walletAddress\":\"${address}\",\"publicKey\":\"${public_key}\"}"
}

echo "==> Register + wallet on node B"
register_body_b="$(register "${NODE_B_URL}" "${USERNAME_B}")"
token_b="$(echo "${register_body_b}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
wallet_body_b="$(create_wallet "${NODE_B_URL}")"
wallet_address_b="$(echo "${wallet_body_b}" | sed -n 's/.*"address":"\([^"]*\)".*/\1/p')"
wallet_pubkey_b="$(echo "${wallet_body_b}" | sed -n 's/.*"publicKey":"\([^"]*\)".*/\1/p')"
link_wallet "${NODE_B_URL}" "${token_b}" "${wallet_address_b}" "${wallet_pubkey_b}"

echo "==> Mine block on node B"
curl -fsS -X POST "${NODE_B_URL}/api/blockchain/mine" \
  -H "Authorization: Bearer ${token_b}" \
  -H "Content-Type: application/json" \
  -d "{\"minerAddress\":\"${wallet_address_b}\"}" >/dev/null

chain_len_b="$(curl -fsS "${NODE_B_URL}/api/blockchain/chain" | grep -o '"index"' | wc -l)"
test "${chain_len_b}" -ge 2

echo "==> Register on node A and connect peer to node B"
register_body_a="$(register "${NODE_A_URL}" "${USERNAME_A}")"
token_a="$(echo "${register_body_a}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

curl -fsS -X POST "${NODE_A_URL}/api/peers" \
  -H "Authorization: Bearer ${token_a}" \
  -H "Content-Type: application/json" \
  -d "{\"peer\":\"${NODE_B_WS_URL}\"}" | grep -q '"ok":true'

echo "==> Wait for P2P chain sync on node A"
for _ in $(seq 1 40); do
  chain_len_a="$(curl -fsS "${NODE_A_URL}/api/blockchain/chain" | grep -o '"index"' | wc -l)"
  if [[ "${chain_len_a}" -ge "${chain_len_b}" ]]; then
    echo "P2P sync OK (node A chain length=${chain_len_a})"
    exit 0
  fi
  sleep 1
done

echo "P2P sync failed: node A chain length=${chain_len_a}, expected >= ${chain_len_b}" >&2
exit 1
