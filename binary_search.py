import os

log_path = r'C:\Users\HP\.gemini\antigravity\brain\a99f8c21-678b-4a08-bd1a-3b4aace4f404\.system_generated\logs\overview.txt'

with open(log_path, 'rb') as f:
    data = f.read()
    print(f"Total file size: {len(data)} bytes")
    
    # Search for the string in binary
    search_str = b'### 1. ProfileTab.tsx'
    index = data.find(search_str)
    if index != -1:
        print(f"Found string at index {index}")
        # Print surrounding bytes
        start = max(0, index - 100)
        end = min(len(data), index + 1000)
        print(f"Snippet: {data[start:end]}")
    else:
        print("String not found in binary.")
