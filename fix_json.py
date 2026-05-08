import json

def merge_duplicates(ordered_pairs):
    d = {}
    for k, v in ordered_pairs:
        if k in d:
            if isinstance(d[k], dict) and isinstance(v, dict):
                # We want to merge v into d[k]
                # If there are conflicts, let's keep both by updating, so the latter block's keys overwrite the former's, but former's unique keys are preserved.
                d[k].update(v)
            else:
                d[k] = v
        else:
            d[k] = v
    return d

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f, object_pairs_hook=merge_duplicates)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

process_file('src/locales/fr.json')
process_file('src/locales/en.json')
print("Fix applied!")
