
## Local Setup (Windows)

### Recommended Flow

1. Install **Python 3** and make sure it is added to `PATH`
2. From the project root, run:
   - `install_requirements.bat`
3. Then run:
   - `play_reversi.bat`
4. The app should open in your browser automatically at:
   - `http://127.0.0.1:5000/`

The launcher starts the application with **Waitress** in a separate terminal window. To stop the app, close the `Reversi Server` window or press `Ctrl+C` in it.

### Manual Fallback

If the batch files do not work in your environment, use the manual setup path:

```bash
python -m pip install -r requirements.txt
python -m waitress --listen=127.0.0.1:5000 wsgi:app

Then open:

```text
http://127.0.0.1:5000/
```

### Development Server Fallback

For local development only:

```bash
python run.py
```

This uses Flask's development server rather than Waitress.

## Troubleshooting

### Python is not recognized

- Reinstall Python 3 and enable **Add Python to PATH**
- Restart the terminal after installation
- Verify with:

```bash
python --version
```

If `python` is unavailable on Windows but `py` exists, the batch scripts will still try `py -3`.

### Dependencies are missing

Run:

```bash
install_requirements.bat
```

or:

```bash
python -m pip install -r requirements.txt
```

### The browser did not open automatically

The server may still be running successfully. Open this URL manually:

```text
http://127.0.0.1:5000/
```

### The port is already in use

If `127.0.0.1:5000` is busy:

- close the existing process using that port
- or run the app manually on another port by changing the Waitress command

Example:

```bash
python -m waitress --listen=127.0.0.1:5001 wsgi:app
```

Then open:

```text
http://127.0.0.1:5001/
```

### The batch file closes immediately

Open Command Prompt in the project root and run the script manually so error messages remain visible:

```bash
play_reversi.bat
```

If needed, install dependencies first:

```bash
install_requirements.bat
```
