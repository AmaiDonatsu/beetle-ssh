# Propuestas para Inyección de Combinaciones de Teclas (Key Combinations)

Actualmente, las sesiones creadas mediante `ssh2` se comportan como flujos bidireccionales de Node.js (Duplex Streams). La consola remota de SSH (PTY) no interpreta "teclas" físicas, sino los secuencias de bytes (caracteres de control ASCII) que representan dichas teclas.

Por ejemplo, al pulsar `Ctrl+C` en una terminal interactiva, en realidad se envía el carácter hexadecimal `\x03`. Para `Ctrl+D` se envía `\x04`.

## Opciones de Implementación

### 1. Nuevo comando dedicado `beetle send_key <id> <tecla>` (Recomendada)
Crear un comando específico enfocado puramente en combinaciones de control.
* **Formato:** `beetle send_key 1 ctrl+c` o `beetle send_key 1 esc`
* **Lógica CLI:** La CLI tendrá un diccionario interno o `switch` que mapee strings amigables (`ctrl+c`, `ctrl+d`, `esc`, `ctrl+z`, `enter`) a sus representaciones hexadecimales (e.g. `\x03`). Se mandarán estos bytes crudos al daemon.
* **Lógica Daemon:** El daemon recibe la petición de `send_key`, ubica la sesión activa y hace `stream.write('\x03')` puramente.
* **Ventaja:** Muy limpio y escalable sin mezclarse con comandos regulares. Evita la complejidad de introducir caracteres nulos en bash.

### 2. Soportar secuencias de escape nativas en `write` y `write_q`
Mejorar los comandos actuales de escritura para que soporten caracteres de escape parseados de cierta manera.
* **Formato:** `beetle write 1 --raw "\x03"` o `beetle write_q 1 --raw "\x1A"`
* **Lógica:** Añadir una bandera paramétrica `--raw` o detectar automáticamente secuencias hexagonales y enviarlas al buffer.
* **Desventaja:** Menos intuitivo y amistoso al usuario final que rara vez memorizará que `\x03` equivale a Ctrl+C.

### 3. Alias directo en el CLI para interrupciones críticas (Enfoque Docker)
En aplicaciones como Docker, normalmente enviar un `stop` o `kill` emite señales al sistema base temporal. Aquí podríamos hacer algo similar.
* **Formato:** `beetle interrupt <id>` (Exclusivo para Ctrl+C)
* **Lógica:** Diseñar comandos harcodeados para atajos precisos (ej. interrupción directa).
* **Desventaja:** Extremadamente limitante, ya que si luego ocupamos presionar `q` para salir de `top`, o `Ctrl+Z` para pausar, tendríamos que re-programar nuevos comandos.

### Conclusión Técnica
Dado el uso de `ssh2`, la inyección del flujo es totalmente trivial a nivel de capa baja. La opción 1 se adapta de manera excelente y semántica para gestionar programas interactivos complejos (como `htop` o `vim`).

**Bytes más comunes a soportar:**
- `ctrl+c` -> `\x03`
- `ctrl+d` -> `\x04`
- `ctrl+z` -> `\x1A`
- `ctrl+l` -> `\x0C` (Limpiar pantalla en muchos shells)
- `esc` -> `\x1B`
- `enter` -> `\x0D` / `\x0A`
