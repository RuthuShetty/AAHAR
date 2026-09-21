/**
 * AAHAR Mobile — Screen 19: Feed Quality Knowledge & Lessons
 * Voice-first bite-sized lessons on feed adulteration, silage fermentation, and ration balancing.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';
import { useSettingsStore } from '../store';
import { speechSynthesizer } from '../i18n/tts';

import { Icon } from '../components/Icon';

interface Lesson {
  title: string;
  icon: 'lab' | 'bunker' | 'droplet';
  duration: string;
  body_en: string;
  body_hi: string;
  body_pa: string;
}

const LESSONS: Lesson[] = [
  {
    title: 'Spotting Urea Cheating in Cake',
    icon: 'lab',
    duration: '2 min audio',
    body_en: 'Traders spike cattle cake with chemical urea to artificially inflate apparent protein tests from 18% to 28%. Urea is converted to toxic ammonia in the rumen, risking cow mortality.',
    body_hi: 'व्यापारी प्रोटीन प्रतिशत बढ़ाने के लिए चारे में यूरिया मिलाते हैं। यह यूरिया पेट में जहरीली अमोनिया बनाता है जिससे पशु बीमार हो सकते हैं।',
    body_pa: 'ਵਪਾਰੀ ਪ੍ਰੋਟੀਨ ਵਧਾਉਣ ਲਈ ਖ਼ਲ ਵਿੱਚ ਯੂਰੀਆ ਮਿਲਾਉਂਦੇ ਹਨ। ਇਹ ਪਸ਼ੂਆਂ ਲਈ ਜ਼ਹਿਰੀਲਾ ਹੁੰਦਾ ਹੈ ਅਤੇ ਮੌਤ ਦਾ ਕਾਰਨ ਬਣ ਸਕਦਾ ਹੈ।',
  },
  {
    title: 'The 65% Silage Moisture Sweet Spot',
    icon: 'bunker',
    duration: '3 min audio',
    body_en: 'Maize silage must be packed at 60–70% moisture. Above 70%, clostridial bacteria produce smelly butyric acid. Below 55%, trapped air causes mould and heating.',
    body_hi: 'मक्का साइलेज 60-70% नमी पर ही दबाएं। ज्यादा गीला होने पर बदबूदार सड़न और सूखा होने पर फफूंद लगती है।',
    body_pa: 'ਮੱਕੀ ਦੇ ਸਾਈਲੇਜ ਲਈ 60-70% ਨਮੀ ਸਭ ਤੋਂ ਵਧੀਆ ਹੈ। ਜ਼ਿਆਦਾ ਸਿੱਲ੍ਹ ਨਾਲ ਬਦਬੂ ਅਤੇ ਘੱਟ ਨਾਲ ਉੱਲੀ ਲੱਗਦੀ ਹੈ।',
  },
  {
    title: 'Monsoon Aflatoxin Prevention',
    icon: 'droplet',
    duration: '2 min audio',
    body_en: 'Fungi produce invisible aflatoxin B1 when dry feed exceeds 14% moisture. Keep feed elevated on wooden pallets, sun-dry damp grain, and never feed clumpy, discoloured cake.',
    body_hi: 'बरसात में नमी 14% से अधिक होने पर चारे में जहरीली फफूंद (एफ्लाटॉक्सिन) पैदा होती है। चारे को जमीन से ऊपर लकड़ी के तख्तों पर रखें।',
    body_pa: 'ਬਰਸਾਤ ਵਿੱਚ ਨਮੀ 14% ਤੋਂ ਉੱਪਰ ਜਾਣ ’ਤੇ ਉੱਲੀ ਲੱਗਦੀ ਹੈ। ਚਾਰੇ ਨੂੰ ਲੱਕੜ ਦੇ ਫੱਟਿਆਂ ’ਤੇ ਰੱਖੋ ਅਤੇ ਸਿੱਲ੍ਹ ਤੋਂ ਬਚਾਓ।',
  },
];

export default function LearnScreen() {
  const { language } = useSettingsStore();

  const handlePlay = (lesson: Lesson) => {
    const text = language === 'pa' ? lesson.body_pa : language === 'hi' ? lesson.body_hi : lesson.body_en;
    speechSynthesizer.speak(text, language);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dairy Feed Lessons</Text>
      <Text style={styles.subtitle}>Audio-visual feed management guides</Text>

      {LESSONS.map((l, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ marginRight: 12, justifyContent: 'center' }}>
              <Icon name={l.icon} size={24} color={THEME.colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.lessonTitle}>{l.title}</Text>
              <Text style={styles.durationBadge}>{l.duration}</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>
            {language === 'pa' ? l.body_pa : language === 'hi' ? l.body_hi : l.body_en}
          </Text>
          <TouchableOpacity style={[styles.listenBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]} onPress={() => handlePlay(l)}>
            <Icon name="volume" size={16} color="#ffffff" />
            <Text style={styles.listenText}>Listen Lesson in Your Language</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    ...THEME.typography.body,
    color: THEME.colors.accent,
    marginBottom: THEME.spacing.md,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  durationBadge: {
    fontSize: 11,
    color: THEME.colors.accent,
    marginTop: 2,
  },
  bodyText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 19,
    marginVertical: 8,
  },
  listenBtn: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.accent,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  listenText: {
    color: THEME.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
