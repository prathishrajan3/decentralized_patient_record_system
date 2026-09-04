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
                if 'application/x-www-form-urlencoded' in js_content:
                    print('Frontend bundle contains x-www-form-urlencoded')
                if '!headers.has' in js_content or 'has("Content-Type")' in js_content:
                    print('API URL header fix is PRESENT in the bundle!')
                else:
                    print('API URL header fix is MISSING FROM THE BUNDLE!')
        else:
            print('Could not find JS bundle in HTML')
except Exception as e:
    print('Error:', e)
