import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions, Animated, Easing } from 'react-native';

interface LoginVinylDiscProps {
  primaryColor: string;
}

// Inject smooth continuous CSS spin for web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.getElementById('vinyl-spin-keyframes')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'vinyl-spin-keyframes';
    styleEl.textContent = `
      @keyframes vinylContinuousSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleEl);
  }
}

/**
 * Option D: The Vinyl Sleeve / Album Jacket Peek
 * An elevated tactile music ritual centerpiece for the Login/Welcome screen.
 * A matte cardstock 12" album jacket with debossed typography and die-cut thumb notch,
 * from which the spinning vinyl record smoothly emerges into the warm ambient light.
 */
export const LoginVinylDisc: React.FC<LoginVinylDiscProps> = ({ primaryColor }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // Responsive dimensions: scale gracefully across phones and small tablets
  const sleeveSize = Math.round(Math.min(SCREEN_WIDTH * 0.58, 240));
  const discSize = Math.round(sleeveSize * 1.08);
  const discRadius = discSize / 2;
  const labelSize = Math.round(discSize * 0.33);
  const spindleSize = Math.round(discSize * 0.08);

  // Position vinyl disc so center label is fully outside the jacket mouth in the light,
  // while the left crescent of grooved vinyl remains inside the sleeve pocket.
  const discLeft = Math.round(sleeveSize - labelSize / 2 + 12);
  const discTop = Math.round((sleeveSize - discSize) / 2);

  // Die-cut thumb notch dimensions on right edge of sleeve
  const notchHeight = 52;
  const notchDepth = 18;
  const flapHeight = (sleeveSize - notchHeight) / 2;

  // Responsive vertical positioning: bridges the middle empty space between manifesto and buttons
  // Placed with clean breathing room below the manifesto text and balanced gap above action buttons
  const middleTop = Math.round(
    Math.max(310, Math.min(SCREEN_HEIGHT * 0.425, 385))
  );

  // Align with left margin (24-28dp) so album spine cleanly aligns with editorial text
  const assemblyLeft = Math.max(20, Math.min(28, Math.round(SCREEN_WIDTH * 0.07)));
  const totalAssemblyWidth = discLeft + discSize;

  // Slow, silky ambient rotation (24s per revolution) on UI thread via native driver
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 24000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const animatedSpin = {
    transform: [{ rotate: spinInterpolation }],
  };

  const webSpinStyle =
    Platform.OS === 'web'
      ? ({
          animation: 'vinylContinuousSpin 24s linear infinite',
        } as any)
      : null;

  // 15 concentric micro-grooves
  const grooves = [
    0.96, 0.93, 0.90, 0.86, 0.82, 0.79, 0.75, 0.71, 0.67, 0.63, 0.59, 0.55, 0.51, 0.47, 0.43,
  ];

  return (
    <View
      style={[
        styles.assemblyContainer,
        {
          top: middleTop,
          left: assemblyLeft,
          width: totalAssemblyWidth,
          height: sleeveSize,
        },
      ]}
      pointerEvents="none"
    >
      {/* 1. Ambient Warm Radial Backlight Halo */}
      <View
        style={[
          styles.ambientGlow,
          {
            left: sleeveSize * 0.35,
            top: (sleeveSize - discSize * 0.85) / 2,
            width: discSize * 0.88,
            height: discSize * 0.88,
            borderRadius: (discSize * 0.88) / 2,
            backgroundColor: primaryColor,
          },
        ]}
      />

      {/* 2. Album Jacket Back Cover (Behind Vinyl Disc) */}
      <View
        style={[
          styles.sleeveBack,
          {
            width: sleeveSize,
            height: sleeveSize,
          },
        ]}
      >
        {/* Dark inner sleeve pocket shadow where the record sits */}
        <View style={styles.pocketShadow} />
      </View>

      {/* 3. The Spinning Vinyl Record */}
      <Animated.View
        style={[
          styles.discBody,
          {
            left: discLeft,
            top: discTop,
            width: discSize,
            height: discSize,
            borderRadius: discRadius,
          },
          animatedSpin,
          webSpinStyle,
        ]}
      >
        {/* Micro-groove rings */}
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
                      ? 'rgba(232, 162, 130, 0.10)'
                      : idx % 2 === 0
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.65)',
                },
              ]}
            />
          );
        })}

        {/* Conical light sheen on web */}
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

        {/* Center Label in Material You Primary Tone */}
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
          {/* Outer foil ring */}
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

          {/* Inner foil ring */}
          <View
            style={[
              styles.labelInnerRing,
              {
                width: labelSize * 0.62,
                height: labelSize * 0.62,
                borderRadius: (labelSize * 0.62) / 2,
                borderColor: 'rgba(0, 0, 0, 0.28)',
              },
            ]}
          />

          {/* Spindle Hole */}
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

      {/* 4. Album Jacket Front Cover (Sits in front of the disc's left portion) */}
      <View
        style={[
          styles.sleeveFrontContainer,
          {
            width: sleeveSize,
            height: sleeveSize,
          },
        ]}
      >
        {/* Left main cardstock panel */}
        <View
          style={[
            styles.sleeveMainPanel,
            {
              width: sleeveSize - notchDepth,
              height: sleeveSize,
            },
          ]}
        >
          {/* Subtle left spine rule */}
          <View style={styles.spineRule} />

          {/* Minimalist blind-debossed center medallion */}
          <View style={styles.centerMedallion}>
            <View style={styles.medallionInnerRing}>
              <Text style={styles.medallionNumber}>365</Text>
            </View>
          </View>
        </View>

        {/* Right edge die-cut flaps forming the thumb notch */}
        <View style={styles.rightEdgeFlapColumn}>
          {/* Top flap */}
          <View style={[styles.rightFlapTop, { height: flapHeight, width: notchDepth }]} />

          {/* Arched thumb notch cutout showing spinning vinyl inside */}
          <View style={[styles.thumbNotchFrame, { height: notchHeight, width: notchDepth }]} />

          {/* Bottom flap */}
          <View style={[styles.rightFlapBottom, { height: flapHeight, width: notchDepth }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  assemblyContainer: {
    position: 'absolute',
    zIndex: 1,
    // Subtle -3deg tilt gives authentic tabletop LP crate feel
    transform: [{ rotate: '-3deg' }],
  },
  ambientGlow: {
    position: 'absolute',
    opacity: 0.28,
    ...Platform.select({
      web: {
        filter: 'blur(55px)',
      },
      default: {
        shadowColor: '#C67D5A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 40,
      },
    }),
  },
  sleeveBack: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#141316',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 162, 130, 0.14)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -8, height: 16 },
        shadowOpacity: 0.6,
        shadowRadius: 28,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '-10px 18px 44px rgba(0, 0, 0, 0.7)',
      },
    }),
  },
  pocketShadow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: '#09080A',
    opacity: 0.8,
  },
  discBody: {
    position: 'absolute',
    backgroundColor: '#111012',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 162, 130, 0.24)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 12 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
      },
      android: {
        elevation: 14,
      },
      web: {
        boxShadow: '-8px 14px 36px rgba(0, 0, 0, 0.65)',
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
  sleeveFrontContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
  },
  sleeveMainPanel: {
    backgroundColor: '#19181B',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(232, 162, 130, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  spineRule: {
    position: 'absolute',
    left: 8,
    top: 12,
    bottom: 12,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  centerMedallion: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.2,
    borderColor: 'rgba(232, 162, 130, 0.20)',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  medallionInnerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  medallionNumber: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    lineHeight: 24,
    color: 'rgba(232, 162, 130, 0.78)',
  },
  rightEdgeFlapColumn: {
    width: 18,
    justifyContent: 'space-between',
  },
  rightFlapTop: {
    backgroundColor: '#19181B',
    borderTopRightRadius: 12,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(232, 162, 130, 0.18)',
  },
  thumbNotchFrame: {
    borderTopLeftRadius: 26,
    borderBottomLeftRadius: 26,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(232, 162, 130, 0.22)',
    // Transparent interior allows the spinning vinyl disc underneath to be visible
    backgroundColor: 'transparent',
  },
  rightFlapBottom: {
    backgroundColor: '#19181B',
    borderBottomRightRadius: 12,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(232, 162, 130, 0.18)',
  },
});
