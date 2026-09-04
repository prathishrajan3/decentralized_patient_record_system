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
                
                # Check what API URL is hardcoded
                api_match = re.search(r'\"https://backend-[a-zA-Z0-9-]+\.up\.railway\.app\"', js_content)
                if api_match:
                    print('API URL in bundle:', api_match.group(0))
                else:
                    print('API URL not found via regex, searching broadly...')
                    if 'backend-production-30645.up.railway.app' in js_content:
                        print('Found correct backend URL!')
                    elif 'up.railway.app' in js_content:
                        print('Found some railway URL!')
                    else:
                        print('NO RAILWAY URL FOUND IN BUNDLE!')
        else:
            print('Could not find JS bundle in HTML')
except Exception as e:
    print('Error:', e)
