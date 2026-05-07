import { ActivityIndicator, Animated, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import type { AppNotice } from './NoticeBanner';
import { NoticeBanner } from './NoticeBanner';
import { Icon } from './Icon';

export function RecorderSheet({
  errorNotice,
  hasRecordingPermission,
  isLoading,
  isOpen,
  isRecording,
  isSaving,
  onClose,
  onStartRecording,
  onStopRecording,
  pulseOpacity,
  pulseScale,
  timerLabel,
}: {
  errorNotice: AppNotice | null;
  hasRecordingPermission: boolean | null;
  isLoading: boolean;
  isOpen: boolean;
  isRecording: boolean;
  isSaving: boolean;
  onClose: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  pulseOpacity: Animated.AnimatedInterpolation<number>;
  pulseScale: Animated.AnimatedInterpolation<number>;
  timerLabel: string;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!isRecording && !isSaving) {
          onClose();
        }
      }}
      visible={isOpen}
    >
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>New voice note</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isRecording || isSaving}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              (pressed || isRecording || isSaving) && styles.actionPressed,
            ]}
          >
            <Icon color="#2f241f" name="x" size={18} />
          </Pressable>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.body}>Click record when you&apos;re ready.</Text>
          <Text style={styles.timer}>{timerLabel}</Text>

          <View style={styles.actionWrap}>
            <Animated.View
              style={[
                styles.pulse,
                !isRecording ? styles.pulseHidden : null,
                {
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
                },
              ]}
            />

            <Pressable
              accessibilityRole="button"
              disabled={isLoading || isSaving}
              onPress={isRecording ? onStopRecording : onStartRecording}
              style={({ pressed }) => [
                styles.action,
                isRecording ? styles.actionStop : styles.actionStart,
                (pressed || isLoading || isSaving) && styles.actionPressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff7ef" />
              ) : (
                <Icon
                  color="#fff7ef"
                  name={isRecording ? 'square' : 'mic'}
                  size={26}
                />
              )}
            </Pressable>
          </View>

          {errorNotice ? <NoticeBanner notice={errorNotice} /> : null}

          {hasRecordingPermission === false ? (
            <Text style={styles.hint}>
              Microphone permission is required before you can record.
            </Text>
          ) : (
            <Text style={styles.hint}>
              This note will be saved on device and you can convert it into text when
              you have internet.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f1e8',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    color: '#1f1614',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#efe3d6',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sheet: {
    alignItems: 'center',
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    paddingBottom: 48,
    paddingHorizontal: 28,
  },
  body: {
    color: '#655146',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 280,
    textAlign: 'center',
  },
  timer: {
    color: '#1d1512',
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -2,
  },
  actionWrap: {
    alignItems: 'center',
    height: 180,
    justifyContent: 'center',
    width: 180,
  },
  pulse: {
    backgroundColor: '#d97a61',
    borderRadius: 999,
    height: 172,
    position: 'absolute',
    width: 172,
  },
  pulseHidden: {
    opacity: 0,
  },
  action: {
    alignItems: 'center',
    borderRadius: 999,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  actionStart: {
    backgroundColor: '#ab4d38',
  },
  actionStop: {
    backgroundColor: '#6b2c22',
  },
  hint: {
    color: '#6f5c51',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
  actionPressed: {
    opacity: 0.82,
  },
});
