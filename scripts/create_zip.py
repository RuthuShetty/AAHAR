import os
import zipfile
import sys
import time

def create_project_zip(source_dir, output_zip_path):
    print(f"Starting zip creation: {source_dir} -> {output_zip_path}")
    start_time = time.time()
    
    EXCLUDE_DIRS = {
        'node_modules',
        '.git',
        '__pycache__',
        '.pytest_cache',
        '.hypothesis',
        '.expo',
        'dist',
        '.turbo',
        '.idea',
        '.vscode',
        '.venv',
        'venv',
        '.system_generated'
    }
    
    EXCLUDE_EXTS = {
        '.pyc',
        '.pyo',
        '.pyd',
        '.zip',
        '.tar',
        '.gz'
    }
    
    file_count = 0
    total_bytes = 0
    
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
            
            for file in files:
                _, ext = os.path.splitext(file)
                if ext in EXCLUDE_EXTS:
                    continue
                if file.endswith('.log') and not 'docs' in root:
                    continue
                if file == os.path.basename(output_zip_path):
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, os.path.dirname(source_dir))
                
                try:
                    zipf.write(full_path, rel_path)
                    file_count += 1
                    total_bytes += os.path.getsize(full_path)
                except Exception as e:
                    print(f"Warning: could not add {full_path}: {e}")

    elapsed = time.time() - start_time
    zip_size_mb = os.path.getsize(output_zip_path) / (1024 * 1024)
    print(f"[OK] Successfully created {output_zip_path}")
    print(f"   Files compressed: {file_count}")
    print(f"   Raw size: {total_bytes / (1024 * 1024):.2f} MB")
    print(f"   Zip archive size: {zip_size_mb:.2f} MB")
    print(f"   Completed in {elapsed:.2f} seconds")

if __name__ == '__main__':
    src = os.path.abspath("d:/Ruthu/aahar")
    out = os.path.abspath("d:/Ruthu/aahar-complete.zip")
    create_project_zip(src, out)
