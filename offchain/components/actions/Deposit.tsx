import { useState } from "react";
import { Input } from "@nextui-org/input";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@nextui-org/modal";
import { Button } from "@nextui-org/button";

import { Action } from "@/types/action";

export default function DepositButton(props: { onSubmit: Action }) {
  const { onSubmit } = props;

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [lovelace, setLovelace] = useState(0n);

  return (
    <>
      <Button onPress={onOpen} className="bg-gradient-to-tr from-primary-500 to-teal-500 text-white shadow-lg grow" radius="full">
        Deposit
      </Button>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Deposit</ModalHeader>
              <ModalBody>
                <Input
                  type="number"
                  label="Quantity"
                  placeholder="0.000000"
                  variant="bordered"
                  startContent={
                    <div className="pointer-events-none flex items-center">
                      <span className="text-default-400 text-small">ADA</span>
                    </div>
                  }
                  onValueChange={(value: string) => setLovelace(BigInt(parseFloat(value) * 1_000000))}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  onPress={() => onSubmit(lovelace).then(onClose)}
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
