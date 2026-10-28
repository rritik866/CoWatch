"use client";

import { RefreshCw01, Shield01, User01, UserMinus01 } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";

export function ParticipantsTab({ participants, currentUserId, isHost, maxParticipants, onAssignRole, onRemoveParticipant, onTransferHost }) {
    const getRoleBadge = (role) => {
        switch (role) {
            case "HOST":
                return (
                    <Badge size="sm" color="brand" type="color">
                        Host
                    </Badge>
                );
            case "MODERATOR":
                return (
                    <Badge size="sm" color="blue" type="color">
                        Moderator
                    </Badge>
                );
            case "PARTICIPANT":
                return (
                    <Badge size="sm" color="gray" type="color">
                        Participant
                    </Badge>
                );
            case "VIEWER":
                return (
                    <Badge size="sm" color="gray" type="color">
                        Viewer
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">Active Members</span>
                <Badge size="md" color="slate" type="pill-color">
                    {participants.length} / {maxParticipants}
                </Badge>
            </div>

            <div className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {participants.map((p) => {
                    const isSelf = p.userId === currentUserId;

                    return (
                        <div key={p.userId} className="flex flex-col gap-2 rounded-lg border border-secondary bg-primary p-3 shadow-xs">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <Avatar size="sm" placeholderIcon={User01} />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-primary">
                                            {p.username} {isSelf && <span className="text-xs text-tertiary">(You)</span>}
                                        </span>
                                    </div>
                                </div>
                                <div>{getRoleBadge(p.role)}</div>
                            </div>

                            {isHost && !isSelf && (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-secondary pt-2">
                                    {p.role !== "MODERATOR" && (
                                        <Button size="xs" color="secondary" iconLeading={Shield01} onClick={() => onAssignRole(p.userId, "MODERATOR")}>
                                            Promote to Mod
                                        </Button>
                                    )}
                                    {p.role === "MODERATOR" && (
                                        <Button size="xs" color="secondary" onClick={() => onAssignRole(p.userId, "PARTICIPANT")}>
                                            Demote to Participant
                                        </Button>
                                    )}
                                    <Button size="xs" color="secondary" iconLeading={RefreshCw01} onClick={() => onTransferHost(p.userId)}>
                                        Make Host
                                    </Button>
                                    <Button size="xs" color="secondary-destructive" iconLeading={UserMinus01} onClick={() => onRemoveParticipant(p.userId)}>
                                        Kick
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
