# مصدر تطبيق أصيل

التطبيق المنشور (`app/`) يُبنى من هذا المجلد. **لا تعدّل `app/index.html` مباشرة**؛ عدّل الملفات هنا ثم:

```bash
python3 source/build.py          # يبني app/index.html و app/sw.js و app/manifest.json
cd tests && npm test             # اختبارات المتصفح + التأكد أن app/ مبني من المصدر
cd tests && npm run test:sql     # اختبارات قواعد قاعدة البيانات (يحتاج Postgres)
```

الاختبارات تعمل تلقائياً على GitHub مع كل رفع (تبويب **Actions**).

## الملفات

| المسار | المحتوى |
|---|---|
| `web/index.template.html` | هيكل الصفحة ومكتبات الـ PDF، وفيه أماكن `{{STYLE}}` و`{{DATA_LAYER}}` و`{{APP}}` |
| `web/styles.css` | التنسيق |
| `web/data-layer/` | طبقة Supabase: الحسابات، الجداول (المواقع + ماليتها)، الصور الخاصة، قراءة الفواتير، الإشعارات |
| `web/js/01-config.js` | الثوابت والحالة العامة `S` |
| `web/js/02-i18n.js` | الترجمة الإنجليزية |
| `web/js/03-calc.js` | الحسابات: الإنجاز، المستلم والمتبقي، الدفعات، التكاليف |
| `web/js/04-storage.js` | الحفظ والتحميل وزر «حفظ» |
| `web/js/05-images.js` | ضغط الصور ورفعها |
| `web/js/06-views.js` | شاشات المواقع |
| `web/js/07-site-events.js` | أزرار وإدخال شاشات المواقع |
| `web/js/08…12-custody-*.js` | العهدة: البيانات، الواجهة، قراءة الفواتير، الكشوف، الأزرار |
| `web/js/13-users.js` | الدخول والمستخدمون والصلاحيات والنسخ الاحتياطي |
| `web/js/14-reports-pdf.js` | تقارير PDF للمواقع |
| `web/js/15-start.js` | التشغيل |
| `web/sw.template.js` | الـ Service Worker (رقم النسخة يُحسب تلقائياً) |
| `supabase/` | أوامر SQL ودوال Supabase (`accounts`, `read-doc`, `push`) |

ملفات `web/js` تُدمج بالترتيب في نص واحد داخل دالة واحدة، فكل ملف يرى دوال الملفات الأخرى.
