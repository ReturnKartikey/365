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
    // 1. Web browser environment
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      this.driver = 'web';
      return;
    }

    // 2. expo-audio (development build / custom client)
    try {
      const ea = require('expo-audio');
      if (ea && typeof ea.createAudioPlayer === 'function') {
        this.driver = 'expo-audio';
        return;
      }
    } catch (e) {}

    // 3. expo-video (development build / custom client)
    try {
      const ev = require('expo-video');
      if (ev && typeof ev.createVideoPlayer === 'function') {
        this.driver = 'expo-video';
        return;
      }
    } catch (e) {}

    this.driver = 'none';
  }

  /**
   * Returns true if physical native audio output is supported in the current runtime.
   */
  hasNativeAudio(): boolean {
    return this.driver !== 'none';
  }

  /**
   * Play an audio preview URI with automatic finish callback.
   */
  async playPreview(uri: string, onPlaybackStatus?: PlaybackListener): Promise<boolean> {
    if (!uri) return false;

    try {
      // If already playing the same URI, resume
      if (this.currentUri === uri) {
        if (this.driver === 'web' && this.webAudio) {
          this.webAudio.play().catch(() => {});
          onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
          return true;
        }
        if (this.driver === 'expo-audio' && this.activePlayer && typeof this.activePlayer.play === 'function') {
          this.activePlayer.play();
          onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
          return true;
        }
        if (this.driver === 'expo-video' && this.activePlayer && typeof this.activePlayer.play === 'function') {
          this.activePlayer.play();
          onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
          return true;
        }
      }

      // Stop previous playback
      await this.stop();
      this.currentUri = uri;

      // 1. Web HTML5 Audio (Instant live sound in browser / mobile Chrome)
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

      // 2. expo-audio
      if (this.driver === 'expo-audio') {
        const ea = require('expo-audio');
        const player = ea.createAudioPlayer(uri);
        this.activePlayer = player;
        if (player && typeof player.play === 'function') {
          player.play();
        }
        onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
        return true;
      }

      // 3. expo-video
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
        }

        if (typeof player.play === 'function') {
          player.play();
        }
        onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
        return true;
      }

      // Fallback: In standard Expo Go client where native audio modules are omitted,
      // report active status so visual waveforms and progress counters still animate.
      onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
      return true;
    } catch (e) {
      console.warn('[AudioService] Playback error:', e);
      this.activePlayer = null;
      this.webAudio = null;
      this.currentUri = null;
      return false;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.driver === 'web' && this.webAudio) {
        this.webAudio.pause();
      } else if (this.activePlayer && typeof this.activePlayer.pause === 'function') {
        this.activePlayer.pause();
      }
    } catch (e) {
      console.warn('[AudioService] Pause error:', e);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.webAudio) {
        this.webAudio.pause();
        this.webAudio.currentTime = 0;
        this.webAudio = null;
      }
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
    } catch {}
    this.currentUri = null;
  }

  getCurrentUri(): string | null {
    return this.currentUri;
  }
}

export const GlobalAudioService = new ResilientAudioService();
