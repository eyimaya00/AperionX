import os
import re

directory = r'c:\Users\eyima\.gemini\antigravity\scratch\AperionX\views'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Replace style.css?v=XXX
            content = re.sub(r'style\.css\?v=\d+', 'style.css?v=239', content)
            # Replace script_v105.js?v=XXX
            content = re.sub(r'script_v105\.js\?v=\d+', 'script_v105.js?v=239', content)
            # Replace script.js?v=XXX
            content = re.sub(r'script\.js\?v=\d+', 'script.js?v=239', content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Updated cache versions in {file}')
