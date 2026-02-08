import shutil
import os

files = [
    ('/Users/admin/.gemini/antigravity/brain/80ab2b9e-dc2a-48be-8078-f295ed1e0baf/building_cyber_1770563452660.png', 'assets/textures/building_cyber.jpg'),
    ('/Users/admin/.gemini/antigravity/brain/80ab2b9e-dc2a-48be-8078-f295ed1e0baf/building_neon_1770563469894.png', 'assets/textures/building_neon.jpg'),
    ('/Users/admin/.gemini/antigravity/brain/80ab2b9e-dc2a-48be-8078-f295ed1e0baf/building_tech_1770563542707.png', 'assets/textures/building_tech.jpg'),
    ('/Users/admin/.gemini/antigravity/brain/80ab2b9e-dc2a-48be-8078-f295ed1e0baf/concrete_base_1770563585892.png', 'assets/textures/concrete_base.jpg')
    # Add concrete_base here if/when successful
]

print("Starting file copy...")
for src, dst in files:
    try:
        shutil.copy(src, dst)
        print(f'Copied {src} to {dst}')
    except Exception as e:
        print(f'Error copying {src}: {e}')
print("Finished.")
