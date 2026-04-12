# Create Session

## Resumen
Aquí se explica a detalle y de forma estructurada las instrucciones pára implementar el nuevo comando de 'create_session'.
este comando tiene el objetivo de crear una sesión para una ssh especifica almacenada en el storage persistente, al cual se le puede inproducir comandos y leer su estado he historial, además se especificarán instrucciones especiales y preocupaciones del desarrollador de posibles limitaciones.

## Lógica
el comando será 'create_session' y como argumento recibe el alias de la ssh a utilizar, por ejemplo 'orangepi' el cual es real y existe en el storage actual, al darle a enter, beetle obtendrá la contraseña guardada con el comando set_sudo, y se creará una sesión persistente guardada en el storage, y se iniciará inyectando la contraseña para poderse conectar al ssh user@ip.

## Preocupación
cuando se ejecuta normalmente un comando ssh user@ip, este se queda esperando a que se ingrese una contraseña, o se presione ctrl+c para salir, pero es posble que este no sea un readline normal, ssh usa el TTY del sistema directamente para pedir la password bypasseando stdoyt/stderr, por esto no se puede capturar con pipe normal ni se puede inyectar stdin.write, por eso podría usarse una herramienta como expect.
la solución podría ser PTY (Pseudo Terminal) que permite simular una terminal real, la librería ssh2 puede dar acceso a esto:

daemon
  │
  └── ssh2 crea una conexión SSH
           │
           └── abre un PTY (terminal virtual)
                    │
                    ├── tú escribes → va al PTY → SSH lo recibe
                    └── SSH responde → PTY captura → tú lo lees

### detección de si entramos o no: 
el flujo del ssh manda señales reconocibles en el stream


Connecting...
───────────────────────────────────
root@192.168.1.10's password:        ← detectas esto → inyectas password
───────────────────────────────────
Welcome to Ubuntu 22.04...           ← detectas esto → ¡éxito!
Last login: ...
root@orangepi:~$                     ← detectas el prompt del shell → sesión lista
───────────────────────────────────
Permission denied (publickey,password) ← detectas esto → falló
