import { Platform } from 'react-native';

type PlaybackListener = (status: { isPlaying: boolean; didJustFinish: boolean }) => void;

class ResilientAudioService {
  private currentUri: string | null = null;
  private activePlayer: any = null;
  private subscriptions: any[] = [];
  private webAudio: any = null;
  private driver: 'expo-av' | 'expo-audio' | 'expo-video' | 'web' | 'none' = 'none';

  constructor() {
    this.detectDriver();
  }

  private detectDriver() {
    // 1. Web browser environment
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      this.driver = 'web';
      return;
    }

    // 2. expo-av (First-class support in standard Expo Go & native Android/iOS APK)
    try {
      const { Audio } = require('expo-av');
      if (Audio && Audio.Sound) {
        this.driver = 'expo-av';
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        }).catch(() => {});
        return;
      }
    } catch (e) {}

    // 3. expo-audio (development build / custom client)
    try {
      const ea = require('expo-audio');
      if (ea && typeof ea.createAudioPlayer === 'function') {
        this.driver = 'expo-audio';
        return;
      }
    } catch (e) {}

    // 4. expo-video (fallback native driver)
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
        if (this.driver === 'expo-av' && this.activePlayer) {
          await this.activePlayer.playAsync();
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

      // 2. expo-av (Standard physical sound in Expo Go Android/iOS)
      if (this.driver === 'expo-av') {
        const { Audio } = require('expo-av');
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status: any) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                onPlaybackStatus?.({ isPlaying: false, didJustFinish: true });
                this.stop();
              } else {
                onPlaybackStatus?.({ isPlaying: status.isPlaying, didJustFinish: false });
              }
            }
          }
        );
        this.activePlayer = sound;
        onPlaybackStatus?.({ isPlaying: true, didJustFinish: false });
        return true;
      }

      // 3. expo-audio
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

      // 4. expo-video
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

      // Fallback
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
      } else if (this.driver === 'expo-av' && this.activePlayer) {
        await this.activePlayer.pauseAsync();
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
        if (this.driver === 'expo-av') {
          try {
            await this.activePlayer.stopAsync();
            await this.activePlayer.unloadAsync();
          } catch {}
        } else if (typeof this.activePlayer.pause === 'function') {
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
