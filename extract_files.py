import json
import os

with open(r'C:\Users\HP\Downloads\mrtech-237-premium-terminal\temp_log_line.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

content = data['content']

# Split by '### ' to get each file
parts = content.split('### ')
for part in parts:
    if '```tsx' in part:
        lines = part.split('\n')
        filename_line = lines[0].strip()
        # Find the filename
        filename = filename_line.split(' ')[1] if ' ' in filename_line else filename_line
        if not filename.endswith('.tsx'):
            # Try to find the filename in the text
            if 'ProfileTab' in part: filename = 'ProfileTab.tsx'
            elif 'AcademyTab' in part: filename = 'AcademyTab.tsx'
            elif 'TerminalTab' in part: filename = 'TerminalTab.tsx'
            elif 'AdminTab' in part: filename = 'AdminTab.tsx'
            elif 'App.tsx' in part: filename = 'App.tsx'
            elif 'DashboardTab' in part: filename = 'DashboardTab.tsx'
        
        # Extract code block
        code_start = part.find('```tsx') + 6
        code_end = part.rfind('```')
        code = part[code_start:code_end].strip()
        
        if filename:
            print(f"Extracted {filename}")
            target_dir = r'C:\Users\HP\Downloads\mrtech-237-premium-terminal\src\components\tabs'
            if filename == 'App.tsx':
                target_path = r'C:\Users\HP\Downloads\mrtech-237-premium-terminal\src\App.tsx'
            else:
                if not os.path.exists(target_dir):
                    os.makedirs(target_dir)
                target_path = os.path.join(target_dir, filename)
            
            with open(target_path, 'w', encoding='utf-8') as out:
                out.write(code)
