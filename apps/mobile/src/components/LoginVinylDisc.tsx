import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

interface LoginVinylDiscProps {
  primaryColor: string;
}

export const LoginVinylDisc: React.FC<LoginVinylDiscProps> = ({ primaryColor }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Responsive diameter matching reference image
  const discSize = Math.max(380, Math.min(SCREEN_WIDTH * 1.05, 480));
  const discRadius = discSize / 2;
  const labelSize = discSize * 0.34;
  const spindleSize = discSize * 0.08;

  // Ultra-gentle ambient rotation (60s full cycle)
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 60000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedSpin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Concentric groove ring radii
  const grooves = [
    0.96, 0.93, 0.90, 0.86, 0.82, 0.79, 0.75, 0.71, 0.67, 0.63, 0.59, 0.55, 0.51, 0.47, 0.43,
  ];

  return (
    <View
      style={[
        styles.outerContainer,
        {
          width: discSize + 60,
          height: discSize + 60,
          right: -discSize * 0.34,
          top: Math.max(20, SCREEN_HEIGHT * 0.04),
        },
      ]}
      pointerEvents="none"
    >
      {/* 1. Ambient Warm Radial Backlight Glow */}
      <View
        style={[
          styles.ambientGlow,
          {
            width: discSize * 0.85,
            height: discSize * 0.85,
            borderRadius: (discSize * 0.85) / 2,
            backgroundColor: primaryColor,
          },
        ]}
      />

      {/* 2. Planetary Orbit Arc & Glowing Satellite Dot */}
      {Platform.OS === 'web' ? (
        <svg
          width={discSize + 40}
          height={discSize + 40}
          viewBox={`0 0 ${discSize + 40} ${discSize + 40}`}
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
        >
          {/* Subtle curved orbital path */}
          <path
            d={`M ${discSize * 0.12} ${discSize * 0.46} A ${discRadius * 1.15} ${discRadius * 1.15} 0 0 1 ${discRadius * 0.95} ${discSize * 0.04}`}
            fill="none"
            stroke="rgba(232, 162, 130, 0.32)"
            strokeWidth="1.2"
            strokeDasharray="4 2"
          />
          {/* Glowing Satellite Planet Dot */}
          <circle
            cx={discSize * 0.30}
            cy={discSize * 0.19}
            r="5"
            fill={primaryColor}
            filter="drop-shadow(0px 0px 6px rgba(232, 162, 130, 0.8))"
          />
        </svg>
      ) : (
        <View
          style={[
            styles.nativeOrbitDot,
            {
              backgroundColor: primaryColor,
              left: discSize * 0.28,
              top: discSize * 0.18,
            },
          ]}
        />
      )}

      {/* 3. The Main Vinyl Record with Grooves and Sheen */}
      <Animated.View
        style={[
          styles.discBody,
          {
            width: discSize,
            height: discSize,
            borderRadius: discRadius,
          },
          animatedSpin,
        ]}
      >
        {/* Subtle Vinyl Grooves */}
        {grooves.map((ratio, idx) => {
          const r = discRadius * ratio;
          return (
            <View
              key={idx}
              style={[
                styles.grooveRing,
                {
                  width: r * 2,
                  height: r * 2,
                  borderRadius: r,
                  borderColor:
                    idx % 3 === 0
                      ? 'rgba(232, 162, 130, 0.09)'
                      : idx % 2 === 0
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.65)',
                },
              ]}
            />
          );
        })}

        {/* 4. Realistic Conical Sheen / Anisotropic Light Reflection (Web) */}
        {Platform.OS === 'web' && (
          <View
            style={[
              styles.conicSheen,
              {
                width: discSize,
                height: discSize,
                borderRadius: discRadius,
              },
            ]}
          />
        )}

        {/* 5. Center Label Disc in Material You Primary Tone */}
        <View
          style={[
            styles.centerLabel,
            {
              width: labelSize,
              height: labelSize,
              borderRadius: labelSize / 2,
              backgroundColor: primaryColor,
            },
          ]}
        >
          {/* Inner concentric rings on label */}
          <View
            style={[
              styles.labelInnerRing,
              {
                width: labelSize * 0.84,
                height: labelSize * 0.84,
                borderRadius: (labelSize * 0.84) / 2,
                borderColor: 'rgba(255, 255, 255, 0.22)',
              },
            ]}
          />
          <View
            style={[
              styles.labelInnerRing,
              {
                width: labelSize * 0.62,
                height: labelSize * 0.62,
                borderRadius: (labelSize * 0.62) / 2,
                borderColor: 'rgba(0, 0, 0, 0.25)',
              },
            ]}
          />

          {/* 6. Spindle Hole */}
          <View
            style={[
              styles.spindleHole,
              {
                width: spindleSize,
                height: spindleSize,
                borderRadius: spindleSize / 2,
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    left: '12%',
    top: '12%',
    opacity: 0.22,
    ...Platform.select({
      web: {
        filter: 'blur(55px)',
      },
      default: {
        shadowColor: '#C67D5A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
      },
    }),
  },
  nativeOrbitDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    zIndex: 3,
  },
  discBody: {
    backgroundColor: '#121010',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 162, 130, 0.25)',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -10, height: 16 },
        shadowOpacity: 0.6,
        shadowRadius: 28,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '-12px 20px 48px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.1)',
      },
    }),
  },
  grooveRing: {
    position: 'absolute',
    borderWidth: 0.75,
  },
  conicSheen: {
    position: 'absolute',
    left: 0,
    top: 0,
    pointerEvents: 'none',
    ...Platform.select({
      web: {
        backgroundImage:
          'conic-gradient(from 40deg, rgba(255, 255, 255, 0.08) 0deg, transparent 45deg, rgba(255, 255, 255, 0.04) 90deg, transparent 135deg, rgba(255, 255, 255, 0.09) 180deg, transparent 225deg, rgba(255, 255, 255, 0.04) 270deg, transparent 315deg, rgba(255, 255, 255, 0.08) 360deg)',
        mixBlendMode: 'screen',
      } as any,
    }),
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Platform.select({
      web: {
        backgroundImage:
          'radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(0, 0, 0, 0.15) 100%)',
        boxShadow: 'inset 0 0 16px rgba(0, 0, 0, 0.35)',
      } as any,
    }),
  },
  labelInnerRing: {
    position: 'absolute',
    borderWidth: 0.75,
  },
  spindleHole: {
    backgroundColor: '#0D0B0A',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});
