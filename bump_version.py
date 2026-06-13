import os
import glob

for filepath in glob.glob('views/*.html'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replaces any v=xxx with v=223
    import re
    content = re.sub(r'script_v105\.js\?v=\d+', 'script_v105.js?v=223', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
