import os

log_path = r'C:\Users\HP\.gemini\antigravity\brain\a99f8c21-678b-4a08-bd1a-3b4aace4f404\.system_generated\logs\overview.txt'
target_path = r'C:\Users\HP\Downloads\mrtech-237-premium-terminal\src\App.tsx_stable'

with open(log_path, 'r', encoding='utf-8') as f:
    # I'll search for the App.tsx content in the logs
    # It was written/viewed around step 1450
    # Let's find any line that looks like App.tsx content
    for i, line in enumerate(f):
        if 'export default function App()' in line and 'const [state, dispatch] = useReducer' in line:
            # Found it
            # But the line is likely truncated if it's in the 'content' of a model response
            # Wait, if it was viewed using view_file, it would be in the 'output' of a tool call.
            pass

# Actually, I'll just look for any tool call output for App.tsx
