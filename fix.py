import os

filepath = r'public\script_v105.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """                        ).join('')}
                       </div>"""
replacement1 = """                        ).join(' <span style="opacity:0.6">&amp;</span> ')}
                       </div>"""

target2 = """                                    ).join('')}
                                   </div>"""
replacement2 = """                                    ).join(' <span style="opacity:0.6">&amp;</span> ')}
                                   </div>"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
