# تطبيق أصيل — تقارير المواقع والعهدة

- `app/` : التطبيق الجاهز الذي ينشره Netlify (index.html, sw.js, manifest.json, الأيقونات).
- `source/` : المصدر مقسّماً إلى ملفات (التفاصيل في `source/README.md`)، و`source/build.py` يبني منه `app/`.
- `source/supabase/` : أوامر SQL ودوال Supabase.
- `tests/` : الاختبارات (المتصفح، والحسابات، وقواعد قاعدة البيانات)، وتعمل تلقائياً على GitHub مع كل رفع.

أي رفع (push) إلى الفرع `main` يُحدّث التطبيق على Netlify تلقائياً.
