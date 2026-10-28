"use client";

import { useEffect, useRef, useState } from "react";
import { Send01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";

export function ChatTab({ messages, currentUserId, onSendMessage }) {
    const [inputValue, setInputValue] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue("");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

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
                        Mod
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-sm text-tertiary">No messages yet. Say hello!</div>
                ) : (
                    messages.map((m, idx) => {
                        const isSelf = m.userId === currentUserId;
                        const timeStr = new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        });

                        return (
                            <div key={m.id || idx} className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
                                <div className="flex items-center gap-1.5 text-xs text-tertiary">
                                    <span className="font-semibold text-primary">{m.username}</span>
                                    {getRoleBadge(m.role)}
                                    <span>{timeStr}</span>
                                </div>
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isSelf ? "bg-brand-primary" : "border border-secondary"}`}>
                                    {m.message}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} onKeyDown={handleKeyDown} className="flex items-end gap-2 border-t border-secondary bg-primary p-4">
                <TextArea
                    aria-label="Message"
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={setInputValue}
                    rows={2}
                    size="sm"
                    className="flex-1"
                />
                <Button size="md" color="primary" type="submit" iconLeading={Send01} isDisabled={!inputValue.trim()} className="shrink-0">
                    Send
                </Button>
            </form>
        </div>
    );
}
