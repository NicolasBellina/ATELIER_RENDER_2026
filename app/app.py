import os
import time

import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://atelier:atelier@localhost:5432/atelier",
)


def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def init_db():
    for attempt in range(30):
        try:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS items (
                            id SERIAL PRIMARY KEY,
                            title VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                        """
                    )
                    cur.execute("SELECT COUNT(*) AS count FROM items")
                    if cur.fetchone()["count"] == 0:
                        cur.executemany(
                            "INSERT INTO items (title) VALUES (%s)",
                            [
                                ("Premier élément",),
                                ("Deuxième élément",),
                                ("Atelier Render ESGI",),
                            ],
                        )
                conn.commit()
            return
        except psycopg2.OperationalError:
            time.sleep(1)
    raise RuntimeError("Impossible de se connecter à PostgreSQL")


@app.route("/")
def home():
    return "Flask + Docker + GHCR + Terraform + Render — API disponible sur /api/items"


@app.route("/health")
def health():
    db_ok = False
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        db_ok = True
    except psycopg2.Error:
        pass
    return jsonify({"status": "ok" if db_ok else "degraded", "database": db_ok})


@app.route("/info")
def info():
    return jsonify(
        {
            "app": "Flask Render",
            "student": "Nicolas Bellina",
            "version": "v1",
        }
    )


@app.route("/env")
def env():
    return jsonify({"env": os.getenv("ENV")})


@app.route("/api/items", methods=["GET"])
def list_items():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, created_at FROM items ORDER BY id DESC"
            )
            rows = cur.fetchall()
    return jsonify([dict(row) for row in rows])


@app.route("/api/items", methods=["POST"])
def create_item():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Le titre est obligatoire"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO items (title) VALUES (%s) RETURNING id, title, created_at",
                (title,),
            )
            row = cur.fetchone()
        conn.commit()
    return jsonify(dict(row)), 201


@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM items WHERE id = %s RETURNING id",
                (item_id,),
            )
            deleted = cur.fetchone()
        conn.commit()
    if not deleted:
        return jsonify({"error": "Élément introuvable"}), 404
    return jsonify({"deleted": item_id})


with app.app_context():
    try:
        init_db()
    except RuntimeError:
        pass


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=True)
