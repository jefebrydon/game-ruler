"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSignUpModal } from "@/lib/signup-modal-context";

export function SignUpModal(): React.ReactElement {
  const { isOpen, close } = useSignUpModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader className="gap-6">
          <DialogTitle className="text-h2">Not Ready Yet</DialogTitle>
          <DialogDescription className="text-paragraph">
            This is a side project, this feature will probably never be built
            🤪
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button onClick={close}>Got It ✌️</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

