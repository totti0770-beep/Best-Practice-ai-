import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { api } from '../../lib/api-client';

interface Document {
  id: string;
  titleAr: string;
  category: string;
  status: string;
  approvedAt: string | null;
  expiryDate: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  nursing_policy: 'سياسة تمريضية',
  drug_protocol: 'بروتوكول دوائي',
  cbahi_standard: 'معيار CBAHI',
  clinical_guideline: 'دليل سريري',
  procedure_manual: 'دليل الإجراءات',
};

export default function PoliciesScreen() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'active', limit: '50' });
      if (q) params.set('search', q);
      const { data } = await api.get(`/documents?${params}`);
      setDocuments(data.data?.items ?? data.data ?? []);
    } catch {
      Alert.alert('خطأ', 'فشل تحميل الوثائق');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchDocuments(search.trim() || undefined);

  const viewDocument = async (id: string) => {
    setViewLoading(id);
    try {
      const { data } = await api.get(`/documents/${id}/view`);
      const url = data.data?.url ?? data.url;
      if (url) await Linking.openURL(url);
    } catch {
      Alert.alert('خطأ', 'تعذر فتح الوثيقة');
    } finally {
      setViewLoading(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'active') return '#16a34a';
    if (status === 'approved') return '#2563eb';
    return '#94a3b8';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 مكتبة الوثائق</Text>
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>بحث</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث في الوثائق..."
            textAlign="right"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => viewDocument(item.id)}
              disabled={viewLoading === item.id}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
                <Text style={styles.categoryTag}>
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.titleAr}</Text>
              {item.approvedAt && (
                <Text style={styles.cardMeta}>
                  تاريخ الاعتماد: {new Date(item.approvedAt).toLocaleDateString('ar-SA')}
                </Text>
              )}
              {item.expiryDate && (
                <Text style={[styles.cardMeta, { color: '#f59e0b' }]}>
                  ينتهي: {new Date(item.expiryDate).toLocaleDateString('ar-SA')}
                </Text>
              )}
              {viewLoading === item.id && (
                <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 8 }} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>لا توجد وثائق متاحة</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', textAlign: 'right', marginBottom: 12 },
  searchRow: { flexDirection: 'row-reverse', gap: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8fafc' },
  searchBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  listContent: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  categoryTag: { fontSize: 11, color: '#7c3aed', backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', textAlign: 'right', lineHeight: 22 },
  cardMeta: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
