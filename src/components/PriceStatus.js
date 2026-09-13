import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, R } from '../theme';
import { useI18n } from '../i18n';
import { isStaleDate } from '../priceSnapshot.mjs';

export default function PriceStatus({ priceMap }) {
  const { t, lang } = useI18n();
  const snapshot = priceMap?.__snapshot;
  const uncertain = !snapshot || isStaleDate(snapshot.primary_snapshot) || snapshot.stale_sources?.length || !Object.keys(snapshot.details || {}).length;
  const date = snapshot?.primary_snapshot;
  return <View style={styles.root}>
    <Text style={styles.title}>{priceMap ? t('prices.title', { source: snapshot?.primary_label || '—' }) : t('prices.none')}</Text>
    {!!date && Number.isFinite(Date.parse(date)) && <Text style={styles.text}>{t('prices.date', { date: new Date(date).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US') })}</Text>}
    <Text style={styles.text}>{t('prices.basis')}{uncertain ? ' ' + t('prices.warning') : ''}</Text>
  </View>;
}
const styles = StyleSheet.create({
  root: { backgroundColor: C.surfaceAlt, borderColor: C.border, borderWidth: 1, borderRadius: R.sm, padding: 10, margin: 8, gap: 3 },
  title: { color: C.text, fontSize: 12, fontWeight: '700' },
  text: { color: C.textDim, fontSize: 11, lineHeight: 16 },
});
