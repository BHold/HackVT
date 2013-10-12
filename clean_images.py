import os
from PIL import Image
from towns import towns
from pprint import pprint

if __name__ == '__main__':
    for town in towns:
        directory = 'img/towns/%s' % town
        files_to_delete = [os.path.join(directory, f) for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f)) and (f.startswith('250px') or f.startswith('cmu') or f.startswith('fru') or f.endswith('highlight.png'))]
        for file in files_to_delete:
            print 'Removing %s' % file
            os.remove(file)

        size = 600, 10000

        files_to_resize = [os.path.join(directory, f) for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f)) and f != '.DS_Store' and not f.lower().endswith('.gif')]
        for file in files_to_resize:
            try:
                img = Image.open(file)
            except IOError:
                '%s is fucked' % file
                continue

            width = img.size[0]
            if width > 600:
                print 'Resizing %s' % file
                img.thumbnail(size, Image.ANTIALIAS)
                img.save(file, "JPEG")
