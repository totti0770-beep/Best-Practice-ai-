import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../../lib/api-client';

interface Formula {
  id: string;
  nameAr: string;
  formulaExpression: string;
  variables: Array<{ name: string; labelAr: string; unit: string; min?: number; max?: number }>;
  unitOfResult: string;
}

interface CalcResult {
  result: number;
  unit: string;
  steps: string[];
  warnings: string[];
}

export default function DoseCalculatorScreen() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [selected, setSelected] = useState<Formula | null>(null);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get('/dose-calculator/formulas')
      .then(({ data }) => setFormulas(data.data ?? data))
      .catch(() => Alert.alert('خطأ', 'فشل تحميل المعادلات'))
      .finally(() => setFetching(false));
  }, []);

  const selectFormula = (f: Formula) => {
    setSelected(f);
    setVars({});
    setResult(null);
  };

  const calculate = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const variables: Record<string, number> = {};
      for (const v of selected.variables) {
        const val = parseFloat(vars[v.name]);
        if (isNaN(val)) {
          Alert.alert('خطأ', `أدخل قيمة صحيحة لـ ${v.labelAr}`);
          return;
        }
        variables[v.name] = val;
      }
      const { data } = await api.post('/dose-calculator/calculate', {
        formulaId: selected.id,
        variables,
      });
      setResult(data.data ?? data);
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'فشل الحساب');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💊 حاسبة الجرعات</Text>
        <Text style={styles.headerSub}>معادلات معتمدة من الصيادلة</Text>
      </View>

      {!selected ? (
        <>
          <Text style={styles.sectionTitle}>اختر المعادلة</Text>
          {formulas.map((f) => (
            <TouchableOpacity key={f.id} style={styles.formulaCard} onPress={() => selectFormula(f)}>
              <Text style={styles.formulaName}>{f.nameAr}</Text>
              <Text style={styles.formulaExpr}>{f.formulaExpression}</Text>
            </TouchableOpacity>
          ))}
          {formulas.length === 0 && (
            <Text style={styles.emptyText}>لا توجد معادلات متاحة حالياً</Text>
          )}
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setSelected(null); setResult(null); }}>
            <Text style={styles.backText}>← العودة للمعادلات</Text>
          </TouchableOpacity>

          <View style={styles.selectedCard}>
            <Text style={styles.selectedName}>{selected.nameAr}</Text>
            <Text style={styles.selectedExpr}>{selected.formulaExpression}</Text>
          </View>

          {selected.variables.map((v) => (
            <View key={v.name} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{v.labelAr} ({v.unit})</Text>
              <TextInput
                style={styles.input}
                value={vars[v.name] || ''}
                onChangeText={(val) => setVars((prev) => ({ ...prev, [v.name]: val }))}
                placeholder={v.min !== undefined ? `${v.min} - ${v.max}` : 'أدخل القيمة'}
                keyboardType="decimal-pad"
                textAlign="right"
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.calcBtn, loading && styles.calcDisabled]}
            onPress={calculate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.calcText}>احسب الجرعة</Text>}
          </TouchableOpacity>

          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>النتيجة</Text>
              <Text style={styles.resultValue}>{result.result} {result.unit}</Text>

              {result.steps?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.subTitle}>خطوات الحساب:</Text>
                  {result.steps.map((s, i) => (
                    <Text key={i} style={styles.stepText}>• {s}</Text>
                  ))}
                </View>
              )}

              {result.warnings?.length > 0 && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningTitle}>⚠️ تحذيرات سريرية</Text>
                  {result.warnings.map((w, i) => (
                    <Text key={i} style={styles.warningText}>• {w}</Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', textAlign: 'right' },
  headerSub: { fontSize: 13, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#475569', textAlign: 'right', marginBottom: 12 },
  formulaCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderRightWidth: 4, borderRightColor: '#16a34a', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  formulaName: { fontSize: 15, fontWeight: '600', color: '#1e293b', textAlign: 'right' },
  formulaExpr: { fontSize: 12, color: '#64748b', textAlign: 'right', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#2563eb', fontSize: 14 },
  selectedCard: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#bbf7d0' },
  selectedName: { fontSize: 16, fontWeight: 'bold', color: '#166534', textAlign: 'right' },
  selectedExpr: { fontSize: 12, color: '#4ade80', textAlign: 'right', marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#475569', textAlign: 'right', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, backgroundColor: '#fff' },
  calcBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  calcDisabled: { opacity: 0.6 },
  calcText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginTop: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  resultTitle: { fontSize: 14, color: '#64748b', textAlign: 'right', marginBottom: 6 },
  resultValue: { fontSize: 28, fontWeight: 'bold', color: '#16a34a', textAlign: 'right', marginBottom: 16 },
  section: { marginBottom: 12 },
  subTitle: { fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'right', marginBottom: 6 },
  stepText: { fontSize: 13, color: '#334155', textAlign: 'right', lineHeight: 22 },
  warningBox: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fde68a' },
  warningTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', textAlign: 'right', marginBottom: 6 },
  warningText: { fontSize: 12, color: '#78350f', textAlign: 'right', lineHeight: 20 },
});
