# Guía del Usuario: Beetle SSH Manager

**Beetle SSH Manager** es una poderosa herramienta de línea de comandos (CLI) administrada por un daemon en segundo plano que te permite configurar, inicializar y controlar asincrónicamente múltiples sesiones SSH. Su diseño está inspirado en el control de procesos interactivos, similar a los contenedores: abres la sesión en el daemon y puedes entrar y salir a leer sus logs o mandarle comandos en cualquier momento, sin que la consola se bloquee.

---

## 1. Primeros pasos

Para que Beetle CLI pueda mantener tus sesiones vivas permanentemente al cerrar la terminal, todo pasa a través de nuestro proceso demonio. 

**Iniciar el Daemon:**
```bash
beetle start-daemon
```
> Ejecuta este comando antes de empezar. El administrador se instalará en segundo plano. Puedes comprobar que esté vivo usando `beetle ping`. Todas las conexiones SSH vivirán aquí en segundo plano.

**Ver tareas y procesos activos del Daemon:**
```bash
beetle ps
```
> Lista todas las sesiones SSH que están conectándose, listas o cerradas, junto a su `ID` de gestión interna.

---

## 2. Configurar una Nueva Sesión SSH

Antes de crear una conexión, necesitas dar de alta tu servidor en la bóveda de Beetle SSH.

**Paso 2.1: Registrar el Servidor (Metadatos)**
```bash
beetle new_ssh <ruta> <alias>
```
*Ejemplo:* `beetle new_ssh root@192.168.1.50 mi-servidor`
- Esto creará un nuevo identificador (ID único) y lo asociará al alias `mi-servidor`. Puedes listar todos tus servidores registrados en cualquier momento mediante `beetle ssh_list`.

**Paso 2.1.b: Eliminar un Servidor**
Si deseas hacer limpieza o borrar algo que creaste para pruebas, puedes removerlo asegurando que Beetle descifre y limpie su contraseña permanentemente con:
```bash
beetle remove_ssh <ID>
```

**Paso 2.2: Proveer Autenticación Segura (Opcional pero recomendado para auto-logins)**
```bash
beetle set_sudo <ID>
```
* Tras proporcionar el ID que obtuviste en tu lista, aparecerá una terminal interactiva pidiendo que insertes tu contraseña. 
* Tu contraseña **no se guarda en archivos de texto plano**, Beetle utiliza la bóveda nativa segura (Keychain/Secret Storage) del sistema operativo gracias a una encriptación robusta.

---

## 3. Administrar Sesiones (Contenedores Virtuales)

**Iniciar una Sesión Remota**
```bash
beetle create_session <alias>
```
*Ejemplo:* `beetle create_session mi-servidor`.
Beetle pedirá tu clave secreta de la bóveda, entablará la sesión criptográfica directa en el fondo (usando la librería robusta `ssh2`) y almacenará la Terminal Virtual (PTY).

### Leer el estado e historial interactivo
En lugar de mirar fijamente una pantalla, con Beetle usas el ID arrojado en el paso anterior (que puedes volver a consultar con `beetle ps`) para extraer el texto y salida guardados en el contenedor de esa sesión:
```bash
beetle read_session <ID_Sesion>
```

*💡 Nuevo: Si abriste un programa gráfico complejo interactivo (como htop o vim) e intentas leerlo, te saldrá un montón de texto incomprensible (Códigos ANSI). Para evitarlo y limpiar mágicamente la lectura a texto plano entendible, añade el flag `--clean`:*
```bash
beetle read_session <ID_Sesion> --clean
# O en inyecciones directas: beetle write <ID_Sesion> --clean "htop"
```

### Mandar Comandos Interactivos al Flujo
Si tu sesión indica el estado `'ready'` en `beetle ps`, el túnel está abierto y puedes mandarle programas.
```bash
# Escribe y devuelve la retroalimentación que imprimió tu consola casi de inmediato
beetle write <ID_Sesion> <comando>

# Ejecuta el script silenciosamente tras bastidores sin molestar el shell actual
beetle write_q <ID_Sesion> <comando>
```
*Ejemplo clásico:* `beetle write 1 echo "Hola desde Beetle"` o mandar a actualizar el sistema `beetle write_q 1 apt-get update -y`.

---

## 4. Control Experto de Interrupciones Teclado

Una de las joyas tecnológicas de Beetle es inyectar comandos de control al flujo. Si dejaste dentro de la sesión remota corriendo un comando bloqueante que requiere un SIGINT (como un `top`, `htop`, `ping -c 100`, o script de python), el shell SSH remoto dejará de responder si le mandas texto crudo. 

Debes usar las teclas reservadas:
```bash
beetle send_key <ID_Sesion> <tecla>
```
Las teclas amigables soportadas que se inyectarán en formato de Bytes Control al sistema remoto por el túnel PTY son:
- `ctrl+c` (SIGINT - Matar/Parar)
- `ctrl+d` (EOF - Cerrar sesión)
- `ctrl+z` (Pausa / Mandar a Background Linux)
- `ctrl+l` (Limpiar Pantalla)
- `esc`
- `enter`

*Ejemplo:* Mandaste un comando de monitoreo: `beetle write_q 1 htop`. Si luego haces esto: `beetle send_key 1 ctrl+c`, forzarás remotamente el cerrado del programa devolviendo vida a la Terminal Bash remota en el daemon.

---
**Nota de Tester:** Beetle SSH almacena local y confiablemente perfiles y claves del llavero OS nativo de modo que todo sea automatizado. Disfruta interactuando bidireccionalmente con consolas de forma desvinculada (headless stream mode). Cada bit de telemetría está protegido y se inyecta nativamente como Streams en Node.
