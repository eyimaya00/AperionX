import os

filepath = r'views\experiments.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'Makaleler - AperionX': 'Deneyler - AperionX',
    'tüm bilimsel makaleleri keþfedin': 'tüm bilimsel deneyleri keþfedin',
    'https://aperionx.com/articles': 'https://aperionx.com/experiments',
    'https://aperionx.com/en/articles': 'https://aperionx.com/en/experiments',
    'id=\"articles-hero-title\">': 'id=\"experiments-hero-title\">',
    'id=\"articles-hero-description\">': 'id=\"experiments-hero-description\">',
    '<span style=\"color: #ffffff\">Maka</span><span\n                    style=\"color: #6366f1\">leler</span>': '<span style=\"color: #ffffff\">Den</span><span\n                    style=\"color: #6366f1\">eyler</span>',
    'En güncel bilimsel içerikleri keþfedin.': 'Bilimsel Deneyleri Keþfedin.',
    'filterPageArticles': 'filterPageExperiments',
    'Makale ara...': 'Deney ara...',
    'id=\"article-search-input\"': 'id=\"experiment-search-input\"',
    'searchPageArticles(': 'searchPageExperiments(',
    'Makale ara': 'Deney ara',
    'id=\"articles-grid\"': 'id=\"experiments-grid\"',
    'Makaleler yükleniyor...': 'Deneyler yükleniyor...',
    'loadMoreArticles(': 'loadMoreExperiments(',
    'loadArticlesPage': 'loadExperimentsPage'
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
