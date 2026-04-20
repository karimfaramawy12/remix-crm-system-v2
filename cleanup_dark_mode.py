import os
import re

def cleanup_files(directory):
    pattern = re.compile(r'dark:[a-zA-Z0-9\/\-:_\[\]#%]+')
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = pattern.sub('', content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Cleaned: {path}")

if __name__ == "__main__":
    cleanup_files('src')
