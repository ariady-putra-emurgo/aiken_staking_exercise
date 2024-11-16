import { useState } from "react";
import { Button } from "@nextui-org/button";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@nextui-org/modal";

import { Action } from "@/types/action";
import { Input } from "@nextui-org/input";

export default function RedelegateStakeButton(props: { onSubmit: Action }) {
  const { onSubmit } = props;

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [poolID, setPoolID] = useState("");

  return (
    <>
      <Button onPress={onOpen} className="bg-gradient-to-tr from-slate-500 to-emerald-500 text-white shadow-lg grow" radius="full">
        Redelegate Stake
      </Button>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Redelegate Stake</ModalHeader>
              <ModalBody>
                <Input label="Pool ID" placeholder="Enter Pool ID" variant="bordered" onValueChange={setPoolID} />
              </ModalBody>
              <ModalFooter>
                <Button
                  onClick={() => onSubmit(poolID).then(onClose)}
                  className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
                  radius="full"
                >
                  Submit
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
