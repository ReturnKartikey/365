import { Platform } from 'react-native';

type PlaybackListener = (status: { isPlaying: boolean; didJustFinish: boolean }) => void;

export interface AudioBridge {
  play: (url: string) => void;
  pause: () => void;
  stop: () => void;
  isReady: () => boolean;
}

class ResilientAudioService {
  private currentUri: string | null = null;
  private activePlayer: any = null;
  private subscriptions: any[] = [];
  private webAudio: any = null;
  private driver: 'bridge' | 'expo-video' | 'expo-audio' | 'web' | 'none' = 'none';
  private bridge: AudioBridge | null = null;
  private currentListener: PlaybackListener | null = null;

  constructor() {
    this.detectDriver();
  }

  registerBridge(bridge: AudioBridge) {
    this.bridge = bridge;
    if (this.driver !== 'web') {
      this.driver = 'bridge';
    }
  }

  unregisterBridge() {
    this.bridge = null;
    if (this.driver === 'bridge') {
      this.detectDriver();
    }
  }

  notifyStatus(status: { isPlaying: boolean; didJustFinish: boolean }) {
    if (this.currentListener) {
      this.currentListener(status);
    }
  }

  private detectDriver() {
    // 1. Web environment
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      this.driver = 'web';
      return;
    }

    // If bridge is already registered, use it
    if (this.bridge) {
      this.driver = 'bridge';
      return;
    }

    // 2. expo-video
    try {
      const ev = require('expo-video');
      if (ev && typeof ev.createVideoPlayer === 'function') {
        this.driver = 'expo-video';
        return;
      }
    } catch (e) {}

    // 3. expo-audio fallback
    try {
      const ea = require('expo-audio');
      if (ea && typeof ea.createAudioPlayer === 'function') {
        this.driver = 'expo-audio';
        return;
      }
    } catch (e) {}

    this.driver = 'none';
  }

  /**
   * Play an audio preview URI with automatic finish callback.
   */
  async playPreview(uri: string, onPlaybackStatus?: PlaybackListener): Promise<boolean> {
    if (!uri) return false;

    try {
      this.currentListener = onPlaybackStatus || null;

      // If already playing the same URI, resume
      if (this.currentUri === uri) {
        if (this.bridge) {
          this.bridge.play(uri);
          return true;
        }
        if (this.driver === 'expo-video' && this.activePlayer && typeof this.activePlayer.play === 'function') {
          this.activePlayer.play();
          onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
          return true;
        }
        if (this.driver === 'expo-audio' && this.activePlayer && typeof this.activePlayer.play === 'function') {
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
      this.currentListener = onPlaybackStatus || null;

      // 1. Primary on Native: AudioBridge (WebView audio engine)
      if (this.bridge) {
        this.bridge.play(uri);
        return true;
      }

      // 2. Primary on Web: HTML5 Audio
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

      // 3. Native fallback: expo-video
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

      // 4. Native fallback: expo-audio
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
      if (this.bridge) {
        this.bridge.pause();
      }
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
      if (this.bridge) {
        this.bridge.stop();
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
      if (this.webAudio) {
        this.webAudio.pause();
        this.webAudio.currentTime = 0;
        this.webAudio = null;
      }
    } catch {}
    this.currentUri = null;
    this.currentListener = null;
  }

  getCurrentUri(): string | null {
    return this.currentUri;
  }
}

export const GlobalAudioService = new ResilientAudioService();
