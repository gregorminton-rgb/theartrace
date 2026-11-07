import json

with open('tools/framed_works_list.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

print(f"Total framed works: {len(items)}")
for i, item in enumerate(items):
    print(f"{i+1:2d}. {item['work_id']:<35} -> {item['file']}")
