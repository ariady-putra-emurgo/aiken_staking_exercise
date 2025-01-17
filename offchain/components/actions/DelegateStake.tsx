import { useEffect, useState } from "react";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@nextui-org/modal";
import { Select, SelectItem } from "@nextui-org/select";
import { Spinner } from "@nextui-org/spinner";

import { AlwaysAbstain, AlwaysNoConfidence, Credential, DRep, isDRepCredential, PoolId } from "@lucid-evolution/lucid";
import { Action } from "@/types/action";

export default function DelegateStakeButton(props: { onSubmit: Action }) {
  const { onSubmit } = props;

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const AlwaysAbstain: AlwaysAbstain = { __typename: "AlwaysAbstain" };
  const AlwaysNoConfidence: AlwaysNoConfidence = { __typename: "AlwaysNoConfidence" };

  const [poolID, setPoolID] = useState<PoolId>("");
  const [dRep, setDrep] = useState<DRep>(AlwaysAbstain);
  const [dRepID, setDrepID] = useState(""); // drep_...
  const [dRepCredentialType, setDrepCredentialType] = useState<"Key" | "Script">("Key");
  const [dRepCredentialHash, setDrepCredentialHash] = useState("");

  useEffect(() => {
    if (!dRepID) return; // skip
    fetch("/koios/drep_info?select=hex,has_script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _drep_ids: [dRepID] }),
    })
      .then((dReps) => dReps.json())
      .then(([{ hex, has_script }]) => {
        const credential: Credential = {
          type: has_script ? "Script" : "Key",
          hash: hex,
        };
        setDrepCredentialType(credential.type);
        setDrepCredentialHash(credential.hash);
        setDrep(credential);
      })
      .catch(console.error);
  }, [dRepID]);

  const Drep: Record<string, () => DRep> = {
    AlwaysAbstain: () => AlwaysAbstain,
    Credential: () => {
      const credential: Credential = {
        type: dRepCredentialType,
        hash: dRepCredentialHash,
      };
      return credential;
    },
    AlwaysNoConfidence: () => AlwaysNoConfidence,
  };

  return (
    <>
      <Button onPress={onOpen} className="bg-gradient-to-tr from-slate-500 to-emerald-500 text-white shadow-lg grow" radius="full">
        Delegate Stake
      </Button>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Delegate Stake</ModalHeader>
              <ModalBody>
                <Input label="Pool ID" placeholder="Enter Pool ID" variant="bordered" onValueChange={setPoolID} />
                <Select
                  label="Drep"
                  placeholder="Abstain"
                  variant="bordered"
                  onChange={(e) => setDrep(e.target.value ? Drep[e.target.value]() : AlwaysAbstain)}
                >
                  <SelectItem key={"AlwaysAbstain"}>Abstain</SelectItem>
                  <SelectItem key={"Credential"}>Credential</SelectItem>
                  <SelectItem key={"AlwaysNoConfidence"}>No confidence</SelectItem>
                </Select>
                {isDRepCredential(dRep) && <Input label="Drep ID" placeholder="drep_..." variant="bordered" onValueChange={setDrepID} />}
              </ModalBody>
              <ModalFooter>
                <div className="relative">
                  <Button
                    onPress={() => onSubmit({ poolID, dRep }).then(onClose)}
                    isDisabled={isDRepCredential(dRep) && !dRepCredentialHash}
                    className={`bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg
                      ${isDRepCredential(dRep) && dRepID && !dRepCredentialHash && "invisible"}`}
                    radius="full"
                  >
                    Submit
                  </Button>
                  {isDRepCredential(dRep) && dRepID && !dRepCredentialHash && (
                    <Spinner className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
