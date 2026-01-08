-- =====================================================
-- THIMMAH (خبير) Database Schema - PostgreSQL/Supabase
-- Generated Summary of All Tables and Columns
-- =====================================================

-- =====================================================
-- ENUMS (أنواع البيانات المخصصة)
-- =====================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'consultant');
CREATE TYPE user_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE file_type AS ENUM ('contract', 'report', 'stock', 'other');
CREATE TYPE file_status AS ENUM ('pending', 'analyzing', 'analyzed', 'error');
CREATE TYPE compliance_status AS ENUM ('halal', 'haram', 'doubtful');
CREATE TYPE news_category AS ENUM ('stocks', 'gold', 'fatwas', 'markets', 'general');
CREATE TYPE knowledge_type AS ENUM ('fatwa', 'standard', 'article', 'scraped');
CREATE TYPE consultant_status AS ENUM ('active', 'inactive');
CREATE TYPE ticket_status AS ENUM ('open', 'assigned', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending');
CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE vendor_status AS ENUM ('pending', 'approved', 'banned');

-- =====================================================
-- 1. USERS (المستخدمين)
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    open_id VARCHAR(64) UNIQUE,              -- معرف OAuth
    name TEXT,                                -- الاسم الكامل
    email VARCHAR(320),                       -- البريد الإلكتروني
    phone VARCHAR(20),                        -- رقم الهاتف
    password VARCHAR(255),                    -- كلمة المرور (مشفرة)
    login_method VARCHAR(64),                 -- طريقة الدخول (email, google, apple)
    role user_role DEFAULT 'user' NOT NULL,   -- الدور (مستخدم، مشرف، مستشار)
    tier user_tier DEFAULT 'free' NOT NULL,   -- الباقة (مجانية، برو، مؤسسات)
    package_id INTEGER,                       -- معرف الباقة
    daily_questions_used INTEGER DEFAULT 0,   -- الأسئلة المستخدمة اليوم
    last_question_date TIMESTAMP,             -- تاريخ آخر سؤال
    status user_status DEFAULT 'active' NOT NULL, -- الحالة
    language VARCHAR(5) DEFAULT 'ar',         -- اللغة
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_signed_in TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 2. CONVERSATIONS (المحادثات)
-- =====================================================
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    title VARCHAR(255),                       -- عنوان المحادثة
    context VARCHAR(50) DEFAULT 'general',    -- السياق (عام، عقد، سهم)
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 3. MESSAGES (الرسائل)
-- =====================================================
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,         -- معرف المحادثة
    role message_role NOT NULL,               -- الدور (مستخدم، مساعد، نظام)
    content TEXT NOT NULL,                    -- محتوى الرسالة
    sources JSON,                             -- المصادر (للذكاء الاصطناعي)
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 4. FILES (الملفات)
-- =====================================================
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    name VARCHAR(255) NOT NULL,               -- اسم الملف
    type file_type DEFAULT 'other' NOT NULL,  -- نوع الملف
    mime_type VARCHAR(100),                   -- نوع MIME
    size INTEGER,                             -- حجم الملف (بايت)
    url TEXT,                                 -- رابط الملف
    status file_status DEFAULT 'pending' NOT NULL, -- حالة التحليل
    analysis_result JSON,                     -- نتيجة التحليل
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 5. STOCKS (الأسهم)
-- =====================================================
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,              -- رمز السهم
    name VARCHAR(255) NOT NULL,               -- اسم الشركة
    exchange VARCHAR(50),                     -- البورصة
    compliance_status compliance_status DEFAULT 'doubtful' NOT NULL, -- حالة التوافق الشرعي
    compliance_score INTEGER,                 -- درجة التوافق (0-100)
    analysis_data JSON,                       -- بيانات التحليل
    last_updated TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 6. WATCHLIST (قائمة المتابعة)
-- =====================================================
CREATE TABLE watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    stock_id INTEGER NOT NULL,                -- معرف السهم
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 7. NEWS (الأخبار)
-- =====================================================
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,              -- عنوان الخبر
    summary TEXT,                             -- ملخص الخبر
    content TEXT,                             -- محتوى الخبر
    source VARCHAR(100),                      -- المصدر
    source_url TEXT,                          -- رابط المصدر
    image_url TEXT,                           -- صورة الخبر
    category news_category DEFAULT 'general' NOT NULL, -- التصنيف
    is_halal BOOLEAN,                         -- هل متوافق شرعياً
    published_at TIMESTAMP,                   -- تاريخ النشر
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 8. KNOWLEDGE_BASE (قاعدة المعرفة)
-- =====================================================
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,              -- العنوان
    content TEXT NOT NULL,                    -- المحتوى
    type knowledge_type DEFAULT 'article' NOT NULL, -- النوع
    source VARCHAR(255),                      -- المصدر
    source_url TEXT,                          -- رابط المصدر
    embedding JSON,                           -- التضمين للـ RAG
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 9. SYSTEM_SETTINGS (إعدادات النظام)
-- =====================================================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,         -- المفتاح
    value TEXT,                               -- القيمة
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 10. CONSULTANTS (المستشارين)
-- =====================================================
CREATE TABLE consultants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,               -- الاسم
    email VARCHAR(320) NOT NULL UNIQUE,       -- البريد الإلكتروني
    phone VARCHAR(20),                        -- رقم الهاتف
    specialty VARCHAR(255) NOT NULL,          -- التخصص
    bio TEXT,                                 -- السيرة الذاتية
    image_url TEXT,                           -- صورة المستشار
    status consultant_status DEFAULT 'active' NOT NULL, -- الحالة
    max_chats_per_day INTEGER DEFAULT 10,     -- الحد الأقصى للمحادثات يومياً
    current_chats INTEGER DEFAULT 0,          -- المحادثات الحالية
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 11. TICKETS (التذاكر)
-- =====================================================
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    conversation_id INTEGER,                  -- معرف المحادثة
    consultant_id INTEGER,                    -- معرف المستشار
    status ticket_status DEFAULT 'open' NOT NULL, -- الحالة
    priority ticket_priority DEFAULT 'medium' NOT NULL, -- الأولوية
    subject VARCHAR(255),                     -- الموضوع
    resolution TEXT,                          -- الحل
    attachment_url TEXT,                      -- رابط المرفق
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 12. API_KEYS (مفاتيح API)
-- =====================================================
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    key VARCHAR(64) NOT NULL UNIQUE,          -- المفتاح
    name VARCHAR(100),                        -- اسم المفتاح
    is_active BOOLEAN DEFAULT TRUE NOT NULL,  -- نشط
    last_used TIMESTAMP,                      -- آخر استخدام
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 13. SUBSCRIPTIONS (الاشتراكات)
-- =====================================================
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    plan_name VARCHAR(100) NOT NULL,          -- اسم الخطة (pro_monthly, pro_yearly)
    price_kwd INTEGER NOT NULL,               -- السعر بالفلس (8000 = 8 دينار)
    status subscription_status DEFAULT 'pending' NOT NULL, -- الحالة
    start_date TIMESTAMP,                     -- تاريخ البدء
    end_date TIMESTAMP,                       -- تاريخ الانتهاء
    auto_renew BOOLEAN DEFAULT TRUE,          -- تجديد تلقائي
    payment_method VARCHAR(50),               -- طريقة الدفع
    payment_reference VARCHAR(255),           -- مرجع الدفع
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 14. VENDORS (الشركاء/الخبراء)
-- =====================================================
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,               -- الاسم
    email VARCHAR(320) NOT NULL UNIQUE,       -- البريد الإلكتروني
    phone VARCHAR(20),                        -- رقم الهاتف
    company_name VARCHAR(255),                -- اسم الشركة
    specialty JSON,                           -- التخصصات (مصفوفة)
    bio TEXT,                                 -- السيرة الذاتية
    logo_url TEXT,                            -- شعار الشركة
    status vendor_status DEFAULT 'pending' NOT NULL, -- الحالة
    commission_rate INTEGER DEFAULT 30,       -- نسبة عمولة المنصة %
    rating INTEGER DEFAULT 0,                 -- التقييم (0-500)
    total_orders INTEGER DEFAULT 0,           -- إجمالي الطلبات
    is_available BOOLEAN DEFAULT TRUE,        -- متاح
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 15. ORDERS (الطلبات)
-- =====================================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    vendor_id INTEGER,                        -- معرف الشريك
    service_type VARCHAR(100) NOT NULL,       -- نوع الخدمة (verification, stamping, consultation)
    status order_status DEFAULT 'pending' NOT NULL, -- الحالة
    price_kwd INTEGER NOT NULL,               -- السعر الإجمالي بالفلس
    platform_fee_kwd INTEGER,                 -- عمولة المنصة (30%)
    vendor_payout_kwd INTEGER,                -- حصة الشريك (70%)
    document_url TEXT,                        -- رابط المستند
    result_url TEXT,                          -- رابط النتيجة
    notes TEXT,                               -- ملاحظات
    assigned_at TIMESTAMP,                    -- تاريخ التعيين
    completed_at TIMESTAMP,                   -- تاريخ الإكمال
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 16. CONTRACT_ANALYSIS (تحليل العقود)
-- =====================================================
CREATE TABLE contract_analysis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                 -- معرف المستخدم
    file_id INTEGER,                          -- معرف الملف
    compliance_score INTEGER NOT NULL,        -- درجة التوافق (0-100)
    risk_level VARCHAR(20) NOT NULL,          -- مستوى الخطر (safe, risky, critical)
    total_issues INTEGER DEFAULT 0,           -- إجمالي المشاكل
    critical_issues INTEGER DEFAULT 0,        -- المشاكل الحرجة
    issue_details JSON,                       -- تفاصيل المشاكل (مخفية للمجانيين)
    financial_value INTEGER,                  -- قيمة العقد بالفلس
    keywords JSON,                            -- الكلمات المفتاحية المكتشفة
    ai_confidence INTEGER,                    -- ثقة الذكاء الاصطناعي (0-100)
    is_blurred BOOLEAN DEFAULT TRUE,          -- مخفي (للمستخدمين المجانيين)
    expert_recommended BOOLEAN DEFAULT FALSE, -- يُنصح بخبير
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 17. PLATFORM_SETTINGS (إعدادات المنصة)
-- =====================================================
CREATE TABLE platform_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,         -- المفتاح
    value TEXT NOT NULL,                      -- القيمة
    description TEXT,                         -- الوصف
    category VARCHAR(50),                     -- الفئة (pricing, triggers, general)
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_by INTEGER                        -- معرف المحدث
);

-- =====================================================
-- SUMMARY (ملخص)
-- =====================================================
-- Total Tables: 17
-- 
-- 1.  users              - المستخدمين
-- 2.  conversations      - المحادثات
-- 3.  messages           - الرسائل
-- 4.  files              - الملفات
-- 5.  stocks             - الأسهم
-- 6.  watchlist          - قائمة المتابعة
-- 7.  news               - الأخبار
-- 8.  knowledge_base     - قاعدة المعرفة
-- 9.  system_settings    - إعدادات النظام
-- 10. consultants        - المستشارين
-- 11. tickets            - التذاكر
-- 12. api_keys           - مفاتيح API
-- 13. subscriptions      - الاشتراكات
-- 14. vendors            - الشركاء/الخبراء
-- 15. orders             - الطلبات
-- 16. contract_analysis  - تحليل العقود
-- 17. platform_settings  - إعدادات المنصة
-- =====================================================
