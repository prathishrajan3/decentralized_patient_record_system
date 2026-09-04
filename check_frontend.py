import urllib.request
import re

url = 'https://dprms.up.railway.app'
try:
    with urllib.request.urlopen(url) as response:
        html = response.read().decode('utf-8')
        match = re.search(r'src=\"(/assets/index-.*?\.js)\"', html)
        if match:
            js_url = url + match.group(1)
            print('Found JS URL:', js_url)
            with urllib.request.urlopen(js_url) as js_response:
                js_content = js_response.read().decode('utf-8')
                if 'backend-production-30645' in js_content:
                    print('API URL is present in the bundle!')
                else:
                    print('API URL IS MISSING FROM THE BUNDLE!')
        else:
            print('Could not find JS bundle in HTML')
except Exception as e:
    print('Error:', e)
