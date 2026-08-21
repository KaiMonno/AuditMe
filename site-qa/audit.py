import requests

url = input("Enter the URL to audit: ")
response = requests.get(url)

print(response.status_code)
print(response.text[:500])