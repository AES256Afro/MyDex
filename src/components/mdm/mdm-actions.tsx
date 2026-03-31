"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Lock,
  RefreshCw,
  Trash2,
  XCircle,
  Loader2,
  RotateCw,
} from "lucide-react";

interface MdmActionsProps {
  mdmProviderId: string;
  mdmDeviceId: string;
  agentDeviceId?: string;
  enrollmentStatus?: string;
  deviceName?: string;
}

type ActionType = "lock" | "restart" | "sync" | "wipe" | "retire";

interface ActionState {
  executing: ActionType | null;
  message: string | null;
  isError: boolean;
}

export function MdmActions({
  mdmProviderId,
  mdmDeviceId,
  agentDeviceId,
  deviceName,
}: MdmActionsProps) {
  const [state, setState] = useState<ActionState>({
    executing: null,
    message: null,
    isError: false,
  });

  async function executeAction(actionType: ActionType) {
    // Double-confirm for wipe
    if (actionType === "wipe") {
      const first = window.confirm(
        `Are you sure you want to WIPE ${deviceName || "this device"}? All data will be erased. This cannot be undone.`
      );
      if (!first) return;
      const second = window.confirm(
        `FINAL WARNING: This will factory reset ${deviceName || "this device"} and permanently erase all data. Type OK to confirm.`
      );
      if (!second) return;
    }

    // Confirm for retire
    if (actionType === "retire") {
      if (
        !window.confirm(
          `Retire/unenroll ${deviceName || "this device"} from MDM?`
        )
      )
        return;
    }

    setState({ executing: actionType, message: null, isError: false });

    try {
      const res = await fetch("/api/v1/mdm/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mdmProviderId,
          mdmDeviceId,
          agentDeviceId,
          actionType,
        }),
      });

      const data = await res.json();

      if (data.action?.status === "COMPLETED") {
        setState({
          executing: null,
          message: `${actionType} command sent successfully.`,
          isError: false,
        });
      } else if (data.action?.status === "FAILED") {
        setState({
          executing: null,
          message: `${actionType} failed: ${data.action.errorMessage || "Unknown error"}`,
          isError: true,
        });
      } else {
        setState({
          executing: null,
          message: `${actionType} command sent.`,
          isError: false,
        });
      }
    } catch {
      setState({
        executing: null,
        message: "Failed to send MDM command.",
        isError: true,
      });
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      setState((prev) => ({ ...prev, message: null }));
    }, 5000);
  }

  const actions: {
    type: ActionType;
    label: string;
    icon: React.ReactNode;
    variant?: "outline" | "destructive";
    className?: string;
  }[] = [
    {
      type: "sync",
      label: "Sync",
      icon: <RefreshCw className="h-3.5 w-3.5 mr-1" />,
    },
    {
      type: "lock",
      label: "Lock",
      icon: <Lock className="h-3.5 w-3.5 mr-1" />,
    },
    {
      type: "restart",
      label: "Restart",
      icon: <RotateCw className="h-3.5 w-3.5 mr-1" />,
    },
    {
      type: "retire",
      label: "Retire",
      icon: <XCircle className="h-3.5 w-3.5 mr-1" />,
      className: "text-orange-600 hover:text-orange-700",
    },
    {
      type: "wipe",
      label: "Wipe",
      icon: <Trash2 className="h-3.5 w-3.5 mr-1" />,
      className:
        "text-red-600 hover:text-red-700 border-red-200 hover:border-red-300",
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.type}
            size="sm"
            variant="outline"
            className={action.className}
            disabled={state.executing !== null}
            onClick={() => executeAction(action.type)}
          >
            {state.executing === action.type ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </Button>
        ))}
      </div>

      {state.message && (
        <div
          className={`text-xs px-3 py-2 rounded ${
            state.isError
              ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
              : "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
          }`}
        >
          {state.message}
        </div>
      )}
    </div>
  );
}
