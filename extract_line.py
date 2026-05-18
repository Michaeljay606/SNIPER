import os

log_path = r'C:\Users\HP\.gemini\antigravity\brain\a99f8c21-678b-4a08-bd1a-3b4aace4f404\.system_generated\logs\overview.txt'
target_path = r'C:\Users\HP\Downloads\mrtech-237-premium-terminal\temp_log_line.json'

with open(log_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i == 487: # 0-indexed line 488
            with open(target_path, 'w', encoding='utf-8') as out:
                out.write(line)
            print(f"Extracted line {i+1} to {target_path}")
            break
