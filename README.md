# Lotería Push 🎴

Juego de Lotería mexicana con **notificaciones push (Firebase Cloud Messaging)**. El servidor en Node (`server/`) es el cantor: maneja la sala, las reglas y envía los push; la app en Flutter (`app/`) recibe las cartas y marca la tabla.

Proyecto hecho con **TDD** (primero la prueba en rojo, luego el código para ponerla en verde) siguiendo el manual de la materia.

## Cómo correr las pruebas

```
cd app
flutter test
```

Pruebas del servidor:

```
cd server
node --test
```

> Para correr la app en el celular falta conectar un proyecto de Firebase con `flutterfire configure` (genera `app/lib/firebase_options.dart`).

---

## Evidencias TDD (rojo → verde)

**Alumna:** Yaneli Sánchez Cárdenas · **Grupo:** GTID244

Cada ronda muestra primero la prueba en **rojo** (falla porque el código todavía no existe) y después en **verde** (pasa ya con el código hecho).

### Ronda 1

**🔴 Rojo — la prueba falla**

![Ronda 1 en rojo](capturas_tdd/01_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 1 en verde](capturas_tdd/01_verde.png)

### Ronda 2

**🔴 Rojo — la prueba falla**

![Ronda 2 en rojo](capturas_tdd/02_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 2 en verde](capturas_tdd/02_verde.png)

### Ronda 3

**🔴 Rojo — la prueba falla**

![Ronda 3 en rojo](capturas_tdd/03_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 3 en verde](capturas_tdd/03_verde.png)

### Ronda 4

**🔴 Rojo — la prueba falla**

![Ronda 4 en rojo](capturas_tdd/04_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 4 en verde](capturas_tdd/04_verde.png)

### Ronda 5

**🔴 Rojo — la prueba falla**

![Ronda 5 en rojo](capturas_tdd/05_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 5 en verde](capturas_tdd/05_verde.png)

### Ronda 6

**🔴 Rojo — la prueba falla**

![Ronda 6 en rojo](capturas_tdd/06_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 6 en verde](capturas_tdd/06_verde.png)

### Ronda 7

**🔴 Rojo — la prueba falla**

![Ronda 7 en rojo](capturas_tdd/07_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 7 en verde](capturas_tdd/07_verde.png)

### Ronda 8

**🔴 Rojo — la prueba falla**

![Ronda 8 en rojo](capturas_tdd/08_roja.png)

**🟢 Verde — la prueba pasa**

![Ronda 8 en verde](capturas_tdd/08_verde.png)
