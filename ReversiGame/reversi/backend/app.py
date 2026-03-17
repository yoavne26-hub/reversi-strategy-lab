from pathlib import Path

from flask import Flask

from .api import api_bp, web_bp


BASE_DIR = Path(__file__).resolve().parents[1]

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "frontend" / "templates"),
    static_folder=str(BASE_DIR / "frontend" / "static"),
    static_url_path="/static",
)
app.register_blueprint(web_bp)
app.register_blueprint(api_bp)

