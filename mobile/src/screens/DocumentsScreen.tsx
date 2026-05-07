import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../ui/Icon';

export function DocumentsScreen({
  completedTranscriptCount,
  pendingSyncCount,
}: {
  completedTranscriptCount: number;
  pendingSyncCount: number;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Icon color="#2d241f" name="book-open" size={18} />
        </View>
        <Text style={styles.title}>Context sheets</Text>
        <Text style={styles.body}>
          This area will group transcribed field notes into larger context records.
          For now, synced notes will accumulate here as source material.
        </Text>
        <View style={styles.statRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{completedTranscriptCount}</Text>
            <Text style={styles.statLabel}>Ready notes</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{pendingSyncCount}</Text>
            <Text style={styles.statLabel}>Waiting on sync</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 144,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  hero: {
    backgroundColor: 'rgba(255, 250, 245, 0.92)',
    borderColor: 'rgba(170, 143, 126, 0.18)',
    borderRadius: 30,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ece0d4',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  title: {
    color: '#1f1614',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  body: {
    color: '#675349',
    fontSize: 15,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statPill: {
    backgroundColor: '#fff7ef',
    borderRadius: 20,
    flex: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statValue: {
    color: '#1f1614',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#7d685b',
    fontSize: 13,
    fontWeight: '600',
  },
});
