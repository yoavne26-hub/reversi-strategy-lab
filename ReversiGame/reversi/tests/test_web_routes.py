from reversi.backend.app import app


def test_home_route_renders_navigation_hub():
    client = app.test_client()

    res = client.get("/")
    body = res.get_data(as_text=True)

    assert res.status_code == 200
    assert "Play Game" in body
    assert "Simulation Lab" in body
    assert "Settings &amp; How to Play" in body
    assert "About Me" in body


def test_play_route_serves_playable_game_page():
    client = app.test_client()

    res = client.get("/play")
    body = res.get_data(as_text=True)

    assert res.status_code == 200
    assert "Start Game" in body
    assert 'id="board"' in body
    assert 'src="/static/app.js"' in body


def test_lab_route_serves_placeholder_page():
    client = app.test_client()

    res = client.get("/lab")
    body = res.get_data(as_text=True)

    assert res.status_code == 200
    assert "Simulation Lab" in body
    assert "benchmarks" in body.lower()
    assert "analytics" in body.lower()


def test_settings_route_serves_settings_and_help_page():
    client = app.test_client()

    res = client.get("/settings")
    body = res.get_data(as_text=True)

    assert res.status_code == 200
    assert "Game Settings" in body
    assert "Show Legal Moves" in body
    assert "Animation Speed" in body
    assert "Default Difficulty" in body
    assert "How to Play" in body
    assert "Simulation Lab" in body
    assert "Minimax" in body
    assert 'src="/static/settings.js"' in body
