import os
d = 'views'
for f in os.listdir(d):
    if f.endswith('.html'):
        p = os.path.join(d, f)
        with open(p, 'r', encoding='utf-8') as file:
            content = file.read()
        content = content.replace('Giriş / Kayıt', 'Giriş Yap')
        with open(p, 'w', encoding='utf-8') as file:
            file.write(content)
print("Safe replacement complete")
