import { StyleSheet, Text, View } from 'react-native';

import { Icon } from './Icon';

export type NoticeTone = 'error' | 'info' | 'success';

export type AppNotice = {
  tone: NoticeTone;
  text: string;
};

export function NoticeBanner({ notice }: { notice: AppNotice }) {
  return (
    <View
      style={[
        styles.noticeBanner,
        notice.tone === 'error'
          ? styles.noticeBannerError
          : notice.tone === 'success'
            ? styles.noticeBannerSuccess
            : styles.noticeBannerInfo,
      ]}
    >
      <Icon
        color={notice.tone === 'error' ? '#9d4333' : '#27573e'}
        name={notice.tone === 'error' ? 'alert-circle' : 'check-circle'}
        size={16}
      />
      <Text
        style={[
          styles.noticeText,
          notice.tone === 'error'
            ? styles.noticeTextError
            : styles.noticeTextSuccess,
        ]}
      >
        {notice.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeBanner: {
    alignItems: 'flex-start',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeBannerError: {
    backgroundColor: '#f4dfd8',
  },
  noticeBannerInfo: {
    backgroundColor: '#dde9e1',
  },
  noticeBannerSuccess: {
    backgroundColor: '#dde9e1',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  noticeTextError: {
    color: '#8c3b2e',
  },
  noticeTextSuccess: {
    color: '#27573e',
  },
});
