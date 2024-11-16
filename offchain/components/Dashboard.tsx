import { Button } from "@nextui-org/button";

import { ActionGroup } from "@/types/action";
import MintButton from "./actions/Mint";
import DepositButton from "./actions/Deposit";
import DelegateStakeButton from "./actions/DelegateStake";
import RedelegateStakeButton from "./actions/RedelegateStake";
import * as Script from "@/types/script";

import {
  Address,
  applyParamsToScript,
  Constr,
  Data,
  DRep,
  fromText,
  Lovelace,
  LucidEvolution,
  MintingPolicy,
  mintingPolicyToId,
  PoolId,
  scriptHashToCredential,
  SpendingValidator,
  toUnit,
  TxSignBuilder,
  Validator,
  validatorToAddress,
  validatorToRewardAddress,
  validatorToScriptHash,
} from "@lucid-evolution/lucid";

export default function Dashboard(props: {
  lucid: LucidEvolution;
  address: Address;
  setActionResult: (result: string) => void;
  onError: (error: any) => void;
}) {
  const { lucid, address, setActionResult, onError } = props;

  async function submitTx(tx: TxSignBuilder) {
    const txSigned = await tx.sign.withWallet().complete();
    const txHash = await txSigned.submit();

    return txHash;
  }

  const actions: Record<string, ActionGroup> = {
    DRY: {
      mint: async (assetName: string) => {
        try {
          const utxos = await lucid.wallet().getUtxos();
          if (!utxos) throw "Empty Wallet";

          const nonce = utxos[0];
          const oRef = new Constr(0, [String(nonce.txHash), BigInt(nonce.outputIndex)]);

          const script = applyParamsToScript(Script.KEY, [oRef]);
          const mintingValidator: MintingPolicy = { type: "PlutusV3", script };

          const policyID = mintingPolicyToId(mintingValidator);
          const assetNameHex = fromText(assetName);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([nonce])
            .mintAssets({ [`${policyID}${assetNameHex}`]: 1n }, redeemer)
            .attach.MintingPolicy(mintingValidator)
            .complete();

          submitTx(tx)
            .then((txHash) => {
              setActionResult(txHash);

              const key = JSON.stringify({ policyID, assetNameHex });
              localStorage.setItem("KEY", key);
            })
            .catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      deposit: async (lovelace: Lovelace) => {
        try {
          const key = localStorage.getItem("KEY");
          if (!key) throw "No local storage key found, mint a key NFT first!";

          const { policyID } = JSON.parse(key);
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingScriptHash = validatorToScriptHash(stakingValidator);
          const stakingCredential = scriptHashToCredential(stakingScriptHash);

          const spendingValidator: SpendingValidator = { type: "PlutusV3", script };
          const validatorAddress = validatorToAddress(lucid.config().network, spendingValidator, stakingCredential);

          const tx = await lucid.newTx().pay.ToAddress(validatorAddress, { lovelace }).complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      withdraw: async () => {
        try {
          const key = localStorage.getItem("KEY");
          if (!key) throw "No local storage key found, mint a key NFT first!";

          const { policyID, assetNameHex } = JSON.parse(key);
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingScriptHash = validatorToScriptHash(stakingValidator);
          const stakingCredential = scriptHashToCredential(stakingScriptHash);

          const spendingValidator: SpendingValidator = { type: "PlutusV3", script };
          const validatorAddress = validatorToAddress(lucid.config().network, spendingValidator, stakingCredential);

          const keyUnit = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, keyUnit);

          const validatorUTXOs = await lucid.utxosAt(validatorAddress);
          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO, ...validatorUTXOs], redeemer)
            .attach.SpendingValidator(spendingValidator)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      delegateStake: async ({ poolID, dRep }: { poolID: PoolId; dRep: DRep }) => {
        try {
          const key = localStorage.getItem("KEY");
          if (!key) throw "No local storage key found, mint a key NFT first!";

          const { policyID, assetNameHex } = JSON.parse(key);
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingAddress = validatorToRewardAddress(lucid.config().network, stakingValidator);

          const keyUnit = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, keyUnit);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO])
            .registerAndDelegate.ToPoolAndDRep(stakingAddress, poolID, dRep, redeemer)
            .attach.CertificateValidator(stakingValidator)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      redelegateStake: async (poolID: PoolId) => {
        try {
          const tx = await lucid
            .newTx()
            // TODO: Define staking redelegation (switch from 1 pool to another)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      withdrawStake: async () => {
        try {
          const key = localStorage.getItem("KEY");
          if (!key) throw "No local storage key found, mint a key NFT first!";

          const { policyID, assetNameHex } = JSON.parse(key);
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingAddress = validatorToRewardAddress(lucid.config().network, stakingValidator);

          const account = await fetch(`/accounts/${stakingAddress}`, { headers: { project_id: `${process.env.NEXT_PUBLIC_BF_PID}` } });
          const { withdrawable_amount } = await account.json();
          if (!withdrawable_amount || withdrawable_amount == 0n) throw "No stake reward yet!";

          const keyUnit = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, keyUnit);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO])
            .withdraw(stakingAddress, BigInt(withdrawable_amount), redeemer)
            .attach.WithdrawalValidator(stakingValidator)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      unregisterStake: async () => {
        try {
          const key = localStorage.getItem("KEY");
          if (!key) throw "No local storage key found, mint a key NFT first!";

          const { policyID, assetNameHex } = JSON.parse(key);
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingAddress = validatorToRewardAddress(lucid.config().network, stakingValidator);

          const keyUnit = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, keyUnit);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO])
            .deRegisterStake(stakingAddress, redeemer)
            .attach.CertificateValidator(stakingValidator)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <span>{address}</span>

      <div className="flex flex-wrap gap-2">
        <span className="w-4 my-auto">1.</span>
        <MintButton onSubmit={actions.DRY.mint} />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="w-4 my-auto">2.</span>

        <DepositButton onSubmit={actions.DRY.deposit} />

        <Button onClick={actions.DRY.withdraw} className="bg-gradient-to-tr from-primary-500 to-teal-500 text-white shadow-lg grow" radius="full">
          Withdraw from Spend
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="w-4 my-auto">3.</span>

        <DelegateStakeButton onSubmit={actions.DRY.delegateStake} />

        <RedelegateStakeButton onSubmit={actions.DRY.redelegateStake} />

        <Button onClick={actions.DRY.withdrawStake} className="bg-gradient-to-tr from-slate-500 to-emerald-500 text-white shadow-lg grow" radius="full">
          Withdraw Stake Rewards
        </Button>

        <Button onClick={actions.DRY.unregisterStake} className="bg-gradient-to-tr from-slate-500 to-emerald-500 text-white shadow-lg grow" radius="full">
          Deregister Stake
        </Button>
      </div>
    </div>
  );
}
