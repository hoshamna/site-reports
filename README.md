# تطبيق أصيل — تقارير المواقع والعهدة

- `app/` : التطبيق الجاهز الذي ينشره Netlify (index.html, sw.js, manifest.json, الأيقونات).
- `source/site-reports.html` : ملف المصدر الرئيسي.
- `source/build.py` : يبني من المصدر ملفات `index.html` و`sw.js` و`manifest.json`.
- `source/supabase/` : دوال Supabase (`read-doc` لقراءة الفواتير والشيكات، `push` للإشعارات).

أي رفع (push) إلى الفرع `main` يُحدّث التطبيق على Netlify تلقائياً.
