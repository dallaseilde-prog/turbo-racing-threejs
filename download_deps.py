import urllib.request
import ssl

try:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    url = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
    print(f"Downloading {url}...")
    urllib.request.urlretrieve(url, "three.min.js")
    print("Download complete: three.min.js")
except Exception as e:
    print(f"Error: {e}")
