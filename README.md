# telepathyx

Proof of consensus, now on the Succinct X platform.

## Deploy

```bash
cd contracts
cp .env.example .env
forge script DeployLightClient --ffi --private-key $PRIVATE_KEY --rpc-url $RPC --broadcast --etherscan-api-key $ETHERSCAN_API_KEY --verify
```
