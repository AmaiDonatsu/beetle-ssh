# Reporte: Prueba de Ejecución en Background (11-Abr-26)

## Objetivo
Verificar la capacidad del daemon de `beetle-ssh` para ejecutar un proceso de forma asíncrona en segundo plano sin bloquear la consola y poder consultar su estado desde otra ubicación o en el futuro.

## Implementación
Se desarrollaron los siguientes componentes para la prueba:
1. **Script de conteo (`src/counter.js`)**: Un ciclo simple que incrementa un segundo cada 1000ms y guarda el estado en `/tmp/beetle-test-counter.txt`.
2. **Comando `count-start`**: Registrado en la CLI para hacer que el daemon ejecute el script de conteo de forma independiente.
3. **Comando `count-status`**: Registrado en la CLI para leer el archivo de estado y mostrar en qué segundo va el proceso.

## Pruebas Realizadas
Se ejecutó la siguiente secuencia de forma secuencial:

### 1. Iniciar el conteo
```bash
./bin/beetle count-start
```
> **Resultado:**
> `Counter started in background session 2. State saved to /tmp/beetle-test-counter.txt`
> *La terminal quedó libre inmediatamente tras la ejecución.*

### 2. Consultar el estado (A los 3 segundos)
```bash
./bin/beetle count-status
```
> **Resultado:**
> `The counter is currently at second: 3`

### 3. Consultar el estado nuevamente (A los 6 segundos)
```bash
./bin/beetle count-status
```
> **Resultado:**
> `The counter is currently at second: 6`

## Conclusión
El daemon gestiona correctamente los procesos hijos separados de los hilos principales (`detached`), permitiendo a `beetle-ssh` comportarse de forma similar a un contenedor donde los scripts de despliegue o bucles corren libremente y su estado puede ser supervisado en un momento posterior a través de la CLI.
