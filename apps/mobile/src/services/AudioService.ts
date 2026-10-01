import { Platform } from 'react-native';

type PlaybackListener = (status: { isPlaying: boolean; didJustFinish: boolean }) => void;

class ResilientAudioService {
  private currentUri: string | null = null;
  private activePlayer: any = null;
  private webAudio: any = null;
  private isConfigured = false;
  private driver: 'expo-audio' | 'web' | 'none' = 'none';

  constructor() {
    this.detectDriver();
  }

  private detectDriver() {
    // 1. Web environment
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      this.driver = 'web';
      return;
    }

    // 2. Modern Expo SDK 52 native audio
    try {
      const ea = require('expo-audio');
      if (ea && typeof ea.createAudioPlayer === 'function') {
        this.driver = 'expo-audio';
        return;
      }
    } catch (e) {
      console.warn('[AudioService] expo-audio detection note:', e);
    }

    this.driver = 'none';
  }

  private async configureMode() {
    if (this.isConfigured) return;
    try {
      if (this.driver === 'expo-audio') {
        const ea = require('expo-audio');
        if (ea.setAudioModeAsync) {
          await ea.setAudioModeAsync({ playsInSilentModeIOS: true });
        }
      }
      this.isConfigured = true;
    } catch (e) {
      console.warn('[AudioService] AudioMode config error:', e);
    }
  }

  /**
   * Play an audio preview URI with automatic finish callback.
   */
  async playPreview(uri: string, onPlaybackStatus?: PlaybackListener): Promise<boolean> {
    if (!uri) return false;

    try {
      await this.configureMode();

      // If already playing the same URI, resume
      if (this.currentUri === uri) {
        if (this.driver === 'expo-audio' && this.activePlayer) {
          if (typeof this.activePlayer.play === 'function') {
            this.activePlayer.play();
          }
          return true;
        }
        if (this.driver === 'web' && this.webAudio) {
          this.webAudio.play().catch(() => {});
          return true;
        }
      }

      // Stop previous playback
      await this.stop();
      this.currentUri = uri;

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
        return true;
      }

      if (this.driver === 'web') {
        const audio = new (window as any).Audio(uri);
        this.webAudio = audio;
        audio.onended = () => {
          onPlaybackStatus?.({ isPlaying: false, didJustFinish: true });
          this.stop();
        };
        await audio.play();
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
      if (this.driver === 'expo-audio' && this.activePlayer) {
        if (typeof this.activePlayer.pause === 'function') {
          this.activePlayer.pause();
        }
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
        if (typeof this.activePlayer.pause === 'function') this.activePlayer.pause();
        if (typeof this.activePlayer.remove === 'function') this.activePlayer.remove();
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
