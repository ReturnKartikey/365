import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { Song } from '@365/core';

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
  const [progress, setProgress] = useState(0); // 0 to 1
  const [pulse, setPulse] = useState(0.8);

  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedProgressRef = useRef<number>(0);
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
    setProgress(0);
    setPulse(0.8);
    pausedProgressRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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

  const resumePlayback = () => {
    setIsPlaying(true);
    const totalMs = durationSeconds * 1000;
    startTimeRef.current = performance.now() - pausedProgressRef.current * totalMs;

    if (audioElementRef.current) {
      audioElementRef.current.play().catch(() => {});
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const curProgress = Math.min(1, elapsed / totalMs);
      pausedProgressRef.current = curProgress;
      setProgress(curProgress);
      // Rhythmic smooth pulse wave (like music breathing)
      setPulse(0.7 + 0.3 * Math.sin(now * 0.007));

      if (curProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        stopPlayback();
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      if (pausedProgressRef.current > 0 && pausedProgressRef.current < 1) {
        resumePlayback();
      } else {
        setIsPlaying(true);
        setProgress(0);
        pausedProgressRef.current = 0;
        const totalMs = durationSeconds * 1000;
        startTimeRef.current = performance.now();

        if (song.metadata.previewUrl && typeof window !== 'undefined' && window.Audio) {
          try {
            const audio = new window.Audio(song.metadata.previewUrl);
            audioElementRef.current = audio;
            audio.play().catch(() => {
              startSynthesizedHook();
            });
          } catch {
            startSynthesizedHook();
          }
        } else {
          startSynthesizedHook();
        }

        const tick = (now: number) => {
          const elapsed = now - startTimeRef.current;
          const curProgress = Math.min(1, elapsed / totalMs);
          pausedProgressRef.current = curProgress;
          setProgress(curProgress);
          setPulse(0.7 + 0.3 * Math.sin(now * 0.007));

          if (curProgress < 1) {
            animationFrameRef.current = requestAnimationFrame(tick);
          } else {
            stopPlayback();
          }
        };

        animationFrameRef.current = requestAnimationFrame(tick);
      }
    }
  };

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
      {/* Animated Greyish Progress Fill Bar from Left to Right with Smooth Pulse */}
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: progressFillColor,
            borderRadius: shapes.full,
          },
        ]}
      >
        {/* Living pulse wave layer */}
        {isPlaying && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                opacity: pulse,
                borderRadius: shapes.full,
              },
            ]}
          />
        )}
        {/* Leading edge subtle glowing beacon */}
        {isPlaying && progress > 0.01 && (
          <View
            style={[
              styles.leadingPulseBar,
              {
                backgroundColor: colors.primary,
                opacity: 0.7 * pulse,
              },
            ]}
          />
        )}
      </View>

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
            {Math.ceil((1 - progress) * durationSeconds)}s
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
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
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
