# pi-command-history

Folder-based persistent command history for [pi](https://github.com/badlogic/pi-mono). Recall previous commands with `ctrl+up`/`ctrl+down` across sessions — as long as you're in the same folder, your full command history is always available.

## Install

```bash
pi install npm:pi-command-history
```

Or try without installing:

```bash
pi -e npm:pi-command-history
```

## Usage

| Shortcut | Action |
|----------|--------|
| `ctrl+up` | Previous command (older) |
| `ctrl+down` | Next command (newer) |

When you enter a command in pi, it's saved to a per-folder history file. Next time you open pi in the same folder (even in a new session), press `ctrl+up` to cycle through your previous commands.

### What gets saved

- All user prompts are saved (excluding `/` slash commands)
- History is deduplicated — repeated commands move to the most recent position
- Up to 500 commands are stored per folder

### How it works

- History files are stored in `~/.pi/folder-history/` as JSONL, keyed by a hash of the working directory
- A status indicator in the footer shows the number of saved commands
- Compatible with other editor extensions (e.g., `pi-vim`) — no editor replacement conflicts

## Uninstall

```bash
pi remove npm:pi-command-history
```

To also remove saved history:

```bash
rm -rf ~/.pi/folder-history/
```

## License

MIT
