import os
import re

directory = r'c:\Users\eyima\.gemini\antigravity\scratch\AperionX\views'
pattern = re.compile(r'script_v105\.js\?v=223')

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content, count = pattern.subn('script_v105.js?v=224', content)
            
            if count > 0:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Replaced {count} instances in {file}')
