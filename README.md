# aiken_staking_exercise

To run the offchain:

1. Create a `.env.local` file
2. Run `pnpm dev`

Your `.env.local` file must contain:

```
NEXT_PUBLIC_BF_URL=https://cardano-preprod.blockfrost.io/api/v0
NEXT_PUBLIC_BF_PID=preprodYOUR_PREPROD_BLOCKFROST_PROJECT_ID
NEXT_PUBLIC_CARDANO_NETWORK=Preprod
```

To install `pnpm` run `npm i -g pnpm`.
