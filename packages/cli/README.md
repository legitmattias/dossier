# @dossier/cli

Command-line interface for managing your Dossier profile locally.

## Usage

```bash
# Initialize
dossier init "Your Name"

# Skills
dossier add TypeScript -d software-development -c languages --proficiency proficient
dossier list                          # List all skills
dossier edit TypeScript --proficiency advanced
dossier used TypeScript               # Record usage
dossier stale                         # Show skills needing refresh

# Learning Goals
dossier learn "Learn Rust" -d software-development --priority high
dossier goals                         # List goals
dossier goals --active                # Filter by status
dossier progress "Learn Rust" 50      # Update progress

# Interests
dossier interest "WebAssembly" -d software-development
dossier interest --list
dossier interest "WebAssembly" --learn  # Promote to goal

# Projects
dossier project "My App" --status active --priority high --featured
dossier project --list

# Export
dossier export                        # JSON (default)
dossier export --format claude        # CLAUDE.md format
dossier export --format markdown      # Markdown
```

## Storage

Profiles are stored as JSON at `~/.config/dossier/profile.json` (configurable via `DOSSIER_PROFILE` env var).
