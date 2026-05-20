# منصة CNPV — حوكمة المعرفة والقرار الموثوق

> **CNPV Platform** — Certified Nursing Practice & Knowledge Vault

منصة صحية متكاملة تساعد الممرضين أثناء الدوام على:
- الاستفسار عن تحضير الأدوية
- مراجعة السياسات التمريضية
- حساب جرعات الأدوية
- الاستعلام عن معايير CBAHI
- الحصول على إجابات **موثقة من PDF معتمد فقط** — مع منع الهلوسة التام

---

## المعمارية

```
cnpv-platform/
├── packages/shared-types/    # TypeScript enums & types مشتركة
├── apps/backend/             # NestJS API (port 3001)
├── apps/web/                 # Next.js 14 App Router (port 3000)
├── apps/mobile/              # React Native + Expo
├── infra/postgres/init.sql   # CREATE EXTENSION vector
├── docker-compose.yml
└── .env.example
```

---

## متطلبات التشغيل

- Docker + Docker Compose
- Node.js v18+ (للتطوير المحلي بدون Docker)
- مفتاح Anthropic API (للـ AI)

---

## التشغيل السريع (Docker)

```bash
# 1. انسخ المستودع
cd cnpv-platform

# 2. أنشئ ملف البيئة
cp .env.example .env
# عدّل ANTHROPIC_API_KEY و JWT_SECRET و ENCRYPTION_KEY

# 3. شغّل جميع الخدمات
docker compose up -d

# 4. انتظر حتى يُصبح PostgreSQL جاهزاً ثم شغّل الـ migrations
docker compose exec backend npm run migration:run

# 5. أدخل البيانات التجريبية
docker compose exec backend npm run seed

# 6. افتح المتصفح
open http://localhost:3000
```

---

## بيانات الدخول التجريبية

| الدور | البريد الإلكتروني | كلمة المرور |
|-------|------------------|-------------|
| مسؤول عام | admin@cnpv.sa | Admin@1234! |
| مدير مستشفى | hospital-admin@cnpv.sa | HAdmin@1234! |
| ممرضة | nurse@cnpv.sa | Nurse@1234! |
| صيدلاني مراجع | pharmacist@cnpv.sa | Pharm@1234! |
| مدير المعرفة | km@cnpv.sa | KMgr@1234! |

---

## التطوير المحلي (بدون Docker)

```bash
# تثبيت الحزم
npm install --workspaces

# تشغيل PostgreSQL + Redis + MinIO (Docker فقط)
docker compose up postgres redis minio minio-init -d

# تشغيل الـ backend
cd apps/backend
cp ../../.env.example .env  # عدّل القيم
npm run migration:run
npm run seed
npm run dev

# تشغيل الـ web
cd apps/web
npm run dev

# تشغيل Mobile
cd apps/mobile
npx expo start
```

---

## نظرة عامة على الـ API

Base URL: `http://localhost:3001/v1`

Swagger Docs: `http://localhost:3001/docs`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | تسجيل الدخول |
| POST | /auth/mfa/verify | التحقق بخطوتين |
| POST | /auth/refresh | تجديد التوكن |
| POST | /auth/logout | تسجيل الخروج |
| GET | /auth/me | بيانات المستخدم الحالي |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | /documents/upload | رفع وثيقة PDF |
| POST | /documents/:id/submit-review | إرسال للمراجعة |
| POST | /documents/:id/approve | اعتماد الوثيقة |
| POST | /documents/:id/index | فهرسة في AI |
| POST | /documents/:id/activate | تفعيل |
| GET | /documents/:id/view | رابط مؤقت للعرض |

### AI Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | /ai/sessions | إنشاء جلسة محادثة |
| POST | /ai/sessions/:id/ask | سؤال AI (RAG) |
| GET | /ai/sessions/:id/messages | سجل المحادثة |

### Dose Calculator
| Method | Path | Description |
|--------|------|-------------|
| GET | /dose-calculator/formulas | قائمة المعادلات |
| POST | /dose-calculator/calculate | حساب الجرعة |

---

## RAG Pipeline

```
PDF Upload → MinIO Storage
    ↓
PDF Text Extraction (pdf-parse)
    ↓
Arabic Text Normalization
    ↓
Chunking (500 tokens, 50 overlap)
    ↓
Embeddings (Anthropic voyage-3)
    ↓
pgvector Storage (HNSW index)
    ↓
User Query → Embed → ANN Search (top-20)
    ↓
Similarity Filter (threshold 0.7) → top-5
    ↓
Strict Arabic Prompt + Context
    ↓
Claude claude-sonnet-4-6 (temperature=0.1)
    ↓
Structured Response: answerShort + steps + warnings + citations
    ↓
If no source → "لا توجد وثيقة معتمدة كافية للإجابة"
```

---

## الأدوار والصلاحيات

| الدور | رفع وثيقة | اعتماد | فهرسة AI | إدارة مستخدمين | سجل تدقيق |
|-------|----------|--------|---------|---------------|-----------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hospital Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Knowledge Manager | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pharmacist Reviewer | ✅ | ✅ | ❌ | ❌ | ❌ |
| CBAHI Officer | ✅ | ✅ | ❌ | ❌ | ❌ |
| Nurse | ❌ | ❌ | ❌ | ❌ | ❌ |
| Auditor | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## سير اعتماد الوثيقة

```
Draft → Under Review → Approved → Indexed → Active
                ↘ Rejected → Draft
                                        ↓
                                    Expired (auto/manual)
                                        ↓
                                 Removed from AI Retrieval
```

---

## الأمان

- JWT (15min) + Refresh Tokens (7 days, hashed SHA-256)
- MFA (TOTP) إلزامي للمسؤولين
- RBAC على كل endpoint
- Hospital isolation في كل query
- Signed URLs (30s expiry) لعرض PDFs
- Rate limiting: 100 req/min عام، 20 req/min للـ AI
- Audit log لكل حدث
- AES-256-GCM لتشفير MFA secrets

---

## متغيرات البيئة المطلوبة

```bash
DATABASE_URL=postgresql://cnpv_user:changeme@postgres:5432/cnpv_db
REDIS_URL=redis://:changeme@redis:6379
MINIO_ENDPOINT=minio
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=changeme_minio
JWT_SECRET=<64 char random>
JWT_REFRESH_SECRET=<64 char random>
ANTHROPIC_API_KEY=sk-ant-...
ENCRYPTION_KEY=<32 char random>
```

---

## Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | pgvector/pgvector:pg16 | 5432 | Database + pgvector |
| redis | redis:7-alpine | 6379 | Rate limiting & cache |
| minio | minio/minio | 9000/9001 | PDF storage |
| backend | local build | 3001 | NestJS API |
| web | local build | 3000 | Next.js Frontend |
| pgadmin | dpage/pgadmin4 | 5050 | DB admin (dev) |

---

## الشاشات (Web — 13 شاشة)

1. `/login` — تسجيل الدخول + MFA
2. `/dashboard` — لوحة التحكم
3. `/ai-assistant` — المساعد التمريضي
4. `/drug-preparation` — تحضير الأدوية
5. `/dose-calculator` — حاسبة الجرعات
6. `/cbahi` — معايير CBAHI
7. `/policies` — مكتبة السياسات
8. `/documents/upload` — رفع وثيقة
9. `/documents/approval` — سير الاعتماد
10. `/users` — المستخدمون والأدوار
11. `/audit-logs` — سجل التدقيق
12. `/analytics` — التحليلات
13. `/settings` — الإعدادات + MFA setup
