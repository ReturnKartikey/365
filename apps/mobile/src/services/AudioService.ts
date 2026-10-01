import { Audio } from 'expo-av';

class AudioService {
  private currentSound: Audio.Sound | null = null;
  private currentUri: string | null = null;
  private isAudioModeConfigured = false;

  private async configureAudioMode() {
    if (!this.isAudioModeConfigured) {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        this.isAudioModeConfigured = true;
      } catch (e) {
        console.warn('[AudioService] AudioMode config warning:', e);
      }
    }
  }

  /**
   * Plays an audio preview URI with automatic completion handling
   */
  async playPreview(
    uri: string,
    onPlaybackStatus?: (status: { isPlaying: boolean; didJustFinish: boolean }) => void
  ): Promise<boolean> {
    try {
      await this.configureAudioMode();

      // If already loaded for the same URI, resume or toggle
      if (this.currentSound && this.currentUri === uri) {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded) {
          if (!status.isPlaying) {
            await this.currentSound.playAsync();
          }
          return true;
        }
      }

      // Stop any existing playback
      await this.stop();

      this.currentUri = uri;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, isLooping: false, volume: 1.0 },
        (status) => {
          if (status.isLoaded) {
            onPlaybackStatus?.({
              isPlaying: status.isPlaying,
              didJustFinish: status.didJustFinish,
            });
            if (status.didJustFinish) {
              this.stop();
            }
          }
        }
      );

      this.currentSound = sound;
      return true;
    } catch (e) {
      console.warn('[AudioService] Failed to play preview audio:', e);
      this.currentSound = null;
      this.currentUri = null;
      return false;
    }
  }

  async pause(): Promise<void> {
    if (this.currentSound) {
      try {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await this.currentSound.pauseAsync();
        }
      } catch (e) {
        console.warn('[AudioService] Pause error:', e);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
      } catch {}
      try {
        await this.currentSound.unloadAsync();
      } catch {}
      this.currentSound = null;
      this.currentUri = null;
    }
  }

  getCurrentUri(): string | null {
    return this.currentUri;
  }
}

export const GlobalAudioService = new AudioService();
