"use client";

import { useState } from "react";
import { Check, VideoRecorder, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { extractYouTubeId } from "@/utils/youtube";

export function ChangeVideoModal({ isOpen, onClose, onSubmit }) {
    const [urlInput, setUrlInput] = useState("");
    const extractedId = extractYouTubeId(urlInput);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (extractedId) {
            onSubmit(extractedId);
            setUrlInput("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-secondary bg-primary p-6 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                        <VideoRecorder className="size-5 text-brand-primary" />
                        <h3 className="text-lg font-semibold text-primary">Change Video</h3>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-tertiary hover:bg-secondary hover:text-primary">
                        <XClose className="size-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium text-secondary">YouTube URL or Video ID</label>
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="placeholder-placeholder mt-1.5 w-full rounded-lg border border-primary bg-primary px-3.5 py-2 text-sm text-primary outline-none focus:border-brand-solid"
                            autoFocus
                        />
                    </div>

                    {extractedId && (
                        <div className="flex flex-col gap-2 rounded-lg border border-secondary bg-secondary/50 p-3">
                            <span className="text-xs font-medium text-tertiary">Video Preview:</span>
                            <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
                                <img src={`https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`} alt="Preview" className="size-full object-cover" />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <Button size="md" color="secondary" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button size="md" color="primary" type="submit" isDisabled={!extractedId} iconLeading={Check}>
                            Sync Video
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
