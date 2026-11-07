import re
import json

def extract_all():
    works = []
    seen = set()
    
    # 1. data.js
    with open('data.js', 'r', encoding='utf-8') as f:
        content = f.read()
    # remove 'window.ART_DATA = ' prefix and trailing semicolon if any
    prefix = 'window.ART_DATA ='
    idx = content.find(prefix)
    if idx != -1:
        json_str = content[idx + len(prefix):].strip()
        if json_str.endswith(';'):
            json_str = json_str[:-1].strip()
        data = json.loads(json_str)
        for w in data.get('works', []):
            wid = w['id']
            if wid not in seen:
                seen.add(wid)
                works.append({'id': wid, 'title': w['title'], 'file': 'data.js'})
                
    # 2. works-extra.js
    with open('works-extra.js', 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = re.compile(r"id:\s*['\"]([a-zA-Z0-9_]+)['\"]\s*,\s*title:\s*(['\"])((?:\\.|(?!\2).)*)\2")
    for m in pattern.finditer(content):
        wid = m.group(1)
        if wid not in seen:
            seen.add(wid)
            raw_title = m.group(3)
            clean_title = raw_title.replace(r"\'", "'").replace(r'\"', '"')
            works.append({'id': wid, 'title': clean_title, 'file': 'works-extra.js'})
            
    return works

if __name__ == '__main__':
    all_works = extract_all()
    print(f"Extracted {len(all_works)} works total (60 from data.js + 96 from works-extra.js).")
    with open('tools/all_works.json', 'w', encoding='utf-8') as f:
        json.dump(all_works, f, indent=2, ensure_ascii=False)
    for w in all_works:
        if w['id'] in ['watteau_gersaints_shopsign', 'picasso_demoiselles']:
            print(w['id'], '->', repr(w['title']))
