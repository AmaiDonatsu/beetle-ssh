# imprevistos a nivel de session

# Casos Teóricos de Imprevistos a Nivel de Sesión SSH

A medida que Beetle SSH madure, delegar consolas TTY (Pseudo-terminales) a un demonio de fondo asíncrono traerá retos que son característicos del control remoto a bajo nivel. A continuación, exploraremos 5 posibles imprevistos o comportamientos anómalos que podrían bloquear una sesión o arruinar la experiencia, con su respectiva ruta de solución teórica.

---

### 1. Desbordamiento de Memoria por el Buffer Infinito (Memory Leak)
* **¿Qué pasaría?** Actualmente el daemon almacena el texto que se produce sumando strings infinitamente (`session.output += data`). Si un usuario inyecta `ping 8.8.8.8` y olvida la sesión por dos semanas, la longitud del string alcanzará el límite de V8 Node.js (~1.4 GB) y destruirá violentamente el daemon bloqueando todas las conexiones restantes simultáneamente.
* **Propuesta de Mejora:** Implementar un **Límite Circular (Ring Buffer)** en memoria. Ajustar el backend para recortar constantemente `session.output` y almacenar únicamente los últimos 50,000 caracteres. Adicionalmente, se puede destinar la salida a un archivo `.log` físico gestionado con librerías nativas como `fs.createWriteStream`.

### 2. Contaminación por Secuencias de Control (ANSI Escape Hell)
* **¿Qué pasaría?** Programas complejos (e.g., `nano`, `vim`, `less`, `htop`) funcionan limpiando y repintando coordenadas en formato TTY (Alternate Screen Buffers). El texto arrojado a `read_session` será algo irreconocible repleto de galimatías (ej. `\x1b[2J\x1b[H...`). Si bien podemos matarlos con `ctrl+c` / `:q`, leer su respuesta no es texto lineal simple.
* **Propuesta de Mejora:** Integrar un modo o filtro opcional (`--clean`) que inyecte un módulo "Strip-ANSI" capaz de limpiar la salida cruda a un log de texto plano cuando se lea. Adicionalmente, notificar en la documentación qué herramientas de pantalla completa interactiva usar con cautela.

### 3. Conexiones Zombi ("Half-open Tunnels")
* **¿Qué pasaría?** Si la OrangePi pierde la red WiFi abruptamente o se reinicia físicamente sin avisarle al protocolo TCP, Node.js no se enterará. La sesión persistirá eternamente con estatus `'ready'`, y si nuestro programa le envía `write 1 ls`, este fallará asíncronamente en el vacío porque no hubo una señal TCP RST.
* **Propuesta de Mejora:** Configurar explícitamente "Latidos" de conexión (`KeepAlive`) dentro de la conexión del cliente `ssh2`. Usar parámetros paramétricos globales como enviar paquetes en blanco cada 30 segundos (`keepaliveInterval: 30000`). Si no responde, la sesión SSH transiciona rápidamente a `closed` salvando memoria y recursos.

### 4. Permisos Bloqueados Interactivamente (Interrupciones Invisibles o "Hard-Sleep")
* **¿Qué pasaría?** Supongamos que inyectamos `sudo apt install xyz` utilizando privilegios elevados no-autologados localmente en Ubuntu, lo que invocará un password prompt oscuro. El shell no devolverá el prompt de "listo", porque está asumiendo que un humano pondrá texto ciego por teclado. De un modo peor, un comando montando un archivo de red NFS lento entrara al `estado D` (uninterruptible sleep), haciéndose inmune incluso al `ctrl+c`.
* **Propuesta de Mejora:** Brindar un comando de rescate general tipo `beetle drop_session <id>` que literalmente ignore interactividad, finalice el socket (`conn.end()`/`conn.destroy()`), limpie el objeto de memoria y obligue a crear una reconexión forzada perdiendo el proceso remoto como última vía. 

### 5. Interfaz Paralela Desincronizada (Race Conditions Humánicas)
* **¿Qué pasaría?** Beetle es asíncrono. ¿Qué pasa si mientras el daemon envía un comando gigantesco (ej. clonar 300 GiB de un Repositorio) desde un cliente SSH, desde otra terminal haces un `write_q` mandando borrar el disco principal? No hay advertencia de qué terminal mandó qué interrupción. 
* **Propuesta de Mejora:** No es una vulnerabilidad letal para servidores Linux que escalonan procesos solos de todas formas. Sin embargo, podríamos implementar de un "Historial de inyecciones", registrando qué se inyectó, a qué hora y con qué comando exacto. Así, un `beetle read_session 1` sabría listar también "Qué enviaste" versus "Qué te contestaron".