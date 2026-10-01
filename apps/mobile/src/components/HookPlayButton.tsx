import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Play, Pause } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Song } from '@365/core';

interface HookPlayButtonProps {
  song: Song;
  durationSeconds?: number;
  style?: ViewStyle;
}

export const HookPlayButton: React.FC<HookPlayButtonProps> = ({
  song,
  durationSeconds = 15,
  style,
}) => {
  const { colors, shapes, typography, isDark } = useTheme();

  const [isPlaying, setIsPlaying] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  // 120 FPS UI-Thread Reanimated Shared Values
  const progressAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(0.3);

  const timerIntervalRef = useRef<any>(null);
  const totalMs = durationSeconds * 1000;
  const currentProgressRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<any>(null);
  const synthNodesRef = useRef<any[]>([]);

  // Cleanup on unmount or song change
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [song.id]);

  const startSynthesizedHook = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const chords = [
        [146.83, 220.0, 277.18, 329.63, 440.0],
        [185.0, 220.0, 277.18, 329.63, 440.0],
        [196.0, 246.94, 293.66, 369.99, 440.0],
        [220.0, 277.18, 329.63, 392.0, 493.88],
      ];

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.connect(masterGain);

      const chordDuration = durationSeconds / chords.length;

      chords.forEach((chord, chordIdx) => {
        const chordStartTime = ctx.currentTime + chordIdx * chordDuration;

        chord.forEach((freq, noteIdx) => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc.type = noteIdx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, chordStartTime);

          const noteOffset = noteIdx * 0.03;
          noteGain.gain.setValueAtTime(0.001, chordStartTime + noteOffset);
          noteGain.gain.exponentialRampToValueAtTime(0.35 / chord.length, chordStartTime + noteOffset + 0.08);
          noteGain.gain.exponentialRampToValueAtTime(0.001, chordStartTime + chordDuration - 0.05);

          osc.connect(noteGain);
          noteGain.connect(filter);

          osc.start(chordStartTime + noteOffset);
          osc.stop(chordStartTime + chordDuration);

          synthNodesRef.current.push(osc);
        });
      });
    } catch (e) {
      console.warn('Web Audio synthesis fallback not available:', e);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setRemainingSeconds(durationSeconds);
    currentProgressRef.current = 0;

    cancelAnimation(progressAnim);
    cancelAnimation(pulseAnim);
    progressAnim.value = withTiming(0, { duration: 180 });
    pulseAnim.value = 0.3;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    synthNodesRef.current = [];
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    cancelAnimation(progressAnim);
    cancelAnimation(pulseAnim);
    currentProgressRef.current = progressAnim.value;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.suspend();
      } catch {}
    }
  };

  const startAnimationLoop = (fromFraction: number) => {
    const remainingFraction = 1 - fromFraction;
    const remainingMs = Math.max(0, remainingFraction * totalMs);

    // 1. Butter-smooth UI-thread progress animation (linear transition)
    progressAnim.value = withTiming(
      1,
      {
        duration: remainingMs,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) {
          runOnJS(stopPlayback)();
        }
      }
    );

    // 2. Liquid, organic breathing pulse (in/out sinusoidal ease)
    pulseAnim.value = withRepeat(
      withTiming(0.85, {
        duration: 850,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    // 3. Low-overhead 1Hz countdown interval for display text only
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const startSec = Math.ceil(remainingFraction * durationSeconds);
    setRemainingSeconds(startSec);

    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      setIsPlaying(true);
      const current = currentProgressRef.current;

      if (current === 0) {
        // Start fresh
        if (song.metadata?.previewUrl && typeof window !== 'undefined' && window.Audio) {
          try {
            const audio = new window.Audio(song.metadata.previewUrl);
            audioElementRef.current = audio;
            audio.play().catch(() => startSynthesizedHook());
          } catch {
            startSynthesizedHook();
          }
        } else {
          startSynthesizedHook();
        }
        startAnimationLoop(0);
      } else {
        // Resume from current progress
        if (audioElementRef.current) {
          audioElementRef.current.play().catch(() => {});
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        startAnimationLoop(current);
      }
    }
  };

  // Reanimated style for the smooth filling progress bar
  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, progressAnim.value * 100))}%`,
  }));

  // Reanimated style for the gentle pulsing glow wave
  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  const progressFillColor = isDark
    ? 'rgba(255, 255, 255, 0.16)'
    : 'rgba(0, 0, 0, 0.10)';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleTogglePlay}
      style={[
        styles.buttonContainer,
        {
          borderRadius: shapes.full,
          backgroundColor: colors.surfaceContainerHighest,
          borderColor: colors.outlineVariant,
        },
        style,
      ]}
    >
      {/* 120 FPS Reanimated Progress Bar */}
      <Animated.View
        style={[
          styles.progressFill,
          { backgroundColor: progressFillColor },
          animatedProgressStyle,
        ]}
      >
        {/* Buttery smooth breathing pulse layer */}
        {isPlaying && (
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
              },
              animatedPulseStyle,
            ]}
          />
        )}
        {/* Leading edge subtle glowing beacon */}
        {isPlaying && (
          <Animated.View
            style={[
              styles.leadingPulseBar,
              {
                backgroundColor: colors.primary,
              },
              animatedPulseStyle,
            ]}
          />
        )}
      </Animated.View>

      {/* Button Content (Icons & Label) */}
      <View style={styles.contentRow}>
        {isPlaying ? (
          <View style={styles.iconWrapper}>
            <Pause
              size={18}
              color={colors.primary}
              fill={colors.primary}
              strokeWidth={1}
            />
          </View>
        ) : (
          <View style={styles.iconWrapper}>
            <Play
              size={18}
              color={colors.primary}
              fill={colors.primary}
              strokeWidth={1}
            />
          </View>
        )}

        <Text
          style={[
            styles.label,
            {
              color: colors.onSurface,
              fontFamily: typography.labelLarge.fontFamilySans,
              fontSize: typography.labelLarge.fontSize + 1,
            },
          ]}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Text>

        {isPlaying && (
          <Text
            style={[
              styles.timeIndicator,
              {
                color: colors.onSurfaceVariant,
                fontFamily: typography.labelSmall.fontFamilySans,
              },
            ]}
          >
            {remainingSeconds}s
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    height: 54,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  leadingPulseBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    gap: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeIndicator: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});
