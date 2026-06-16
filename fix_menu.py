import os
import re

directory = r'c:\Users\eyima\.gemini\antigravity\scratch\AperionX\views'
pattern = re.compile(
    r'[ \t]*<div class=\"nav-item dropdown\">[ \t]*\n[ \t]*<a href=\"/articles\" class=\"(nav-link(?: active)?)\s*dropdown-toggle\" id=\"articlesDropdownToggle\">[ \t]*\n[ \t]*Makaleler.*?<i class=\"ph ph-caret-down\"></i>[ \t]*\n[ \t]*</a>[ \t]*\n[ \t]*<div class=\"dropdown-menu\" id=\"articles-dropdown-menu\">[ \t]*\n(?:[ \t]*<!--.*?-->[ \t]*\n)?[ \t]*</div>[ \t]*\n[ \t]*</div>',
    re.MULTILINE
)

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content, count = pattern.subn(lambda m: f'                <a href=\"/articles\" class=\"{m.group(1)}\">Makaleler</a>', content)
            
            if count > 0:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Replaced {count} instances in {file}')
