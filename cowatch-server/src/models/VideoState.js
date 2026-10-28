export class VideoState {
    constructor(
        videoId = "",
        playState = "PAUSED",
        playbackPosition = 0,
        playbackRate = 1.0,
        lastUpdated = Date.now()
    ) {
        this.videoId = videoId;
        this.playState = playState;
        this.playbackPosition = Number(playbackPosition) || 0;
        this.playbackRate = Number(playbackRate) || 1.0;
        this.lastUpdated = Number(lastUpdated) || Date.now();
    }

    getCurrentPosition() {
        if (this.playState === "PLAYING") {
            const elapsed = (Date.now() - this.lastUpdated) / 1000;
            return Math.max(0, this.playbackPosition + elapsed * this.playbackRate);
        }
        return Math.max(0, this.playbackPosition);
    }

    play() {
        if (this.playState !== "PLAYING") {
            this.playbackPosition = this.getCurrentPosition();
            this.playState = "PLAYING";
            this.lastUpdated = Date.now();
        }
    }

    pause() {
        if (this.playState !== "PAUSED") {
            this.playbackPosition = this.getCurrentPosition();
            this.playState = "PAUSED";
            this.lastUpdated = Date.now();
        }
    }

    seek(timeInSeconds) {
        this.playbackPosition = Math.max(0, Number(timeInSeconds) || 0);
        this.lastUpdated = Date.now();
    }

    changeVideo(newVideoId) {
        this.videoId = newVideoId;
        this.playState = "PAUSED";
        this.playbackPosition = 0;
        this.lastUpdated = Date.now();
    }

    toJSON() {
        return {
            videoId: this.videoId,
            playState: this.playState,
            currentTime: this.getCurrentPosition(),
            playbackRate: this.playbackRate,
            timestamp: this.lastUpdated
        };
    }
}

