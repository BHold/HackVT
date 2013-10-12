import os
from towns import towns

img_dir = 'img/towns'

towns_dict = {}

for town in towns:
    town_dir = os.path.join(img_dir, town)

    try:
        files = [os.path.join(town_dir, f) for f in os.listdir(town_dir) if os.path.isfile(os.path.join(town_dir, f)) and f != '.DS_Store']
    except OSError, e:
        print e
        continue

    towns_dict[town] = files

print towns_dict
