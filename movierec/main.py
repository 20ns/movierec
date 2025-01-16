import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

# Create the Flask app instance
app = Flask(__name__)
CORS(app) 

# Your API key and base URL for TMDb
API_KEY = 'b484a8d608caf759d5d575db3ec03bbc'
ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiNDg0YThkNjA4Y2FmNzU5ZDVkNTc1ZGIzZWMwM2JiYyIsIm5iZiI6MTcyOTI0OTk0NC4wMzIyOTIsInN1YiI6IjY2ZmZlOGYxNmZjNzRlNTc1NmY4MGFjNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.9_EAhEDa6KfQaSBw5Pp3oMFvxlI1b0T5aiOuApYG9VY'
BASE_URL = 'https://api.themoviedb.org/3'

def fetch_movies(query):
    url = f"{BASE_URL}/search/movie?api_key={API_KEY}&query={query}"
    headers = {'Authorization': f'Bearer {ACCESS_TOKEN}'}
    response = requests.get(url, headers=headers)
    return response.json()

def fetch_tv_shows(query):
    url = f"{BASE_URL}/search/tv?api_key={API_KEY}&query={query}"
    headers = {'Authorization': f'Bearer {ACCESS_TOKEN}'}
    response = requests.get(url, headers=headers)
    return response.json()

@app.route('/recommend/movie', methods=['POST'])
def recommend_movies():
    movie_title = request.json.get('movie_title')
    movie_data = fetch_movies(movie_title)
    recommendations = movie_data.get('results', [])
    return jsonify(recommendations)

@app.route('/recommend/tv', methods=['POST'])
def recommend_tv_shows():
    tv_show_title = request.json.get('tv_show_title')
    tv_show_data = fetch_tv_shows(tv_show_title)
    recommendations = tv_show_data.get('results', [])
    return jsonify(recommendations)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
