import os

filepath = r'views\experiments.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("Makaleler - AperionX", "Deneyler - AperionX")
content = content.replace("t\u00fcm bilimsel makaleleri ke\u015ffedin", "t\u00fcm bilimsel deneyleri ke\u015ffedin")
content = content.replace("https://aperionx.com/articles", "https://aperionx.com/experiments")
content = content.replace("https://aperionx.com/en/articles", "https://aperionx.com/en/experiments")
content = content.replace('id="articles-hero-title">', 'id="experiments-hero-title">')
content = content.replace('id="articles-hero-description">', 'id="experiments-hero-description">')
content = content.replace('<span style="color: #ffffff">Maka</span><span\n                    style="color: #6366f1">leler</span>', '<span style="color: #ffffff">Den</span><span\n                    style="color: #6366f1">eyler</span>')
content = content.replace("En g\u00fcncel bilimsel i\u00e7erikleri ke\u015ffedin.", "Bilimsel Deneyleri Ke\u015ffedin.")
content = content.replace("filterPageArticles", "filterPageExperiments")
content = content.replace("Makale ara...", "Deney ara...")
content = content.replace('id="article-search-input"', 'id="experiment-search-input"')
content = content.replace("searchPageArticles(", "searchPageExperiments(")
content = content.replace('id="articles-grid"', 'id="experiments-grid"')
content = content.replace("Makaleler y\u00fckleniyor...", "Deneyler y\u00fckleniyor...")
content = content.replace("loadArticlesPage", "loadExperimentsPage")
content = content.replace("script_v105.js?v=222", "script_v105.js?v=223")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
