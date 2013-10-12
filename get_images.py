import os
import sys
import requests
from towns import towns
from pprint import pprint

def download_file(url, dir):
    local_filename = url.split('/')[-1]
    # NOTE the stream=True parameter
    r = requests.get(url, stream=True)
    with open(os.path.join(dir, local_filename), 'wb') as f:
        for chunk in r.iter_content(chunk_size=1024): 
            if chunk: # filter out keep-alive new chunks
                f.write(chunk)
                f.flush()
    return local_filename

def get_images( town ):
    url = 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q=%s,VT' % town
    r = requests.get(url)
    image_urls = [result['url'] for result in r.json()['responseData']['results'] if result]
    return image_urls

if __name__ == '__main__':
    for town in towns:
        images = get_images(town)

        try:
            directory = 'img/towns/%s' % town
            os.makedirs(directory)
            print 'Saving %s' % town
        except:
            # Already downloaded this town
            print 'Skipping %s' % town
            continue

        for image in images:
            try:
                download_file(image, directory)
            except requests.exceptions.ConnectionError:
                print 'Could not download %s :(' % image
