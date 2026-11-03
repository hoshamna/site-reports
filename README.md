# تطبيق أصيل — تقارير المواقع والعهدة

- `app/` : التطبيق الجاهز الذي ينشره Netlify (index.html, sw.js, manifest.json, الأيقونات).
- `source/` : المصدر مقسّماً إلى ملفات (التفاصيل في `source/README.md`)، و`source/build.py` يبني منه `app/`.
- `source/supabase/` : أوامر SQL ودوال Supabase.
- `tests/` : الاختبارات (المتصفح، والحسابات، وقواعد قاعدة البيانات)، وتعمل تلقائياً على GitHub مع كل رفع.

التطبيق منشور على **https://hoshamna.github.io/site-reports/** عبر GitHub Pages: كل رفع إلى `main` تُشغَّل عليه الاختبارات، وإذا نجحت كلها يُنشر تلقائياً (تبويب Actions).
الرابط القديم aseel-test.netlify.app توقف عن التحديث (انتهى رصيد Netlify المجاني في 3 نوفمبر 2026).
