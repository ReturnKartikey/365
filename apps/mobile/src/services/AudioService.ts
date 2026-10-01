import { Platform } from 'react-native';

type PlaybackListener = (status: { isPlaying: boolean; didJustFinish: boolean }) => void;

class ResilientAudioService {
  private currentUri: string | null = null;
  private activePlayer: any = null;
  private subscriptions: any[] = [];
  private webAudio: any = null;
  private driver: 'expo-video' | 'expo-audio' | 'web' | 'none' = 'none';

  constructor() {
    this.detectDriver();
  }

  private detectDriver() {
    // 1. Web environment
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      this.driver = 'web';
      return;
    }

    // 2. expo-video (Standard native player in Expo Go SDK 52)
    try {
      const ev = require('expo-video');
      if (ev && typeof ev.createVideoPlayer === 'function') {
        this.driver = 'expo-video';
        return;
      }
    } catch (e) {
      console.warn('[AudioService] expo-video detection note:', e);
    }

    // 3. expo-audio fallback (if run in custom dev build)
    try {
      const ea = require('expo-audio');
      if (ea && typeof ea.createAudioPlayer === 'function') {
        this.driver = 'expo-audio';
        return;
      }
    } catch (e) {
      // not available in Expo Go
    }

    this.driver = 'none';
  }

  /**
   * Play an audio preview URI with automatic finish callback.
   */
  async playPreview(uri: string, onPlaybackStatus?: PlaybackListener): Promise<boolean> {
    if (!uri) return false;

    try {
      // If already playing the same URI, resume
      if (this.currentUri === uri && this.activePlayer) {
        if (this.driver === 'expo-video' && typeof this.activePlayer.play === 'function') {
          this.activePlayer.play();
          onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
          return true;
        }
        if (this.driver === 'expo-audio' && typeof this.activePlayer.play === 'function') {
          this.activePlayer.play();
          onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
          return true;
        }
        if (this.driver === 'web' && this.webAudio) {
          this.webAudio.play().catch(() => {});
          onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
          return true;
        }
      }

      // Stop previous playback
      await this.stop();
      this.currentUri = uri;

      // 1. Primary: expo-video (ExoPlayer on Android / AVPlayer on iOS)
      if (this.driver === 'expo-video') {
        const ev = require('expo-video');
        const player = ev.createVideoPlayer(uri);
        this.activePlayer = player;
        this.subscriptions = [];

        player.loop = false;

        if (typeof player.addListener === 'function') {
          const endSub = player.addListener('playToEnd', () => {
            onPlaybackStatus?.({ isPlaying: false, didJustFinish: true });
            this.stop();
          });
          if (endSub) this.subscriptions.push(endSub);

          const playChangeSub = player.addListener('playingChange', (event: any) => {
            if (event && typeof event.isPlaying === 'boolean') {
              onPlaybackStatus?.({ isPlaying: event.isPlaying, didJustFinish: false });
            }
          });
          if (playChangeSub) this.subscriptions.push(playChangeSub);

          const statusSub = player.addListener('statusChange', (event: any) => {
            if (event?.status === 'error') {
              console.warn('[AudioService] expo-video playback error:', event.error);
              onPlaybackStatus?.({ isPlaying: false, didJustFinish: true });
              this.stop();
            }
          });
          if (statusSub) this.subscriptions.push(statusSub);
        }

        if (typeof player.play === 'function') {
          player.play();
        }
        onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
        return true;
      }

      // 2. expo-audio fallback
      if (this.driver === 'expo-audio') {
        const ea = require('expo-audio');
        const player = ea.createAudioPlayer(uri);
        this.activePlayer = player;

        if (player && typeof player.addListener === 'function') {
          player.addListener('playbackStatusUpdate', (status: any) => {
            if (status.didJustFinish) {
              onPlaybackStatus?.({ isPlaying: false, didJustFinish: true });
              this.stop();
            } else {
              onPlaybackStatus?.({ isPlaying: status.playing ?? true, didJustFinish: false });
            }
          });
        }

        if (player && typeof player.play === 'function') {
          player.play();
        }
        onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
        return true;
      }

      // 3. Web HTML5 Audio
      if (this.driver === 'web') {
        const audio = new (window as any).Audio(uri);
        this.webAudio = audio;
        audio.onended = () => {
          onPlaybackStatus?.({ isPlaying: false, didJustFinish: true });
          this.stop();
        };
        await audio.play();
        onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
        return true;
      }

      // Fallback indicator
      onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
      return true;
    } catch (e) {
      console.warn('[AudioService] Playback error, falling back:', e);
      this.activePlayer = null;
      this.webAudio = null;
      this.currentUri = null;
      return false;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.activePlayer && typeof this.activePlayer.pause === 'function') {
        this.activePlayer.pause();
      } else if (this.driver === 'web' && this.webAudio) {
        this.webAudio.pause();
      }
    } catch (e) {
      console.warn('[AudioService] Pause error:', e);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.activePlayer) {
        if (typeof this.activePlayer.pause === 'function') {
          this.activePlayer.pause();
        }
        this.subscriptions.forEach((sub) => {
          try {
            sub?.remove?.();
          } catch {}
        });
        this.subscriptions = [];

        if (typeof this.activePlayer.release === 'function') {
          try {
            this.activePlayer.release();
          } catch {}
        }
        this.activePlayer = null;
      }

      if (this.webAudio) {
        this.webAudio.pause();
        this.webAudio.currentTime = 0;
        this.webAudio = null;
      }
    } catch {}
    this.currentUri = null;
  }

  getCurrentUri(): string | null {
    return this.currentUri;
  }
}

export const GlobalAudioService = new ResilientAudioService();
