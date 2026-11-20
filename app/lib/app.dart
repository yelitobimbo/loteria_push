import 'package:flutter/material.dart';

import 'presentacion/pantalla_inicio.dart';
import 'presentacion/pantalla_juego.dart';
import 'presentacion/vms.dart';

class AppLoteria extends StatefulWidget {
  const AppLoteria({super.key, required this.vm, required this.crearCantor});
  final JuegoVm vm;
  final CantorVm Function() crearCantor;

  @override
  State<AppLoteria> createState() => _AppLoteriaState();
}

class _AppLoteriaState extends State<AppLoteria> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.vm.iniciar();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Al volver a la app: pregunta al servidor (pudieron perderse avisos mientras dormía).
    if (state == AppLifecycleState.resumed) widget.vm.alVolverALaApp();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.vm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Lotería Push',
        theme: ThemeData(colorSchemeSeed: Colors.deepOrange, useMaterial3: true),
        home: ListenableBuilder(
          listenable: widget.vm,
          builder: (context, _) => widget.vm.partida == null
              ? PantallaInicio(vm: widget.vm, crearCantor: widget.crearCantor)
              : PantallaJuego(vm: widget.vm),
        ),
      );
}
