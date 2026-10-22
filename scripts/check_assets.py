import os
import sys

MAX_IMAGE_SIZE = 500 * 1024  # 500KB
VALID_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.webp', '.gif')

def check_assets(assets_dir):
    if not os.path.exists(assets_dir):
        print(f"Assets directory {assets_dir} does not exist.")
        return
    
    failed = False
    for root, _, files in os.walk(assets_dir):
        for file in files:
            if file.lower().endswith(VALID_EXTENSIONS):
                filepath = os.path.join(root, file)
                size = os.path.getsize(filepath)
                if size > MAX_IMAGE_SIZE:
                    print(f"ERROR: Image {filepath} is too large ({size / 1024:.2f} KB > 500 KB)")
                    failed = True
                else:
                    print(f"OK: {filepath} ({size / 1024:.2f} KB)")
                    
    if failed:
        sys.exit(1)
    print("All image assets are within limits.")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'assets'
    check_assets(target)
