import React, { useEffect, useRef, useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { GlobalAudioService } from '../services/AudioService';

const HTML_PLAYER = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Audio Bridge</title>
</head>
<body style="background:transparent;margin:0;padding:0;">
  <audio id="player" playsinline preload="auto"></audio>
  <script>
    const audio = document.getElementById('player');

    function send(type, data) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
        }
      } catch (err) {}
    }

    audio.addEventListener('playing', function() {
      send('playing', { currentTime: audio.currentTime });
    });

    audio.addEventListener('pause', function() {
      send('paused', {});
    });

    audio.addEventListener('ended', function() {
      send('ended', {});
    });

    audio.addEventListener('error', function() {
      const err = audio.error ? (audio.error.message || 'Code ' + audio.error.code) : 'Playback error';
      send('error', { error: err });
    });

    window.playAudio = function(url) {
      try {
        if (audio.src !== url) {
          audio.src = url;
          audio.currentTime = 0;
          audio.load();
        }
        const promise = audio.play();
        if (promise && promise.catch) {
          promise.catch(function(e) {
            send('error', { error: e.message });
          });
        }
      } catch (e) {
        send('error', { error: e.message });
      }
    };

    window.pauseAudio = function() {
      try {
        audio.pause();
      } catch (e) {}
    };

    window.stopAudio = function() {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      } catch (e) {}
    };

    // Tell React Native the bridge is ready
    send('ready', {});
  </script>
</body>
</html>`;

export const GlobalAudioBridge: React.FC = () => {
  // On Web, audio is handled natively by window.Audio; do not render WebView
  if (Platform.OS === 'web') {
    return null;
  }

  const webViewRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Register the bridge with GlobalAudioService
    GlobalAudioService.registerBridge({
      play: (url: string) => {
        if (isReady && webViewRef.current) {
          const escaped = JSON.stringify(url);
          webViewRef.current.injectJavaScript(`window.playAudio(${escaped}); true;`);
        } else {
          pendingUrlRef.current = url;
        }
      },
      pause: () => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.pauseAudio(); true;`);
        }
      },
      stop: () => {
        pendingUrlRef.current = null;
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`window.stopAudio(); true;`);
        }
      },
      isReady: () => isReady,
    });

    return () => {
      GlobalAudioService.unregisterBridge();
    };
  }, [isReady]);

  // Load react-native-webview dynamically to prevent errors if missing
  let WebViewComponent: any = null;
  try {
    const rnw = require('react-native-webview');
    WebViewComponent = rnw.WebView || rnw.default;
  } catch (e) {
    console.warn('[GlobalAudioBridge] react-native-webview not loaded:', e);
    return null;
  }

  if (!WebViewComponent) {
    return null;
  }

  const handleMessage = (event: any) => {
    try {
      const raw = event?.nativeEvent?.data;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const { type, data } = parsed;

      if (type === 'ready') {
        setIsReady(true);
        if (pendingUrlRef.current && webViewRef.current) {
          const url = pendingUrlRef.current;
          pendingUrlRef.current = null;
          const escaped = JSON.stringify(url);
          webViewRef.current.injectJavaScript(`window.playAudio(${escaped}); true;`);
        }
      } else if (type === 'playing') {
        GlobalAudioService.notifyStatus({ isPlaying: true, didJustFinish: false });
      } else if (type === 'paused') {
        GlobalAudioService.notifyStatus({ isPlaying: false, didJustFinish: false });
      } else if (type === 'ended') {
        GlobalAudioService.notifyStatus({ isPlaying: false, didJustFinish: true });
      } else if (type === 'error') {
        console.warn('[GlobalAudioBridge] Audio error:', data?.error);
        GlobalAudioService.notifyStatus({ isPlaying: false, didJustFinish: true });
      }
    } catch (e) {
      console.warn('[GlobalAudioBridge] Message handle error:', e);
    }
  };

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebViewComponent
        ref={webViewRef}
        source={{ html: HTML_PLAYER }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        onMessage={handleMessage}
        style={styles.webView}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 2,
    height: 2,
    opacity: 0.01,
    overflow: 'hidden',
  },
  webView: {
    width: 2,
    height: 2,
  },
});
