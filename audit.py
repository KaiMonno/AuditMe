import requests

url = input("Enter the URL to audit: ")
response = requests.get(url)

print(response.status_code)

from bs4 import BeautifulSoup

soup = BeautifulSoup(response.text, 'html.parser')
print(soup.title)