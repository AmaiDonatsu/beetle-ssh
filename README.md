# 🪲 Beetle SSH Manager

<img src="./res/Gemini_Generated_Image_pfjwvypfjwvypfjw.jpg" width="350" align="right" alt="Beetle SSH Mascot"/>

**Beetle SSH Manager** es una poderosa herramienta CLI asincrónica y en segundo plano (Daemon), diseñada y optimizada exclusivamente para entornos **Linux**. 

## Objetivo
El objetivo principal de Beetle es administrar y orquestar múltiples sesiones SSH concurrentes sin bloquear tu consola principal. A diferencia del comando SSH tradicional, Beetle envía cada conexión a la bóveda de un proceso demonizado residente en tu computadora. Esto te permite entrar y salir de las sesiones, inyectar comandos de rescate, auto-rellenar contraseñas, y recolectar logs limpios, haciendo tus tareas de diagnóstico remoto infinitamente más seguras y resilientes.

## Resumen de Funcionalidades
- **Control Asíncrono:** Manda scripts silenciosos (`write_q`) o extrae el historial (`read_session`) de múltiples servidores cuando quieras.
- **🤖 Optimizado para Agentes de IA:** Beetle es el puente perfecto para asistentes automatizados. Como maneja dinámicamente el salto de programas interactivos y resuelve pausas bloqueantes (como interceptar los requerimientos de contraseñas de `sudo` inyectando la llave nativamente), permite que un Agente Autónomo opere, configure o diagnostique servidores remotos durante horas de forma 100% desatendida sin congelarse ni obligar al usuario a estar pegado a la pantalla tecleando claves.
- **Auto-Sudo Vault:** Detecta comandos `sudo` remotos por Regex y rellena tu clave secreta guardada localmente de manera milimétrica y oculta.
- **Anti-Kernel Panic:** Protección con KeepAlive, cierre forzoso (`drop_session`), inyecciones de bytes reservadas (`send_key ctrl+c`) y reactivación sin pérdida de perfiles (`reconnect`).
- **Limpiador D-State:** Filtrado ANSI a petición usando el flag `--clean` para extraer texto de interfaces en ASCII desmoronadas o aplicaciones de pantalla completa.

## Requisitos y Detalles Técnicos
- **Sistema Operativo:** Disenado nativamente para **Linux** (Usa sockets locales de UNIX `/tmp/beetle.sock` y la API DBUS de `libsecret`/Keyring).
- **Core:** Creado bajo **Node.js**.
- **Motores base:** `ssh2` para la conectividad nativa criptográfica, `keytar` para la bóveda profunda en tu SO y `commander` para los binarios CLI.

## Instalación Inmediata 🚀

1. **Instalar paquetes base:**
   ```bash
   pnpm install
   ```
2. **Habilitarlo Globalmente:**
   Convierte la herramienta local en un binario de sistema para que puedas correrlo desde cualquier carpeta:
   ```bash
   npm link
   ```
3. **Encender el Administrador:**
   ```bash
   beetle start-daemon
   ```
4. **Ver toda la lista de ayuda:**
   ```bash
   beetle --help
   ```

> *¿Necesitas una guía detallada para casos de desconexión y atajos? Revisa la [Guía de Usuario](./docs/user-docs.md)*

<br clear="both"/>