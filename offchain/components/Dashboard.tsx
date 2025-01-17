import { useState } from "react";
import { Button } from "@nextui-org/button";

import { ActionGroup } from "@/types/action";
import MintButton from "./actions/Mint";
import DepositButton from "./actions/Deposit";
import DelegateStakeButton from "./actions/DelegateStake";
import RedelegateStakeButton from "./actions/RedelegateStake";

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
import { network } from "@/config/lucid";
import * as Script from "@/config/script";

export default function Dashboard(props: {
  lucid: LucidEvolution;
  address: Address;
  setActionResult: (result: string) => void;
  onError: (error: any) => void;
}) {
  const { lucid, address, setActionResult, onError } = props;

  const [keyUnit, setKeyUnit] = useState<Record<string, string>>();

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
            .complete({ localUPLCEval: false });

          submitTx(tx)
            .then((txHash) => {
              setActionResult(txHash);
              setKeyUnit({ policyID, assetNameHex });
            })
            .catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      deposit: async (lovelace: Lovelace) => {
        try {
          if (!keyUnit) throw "No key data in the current session. Mint a key NFT first!";

          const { policyID } = keyUnit;
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingScriptHash = validatorToScriptHash(stakingValidator);
          const stakingCredential = scriptHashToCredential(stakingScriptHash);

          const spendingValidator: SpendingValidator = { type: "PlutusV3", script };
          const validatorAddress = validatorToAddress(network, spendingValidator, stakingCredential);

          const tx = await lucid.newTx().pay.ToAddress(validatorAddress, { lovelace }).complete({ localUPLCEval: false });

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      withdraw: async () => {
        try {
          if (!keyUnit) throw "No key data in the current session. Mint a key NFT first!";

          const { policyID, assetNameHex } = keyUnit;
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingScriptHash = validatorToScriptHash(stakingValidator);
          const stakingCredential = scriptHashToCredential(stakingScriptHash);

          const spendingValidator: SpendingValidator = { type: "PlutusV3", script };
          const validatorAddress = validatorToAddress(network, spendingValidator, stakingCredential);

          const key = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, key);

          const validatorUTXOs = await lucid.utxosAt(validatorAddress);
          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO, ...validatorUTXOs], redeemer)
            .attach.SpendingValidator(spendingValidator)
            .complete({ localUPLCEval: false });

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      delegateStake: async ({ poolID, dRep }: { poolID: PoolId; dRep: DRep }) => {
        try {
          if (!keyUnit) throw "No key data in the current session. Mint a key NFT first!";

          const { policyID, assetNameHex } = keyUnit;
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingAddress = validatorToRewardAddress(network, stakingValidator);

          const key = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, key);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO])
            .registerAndDelegate.ToPoolAndDRep(stakingAddress, poolID, dRep, redeemer)
            .attach.CertificateValidator(stakingValidator)
            .complete({ localUPLCEval: false });

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      redelegateStake: async (poolID: PoolId) => {
        try {
          if (!keyUnit) throw "No key data in the current session. Mint a key NFT first!";

          const { policyID, assetNameHex } = keyUnit;
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingAddress = validatorToRewardAddress(network, stakingValidator);

          const key = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, key);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO])
            .delegateTo(stakingAddress, poolID, redeemer)
            .attach.CertificateValidator(stakingValidator)
            .complete({ localUPLCEval: false });

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      withdrawStake: async () => {
        try {
          if (!keyUnit) throw "No key data in the current session. Mint a key NFT first!";

          const { policyID, assetNameHex } = keyUnit;
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingAddress = validatorToRewardAddress(network, stakingValidator);

          const accounts = await fetch("/koios/account_info?select=rewards_available", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _stake_addresses: [stakingAddress] }),
          });
          const [{ rewards_available }] = await accounts.json();
          if (!rewards_available || rewards_available == 0) throw "No stake rewards yet!";

          const key = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, key);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO])
            .withdraw(stakingAddress, BigInt(rewards_available), redeemer)
            .attach.WithdrawalValidator(stakingValidator)
            .complete({ localUPLCEval: false });

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      unregisterStake: async () => {
        try {
          if (!keyUnit) throw "No key data in the current session. Mint a key NFT first!";

          const { policyID, assetNameHex } = keyUnit;
          const script = applyParamsToScript(Script.DRY, [policyID]);

          const stakingValidator: Validator = { type: "PlutusV3", script };
          const stakingAddress = validatorToRewardAddress(network, stakingValidator);

          const key = toUnit(policyID, assetNameHex);
          const [keyUTxO] = await lucid.utxosAtWithUnit(address, key);

          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([keyUTxO])
            .deRegisterStake(stakingAddress, redeemer)
            .attach.CertificateValidator(stakingValidator)
            .complete({ localUPLCEval: false });

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

        <Button onPress={actions.DRY.withdraw} className="bg-gradient-to-tr from-primary-500 to-teal-500 text-white shadow-lg grow" radius="full">
          Withdraw from Spend
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="w-4 my-auto">3.</span>

        <DelegateStakeButton onSubmit={actions.DRY.delegateStake} />

        <RedelegateStakeButton onSubmit={actions.DRY.redelegateStake} />

        <Button onPress={actions.DRY.withdrawStake} className="bg-gradient-to-tr from-slate-500 to-emerald-500 text-white shadow-lg grow" radius="full">
          Withdraw Stake Rewards
        </Button>

        <Button onPress={actions.DRY.unregisterStake} className="bg-gradient-to-tr from-slate-500 to-emerald-500 text-white shadow-lg grow" radius="full">
          Deregister Stake
        </Button>
      </div>
    </div>
  );
}
