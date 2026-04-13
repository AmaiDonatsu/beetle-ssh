---
name: Beetle SSH Manager Operator
description: Instructions on how to manage remote SSH sessions via the asynchronous Beetle daemon.
---

# Beetle SSH Operator Skill

You have access to **Beetle SSH Manager** (`beetle`), a powerful daemonized CLI tool to execute remote commands and control persistent SSH sessions. 
Because Beetle operates via a local background daemon using Node.js Streams, it is significantly more complex and asynchronous than standard SSH, but highly resilient.

## Core Concepts & Rules

1. **Beetle is Asynchronous:**
   When you send a command, you are injecting it into an active PTY stream pipeline, not just sending an SSH single-shot execution. The remote device maintains state across sequential commands.
   
2. **Daemon Status:**
   Before tracking sessions, ensure the daemon is alive.
   - Run `beetle ping`. If it fails, run `beetle start-daemon` (it will run quietly in the background).

## Session Management Workflow

### 1. View Active Sessions
Run `beetle ps`. This will list the session `ID` mapping to the remote alias, and show its connection status (`ready` or `closed`). You will need the `ID` for all subsequent operations.

### 2. Creating and Reconnecting
- Open new connection: `beetle create_session <alias>`
- Revive a dropped connection: `beetle reconnect <ID>`

### 3. Executing Commands
You must use the internal ID mapped by `beetle ps` to interact with a session.
- **Normal Execution:** `beetle write <ID> "<command>"` 
  *(Executes command on the prompt and grabs the output. Automatically runs `strip-ansi` to filter terminal colors if needed, though you can use `--clean` flag manually).*
- **Quiet Execution:** `beetle write_q <ID> "<command>"` 
  *(Sends the command and detaches immediately without printing output. Useful for long background services like `apt upgrade -y`)*
- **Reading Buffers:** `beetle read_session <ID> --clean` 
  *(Dumps the recent streaming log history of the session. ALWAYS use `--clean` when reading manually to strip ANSI escape codes and terminal pollution).*

## Auto-Sudo Subroutines
Beetle handles `sudo` prompts automatically if configured.
If you send a command like `beetle write 1 "sudo fdisk -l"`, Beetle's regex parser will see the Linux `[sudo] password` prompt inside the stream, and automatically inject the encrypted vault master password. You do not need to manually enter the password or try weird `echo pass | sudo -S` workarounds.

## 🚨 Critical Escapes: TUI & Blocking Processes
If you accidentally run an interactive terminal UI command (like `top`, `htop`, `nano`) or a blocking ping, the session stream will be hijacked and standard `write` commands will fail to execute cleanly because the shell is not ready.

**Do NOT attempt to write blindly if stuck.** Use these controls:
1. **Send Keyboard Signals:** `beetle send_key <ID> ctrl+c` (or `ctrl+z`, `ctrl+d`, `esc`, `enter`). 
   *This safely sends precise BYTE controls down the pipe to exit the blocking program.*
2. **Hard Rescue (Session Drop):** `beetle drop_session <ID>`
   *If the SSH connection is frozen in D-State or completely unresponsive to SIGINT, drop it entirely to kill the socket, then use `beetle reconnect <ID>` to bring it back cleanly.*
