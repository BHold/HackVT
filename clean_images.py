import os
from PIL import Image
from PIL import ImageOps
from towns import towns
import ImageFile

ImageFile.MAXBLOCK = 2**20

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
                ratio = float(img.size[1]) / float(img.size[0])
                new_size = 600, int(ratio * 600)
                print new_size
                im = ImageOps.fit(img, new_size, Image.ANTIALIAS)
                im.save(file, optimize=True, quality=90)
