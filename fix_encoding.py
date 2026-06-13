# -*- coding: utf-8 -*-
import os

filepath = r'views\experiments.html'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

content = content.replace("Kefedin", "Keþfedin")
content = content.replace("tm bilimsel deneyleri kefedin", "tüm bilimsel deneyleri keþfedin")
content = content.replace("Tm", "Tümü")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
